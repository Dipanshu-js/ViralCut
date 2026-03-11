export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiJSON } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rateLimit";
import { loadUserKeys } from "@/lib/userKeys";

interface TranscriptSegment { start: number; dur: number; text: string; }

interface ShortSuggestion {
  id: string; title: string; hook: string;
  startTime: number; endTime: number; duration: number;
  hookOverlay: string; style: string; captionStyle: string;
  why: string; viralScore: number; callToAction: string;
  suggestedTitle: string; suggestedTags: string[]; accentColor: string;
}

async function fetchYouTubeMeta(videoId: string) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  // Try oEmbed first (no API key needed)
  try {
    const oe = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (oe.ok) {
      const d = await oe.json() as { title: string; author_name: string; thumbnail_url: string };
      if (!apiKey) {
        return {
          title: d.title || "YouTube Video",
          channel: d.author_name || "YouTube Creator",
          thumbnail: d.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          duration: 600, viewCount: 100000, tags: [], description: "",
        };
      }
    }
  } catch {}

  if (!apiKey) {
    return {
      title: "YouTube Video — Add YOUTUBE_API_KEY for metadata",
      channel: "YouTube Creator",
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 600, viewCount: 100000, tags: [], description: "",
    };
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = await res.json() as {
    items?: Array<{
      snippet: { title: string; channelTitle: string; thumbnails?: { high?: { url: string } }; tags?: string[]; description: string };
      contentDetails: { duration: string };
      statistics: { viewCount?: string };
    }>;
  };
  const item = data.items?.[0];
  if (!item) throw new Error("Video not found");
  const dur = item.contentDetails.duration;
  const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const duration = (parseInt(match?.[1]||"0")*3600)+(parseInt(match?.[2]||"0")*60)+parseInt(match?.[3]||"0");
  return {
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.high?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    duration, viewCount: parseInt(item.statistics.viewCount||"0"),
    tags: item.snippet.tags||[], description: item.snippet.description?.slice(0,500)||"",
  };
}

async function fetchCaptions(videoId: string): Promise<TranscriptSegment[]> {
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
  const headers = { "User-Agent": ua, "Accept-Language": "en-US,en;q=0.9" };

  function parseXml(xml: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    const regex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(xml)) !== null) {
      const text = m[3]
        .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
        .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/<[^>]+>/g,"").trim();
      if (text) segments.push({ start: parseFloat(m[1]), dur: parseFloat(m[2]), text });
    }
    return segments;
  }

  // Strategy 1: Direct timedtext endpoints
  const attempts = [
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=xml`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=xml`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=xml`,
  ];

  for (const url of attempts) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000), headers });
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml.includes("<text")) continue;
      const segments = parseXml(xml);
      if (segments.length > 3) return segments;
    } catch {}
  }

  // Strategy 2: Extract caption track URL from YouTube page
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers, signal: AbortSignal.timeout(12000),
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      const captionMatch = html.match(/"captionTracks":\s*(\[[\s\S]*?\])/);
      if (captionMatch) {
        const tracks = JSON.parse(captionMatch[1]) as Array<{ baseUrl: string; languageCode: string; kind?: string }>;
        const enTrack = tracks.find(t => t.languageCode === "en" && t.kind === "asr")
          || tracks.find(t => t.languageCode === "en")
          || tracks.find(t => t.languageCode?.startsWith("en"))
          || tracks[0];
        if (enTrack?.baseUrl) {
          const capRes = await fetch(enTrack.baseUrl + "&fmt=xml", { headers, signal: AbortSignal.timeout(7000) });
          if (capRes.ok) {
            const capText = await capRes.text();
            const segs = parseXml(capText);
            if (segs.length > 0) return segs;
          }
        }
      }
    }
  } catch { /* fall through */ }

  return [];
}

function buildTranscript(segments: TranscriptSegment[]): string {
  const blocks: string[] = [];
  let block = "", blockStart = 0;
  for (const seg of segments) {
    if (seg.start - blockStart > 8 && block) {
      blocks.push(`[${Math.floor(blockStart)}s] ${block.trim()}`);
      block = seg.text + " "; blockStart = seg.start;
    } else { block += seg.text + " "; }
  }
  if (block) blocks.push(`[${Math.floor(blockStart)}s] ${block.trim()}`);
  return blocks.join("\n").slice(0, 6000);
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(user.id, 15, 60000); // 15 analyses per minute
  if (!rl.ok) return NextResponse.json({ error: `Rate limit exceeded. Reset in ${rl.resetIn}s` }, { status: 429 });

  // Load user's API keys from DB and inject into AI rotation
  await loadUserKeys(user.id);

  try {
    const { videoId, count = 5, save = false } = await req.json();
    if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

    const [meta, rawTranscript] = await Promise.all([
      fetchYouTubeMeta(videoId),
      fetchCaptions(videoId),
    ]);
    const transcript = buildTranscript(rawTranscript);

    const systemPrompt = `You are an expert YouTube Shorts strategist. Find the most viral-worthy moments. Return ONLY valid JSON array, no markdown.`;
    const userPrompt = `Video: "${meta.title}" by ${meta.channel} | ${meta.duration}s | ${(meta.viewCount/1000).toFixed(0)}K views
Tags: ${meta.tags.slice(0,10).join(", ")}

Transcript:
${transcript || `No transcript. Suggest ${count} viral moments based on video title/topic.`}

Find ${count} BEST Short moments (30–75s each). Timestamps MUST be within 0–${meta.duration}s.

Return ONLY this JSON (no other text):
[{
  "id":"s1","title":"Short title max 7 words",
  "hook":"Gripping opening hook sentence",
  "startTime":45,"endTime":105,"duration":60,
  "hookOverlay":"HOOK MAX 5 WORDS ALL CAPS",
  "style":"educational","captionStyle":"bold",
  "why":"One sentence: why this moment is viral-worthy",
  "viralScore":85,"callToAction":"Subscribe for more! 🔥",
  "suggestedTitle":"Full video title with #shorts","suggestedTags":["shorts","viral"],
  "accentColor":"#5b5bd6"
}]`;

    let shorts: ShortSuggestion[];
    try {
      shorts = await aiJSON<ShortSuggestion[]>(systemPrompt, userPrompt, 3000);
    } catch {
      shorts = Array.from({ length: count }, (_,i) => ({
        id: `s${i+1}`, title: `Viral Moment ${i+1}: ${meta.title.slice(0,30)}`,
        hook: "This moment will hook your viewers...",
        startTime: Math.floor((meta.duration/count)*i),
        endTime: Math.floor((meta.duration/count)*i)+60,
        duration: 60, hookOverlay: "WATCH THIS NOW", style: "educational",
        captionStyle: "bold", why: "High engagement potential",
        viralScore: 70+Math.floor(Math.random()*25), callToAction: "Subscribe! 🔥",
        suggestedTitle: `${meta.title.slice(0,40)} #shorts`,
        suggestedTags: ["shorts","viral","youtube"], accentColor: "#5b5bd6",
      }));
    }

    shorts = shorts.map(s => ({
      ...s,
      startTime: Math.max(0, Math.min(s.startTime, meta.duration-30)),
      endTime: Math.max(s.startTime+30, Math.min(s.endTime, meta.duration)),
      duration: Math.min(Math.max(s.duration||60, 30), 75),
    }));

    const shortsWithUrl = shorts.map(s => ({
      ...s,
      youtubeUrl: `https://youtube.com/watch?v=${videoId}&t=${s.startTime}s`,
    }));

    let project = null;
    if (save) {
      project = await prisma.project.create({
        data: {
          title: meta.title, userId: user.id, videoId,
          sourceUrl: `https://youtube.com/watch?v=${videoId}`,
          thumbnail: meta.thumbnail, duration: meta.duration,
          viewCount: meta.viewCount, channel: meta.channel,
          shorts: { create: shorts.map(s => ({
            title: s.title, startTime: s.startTime, endTime: s.endTime,
            duration: s.duration, hookText: s.hook, hookOverlay: s.hookOverlay,
            captionStyle: s.captionStyle, accentColor: s.accentColor,
            viralScore: s.viralScore, style: s.style, why: s.why,
            callToAction: s.callToAction, suggestedTitle: s.suggestedTitle,
            suggestedTags: s.suggestedTags,
          })) },
        },
        include: { shorts: true },
      });
    }

    return NextResponse.json({ ok: true, meta, transcript: rawTranscript, shorts: shortsWithUrl, project });
  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

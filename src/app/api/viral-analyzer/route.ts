export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { aiJSON, aiText } from "@/lib/ai";
import { loadUserKeys } from "@/lib/userKeys";

interface VideoPhase {
  name: string;
  startSec: number;
  endSec: number;
  description: string;
  technique: string;
  emotionalIntensity: number;
  hook: string;
}

interface ViralStructure {
  title: string;
  totalDuration: number;
  viralScore: number;
  hook: string;
  phases: VideoPhase[];
  pacingPattern: string;
  storytellingTechnique: string;
  keySuccessFactors: string[];
  targetAudience: string;
  contentCategory: string;
}

async function fetchYouTubeMeta(videoId: string) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return {
      title: "Sample Viral Video (Add YOUTUBE_API_KEY for real data)",
      channel: "Demo Channel",
      description: "This video shows a compelling story with a strong hook and clear value proposition.",
      tags: ["motivation","viral","content"],
      duration: 180,
      viewCount: 5000000,
      likeCount: 280000,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) throw new Error("Video not found");
  const dur = item.contentDetails.duration;
  const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const duration = (parseInt(m?.[1]||"0")*3600)+(parseInt(m?.[2]||"0")*60)+parseInt(m?.[3]||"0");
  return {
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    description: item.snippet.description?.slice(0,500)||"",
    tags: item.snippet.tags||[],
    duration,
    viewCount: parseInt(item.statistics.viewCount||"0"),
    likeCount: parseInt(item.statistics.likeCount||"0"),
    thumbnail: item.snippet.thumbnails?.high?.url||`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
}

async function fetchCaptions(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=xml`, {
      signal: AbortSignal.timeout(5000),
    });
    const xml = await res.text();
    if (!xml.includes("<text")) return "";
    const matches = xml.match(/<text[^>]*>([\s\S]*?)<\/text>/g) || [];
    return matches
      .map(t => t.replace(/<[^>]+>/g, "").replace(/&amp;/g,"&").replace(/&#39;/g,"'"))
      .filter(Boolean)
      .slice(0, 80)
      .join(" ")
      .slice(0, 3000);
  } catch { return ""; }
}

async function analyzeStructure(meta: ReturnType<typeof fetchYouTubeMeta> extends Promise<infer T> ? T : never, transcript: string): Promise<ViralStructure> {
  const system = `You are a viral video analyst and storytelling expert. Analyze video structure and return ONLY valid JSON.`;
  const prompt = `Analyze this viral YouTube video and reverse-engineer its storytelling structure.

Title: "${meta.title}"
Channel: ${meta.channel}
Views: ${(meta.viewCount/1e6).toFixed(1)}M | Likes: ${(meta.likeCount/1e3).toFixed(0)}K
Duration: ${meta.duration}s
Tags: ${meta.tags.slice(0,8).join(", ")}
Description: ${meta.description.slice(0,200)}
Transcript excerpt: ${transcript.slice(0,1500) || "(not available - analyze from title/tags)"}

Return ONLY this JSON:
{
  "title": "${meta.title.slice(0,60)}",
  "totalDuration": ${meta.duration},
  "viralScore": 94,
  "hook": "What makes the opening 5 seconds irresistible",
  "pacingPattern": "fast-cut|slow-burn|escalating|rhythmic",
  "storytellingTechnique": "hero journey|problem-solution|listicle|transformation|revelation",
  "targetAudience": "who this content targets",
  "contentCategory": "educational|motivational|entertainment|informational|story",
  "keySuccessFactors": ["factor 1", "factor 2", "factor 3"],
  "phases": [
    {"name":"Hook","startSec":0,"endSec":5,"description":"what happens","technique":"pattern interrupt / curiosity gap","emotionalIntensity":95,"hook":"The actual hook statement"},
    {"name":"Intro","startSec":5,"endSec":20,"description":"establishes context","technique":"credibility + relatability","emotionalIntensity":70,"hook":"Intro statement"},
    {"name":"Rising Action","startSec":20,"endSec":60,"description":"build tension","technique":"contrast + foreshadowing","emotionalIntensity":75,"hook":"Key tension"},
    {"name":"Core Value","startSec":60,"endSec":120,"description":"delivers main value","technique":"social proof + specificity","emotionalIntensity":85,"hook":"Core insight"},
    {"name":"Climax","startSec":120,"endSec":160,"description":"peak moment","technique":"emotional peak + surprise","emotionalIntensity":98,"hook":"Big reveal"},
    {"name":"Conclusion","startSec":160,"endSec":${meta.duration},"description":"memorable close","technique":"call to action + emotional anchor","emotionalIntensity":80,"hook":"Takeaway"}
  ]
}`;

  return await aiJSON<ViralStructure>(system, prompt, 2500);
}

async function generateSimilarScript(structure: ViralStructure, topic: string): Promise<string> {
  const phaseSummary = structure.phases
    .map(p => `- ${p.name} (${p.startSec}-${p.endSec}s): ${p.technique}`)
    .join("\n");

  return await aiText(
    "You are a viral content creator. Write original scripts inspired by storytelling structures. NEVER copy original content.",
    `Using this proven storytelling structure from a viral video, write an ORIGINAL script about: "${topic || structure.contentCategory + " content"}"

Structure to follow:
Technique: ${structure.storytellingTechnique}
Pacing: ${structure.pacingPattern}
Success factors: ${structure.keySuccessFactors.join(", ")}

Phase timing to follow:
${phaseSummary}

Write a complete original script with SCENE MARKERS like [HOOK], [INTRO], [SCENE 1], etc.
Total duration: ~${structure.totalDuration} seconds
Make it viral-worthy and 100% original. Do NOT reference or copy the original video.`,
    2000
  );
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await loadUserKeys(user.id);

  const { youtubeUrl, generateScript = false, scriptTopic = "" } = await req.json();
  if (!youtubeUrl) return NextResponse.json({ error: "youtubeUrl required" }, { status: 400 });

  const videoIdMatch = youtubeUrl.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
  if (!videoIdMatch) return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  const videoId = videoIdMatch[1];

  try {
    const [meta, transcript] = await Promise.all([
      fetchYouTubeMeta(videoId),
      fetchCaptions(videoId),
    ]);

    const structure = await analyzeStructure(meta, transcript);

    let generatedScript: string | null = null;
    if (generateScript) {
      generatedScript = await generateSimilarScript(structure, scriptTopic);
    }

    return NextResponse.json({
      ok: true,
      videoId,
      meta,
      structure,
      generatedScript,
      transcriptAvailable: transcript.length > 100,
    });
  } catch (err) {
    console.error("[viral-analyzer]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

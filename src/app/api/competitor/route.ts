export const runtime = "nodejs";
/**
 * /api/competitor — Competitor channel analysis
 * Analyzes a channel's top videos to decode their viral formula
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { aiJSON } from "@/lib/ai";
import { loadUserKeys } from "@/lib/userKeys";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await loadUserKeys(user.id);

  const { channelUrl, channelName, niche = "general" } = await req.json();
  if (!channelUrl && !channelName) return NextResponse.json({ error: "channelUrl or channelName required" }, { status: 400 });

  const apiKey = process.env.YOUTUBE_API_KEY;
  let videos: Array<{ title: string; views: number; likes: number }> = [];

  // Try to fetch real channel data
  if (apiKey && channelName) {
    try {
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id&type=channel&q=${encodeURIComponent(channelName)}&maxResults=1&key=${apiKey}`,
        { signal: AbortSignal.timeout(8000) }
      );
      const searchData = await searchRes.json() as { items?: Array<{ id: { channelId: string } }> };
      const channelId = searchData.items?.[0]?.id?.channelId;

      if (channelId) {
        const videosRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}&type=video&order=viewCount&maxResults=20&key=${apiKey}`,
          { signal: AbortSignal.timeout(8000) }
        );
        const videosData = await videosRes.json() as {
          items?: Array<{ id: { videoId: string }; snippet: { title: string } }>;
        };
        const videoIds = (videosData.items || []).map(v => v.id.videoId).join(",");

        if (videoIds) {
          const statsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`,
            { signal: AbortSignal.timeout(8000) }
          );
          const statsData = await statsRes.json() as {
            items?: Array<{ snippet: { title: string }; statistics: { viewCount?: string; likeCount?: string } }>;
          };
          videos = (statsData.items || []).map(v => ({
            title: v.snippet.title,
            views: parseInt(v.statistics.viewCount || "0"),
            likes: parseInt(v.statistics.likeCount || "0"),
          }));
        }
      }
    } catch {}
  }

  // Demo videos if no API or fetch failed
  if (!videos.length) {
    videos = [
      { title: `The Secret to Becoming a ${niche} Expert in 30 Days`, views: 8500000, likes: 420000 },
      { title: `I Tried Every ${niche} Hack for 90 Days (Honest Results)`, views: 5200000, likes: 280000 },
      { title: `Why 99% of People Fail at ${niche} (Don't Make This Mistake)`, views: 12000000, likes: 650000 },
      { title: `From Zero to $10K: My ${niche} Journey`, views: 7800000, likes: 390000 },
      { title: `The ${niche} Blueprint Nobody Talks About`, views: 4400000, likes: 210000 },
    ];
  }

  const videoList = videos.slice(0, 15).map((v, i) => `${i+1}. "${v.title}" — ${(v.views/1000).toFixed(0)}K views, ${(v.likes/1000).toFixed(0)}K likes`).join("\n");
  
  const system = `You are a viral content strategist. Analyze YouTube channels and decode their formula. Return ONLY valid JSON.`;
  const prompt = `Analyze this ${niche} channel's top videos and decode their viral formula:

Channel: ${channelName || "Target Channel"}
Niche: ${niche}

Top Videos:
${videoList}

Return ONLY this JSON:
{
  "channelFormula": "One sentence: the core content formula this channel uses",
  "titlePatterns": ["pattern 1", "pattern 2", "pattern 3"],
  "hookStyles": ["style 1", "style 2"],
  "contentPillars": ["pillar 1", "pillar 2", "pillar 3"],
  "avgViralScore": 85,
  "bestPerformingStyle": "motivational|educational|storytelling",
  "targetAudience": "description of target audience",
  "weaknesses": ["weakness 1", "weakness 2"],
  "opportunities": ["gap you can fill 1", "gap you can fill 2"],
  "scriptTemplate": {
    "hookFormula": "Template for their hook structure",
    "structure": ["Act 1: ...", "Act 2: ...", "Act 3: ..."],
    "ctaStyle": "Their typical call to action"
  },
  "topicIdeas": [
    {"title": "Video idea 1 in their style", "angle": "Your unique angle"},
    {"title": "Video idea 2 in their style", "angle": "Your unique angle"},
    {"title": "Video idea 3 in their style", "angle": "Your unique angle"}
  ]
}`;

  try {
    const analysis = await aiJSON<{
      channelFormula: string; titlePatterns: string[]; hookStyles: string[];
      contentPillars: string[]; avgViralScore: number; bestPerformingStyle: string;
      targetAudience: string; weaknesses: string[]; opportunities: string[];
      scriptTemplate: { hookFormula: string; structure: string[]; ctaStyle: string };
      topicIdeas: Array<{ title: string; angle: string }>;
    }>(system, prompt, 3000);

    return NextResponse.json({ ok: true, analysis, videos: videos.slice(0, 10), channelName: channelName || "Target Channel" });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

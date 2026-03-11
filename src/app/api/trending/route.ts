export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

function calcViralScore(views: number, likes: number, comments: number, hoursOld: number, subscriberCount = 100000): number {
  const viewsPerHour   = views / Math.max(hoursOld, 1);
  const engagement     = (likes + comments * 2) / Math.max(views, 1);
  const velocityScore  = Math.min(viewsPerHour / 10000, 1) * 40;
  const engageScore    = Math.min(engagement / 0.05, 1) * 30;
  const recencyScore   = Math.max(0, 1 - hoursOld / (24 * 7)) * 15;
  const viralityScore  = Math.min(views / (subscriberCount * 0.5), 1) * 15;
  return Math.min(99, Math.round(velocityScore + engageScore + recencyScore + viralityScore + 20));
}

// Real YouTube video IDs for diverse demo thumbnails
const MOCK_TRENDING = [
  { id:"9bZkp7q19f0", title:"I Quit My $500K Job to Do This Instead", channel:"Graham Stephan", thumbnail:"https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg", viewCount:8200000, likeCount:420000, commentCount:18000, viralScore:97, style:"storytelling", publishedAt:new Date(Date.now()-2*24*3600000).toISOString() },
  { id:"JGwWNGJdvx8", title:"The AI Tool That Replaced My Entire Team", channel:"Matt Wolfe", thumbnail:"https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg", viewCount:4700000, likeCount:280000, commentCount:9400, viralScore:94, style:"educational", publishedAt:new Date(Date.now()-3*24*3600000).toISOString() },
  { id:"ysz5S6PUM-U", title:"How I Made $50K in 30 Days (With Proof)", channel:"Iman Gadzhi", thumbnail:"https://img.youtube.com/vi/ysz5S6PUM-U/hqdefault.jpg", viewCount:12000000, likeCount:650000, commentCount:24000, viralScore:99, style:"motivational", publishedAt:new Date(Date.now()-1*24*3600000).toISOString() },
  { id:"HyWYpM_S-2c", title:"7 Signs You're Secretly Intelligent", channel:"Charisma on Command", thumbnail:"https://img.youtube.com/vi/HyWYpM_S-2c/hqdefault.jpg", viewCount:6100000, likeCount:310000, commentCount:12000, viralScore:91, style:"educational", publishedAt:new Date(Date.now()-4*24*3600000).toISOString() },
  { id:"wnHW6o8WMas", title:"What Happens to Your Body After 24hr Fast", channel:"Thomas DeLauer", thumbnail:"https://img.youtube.com/vi/wnHW6o8WMas/hqdefault.jpg", viewCount:3400000, likeCount:180000, commentCount:7200, viralScore:88, style:"educational", publishedAt:new Date(Date.now()-5*24*3600000).toISOString() },
  { id:"M7lc1UVf-VE", title:"Building a $1M App in 48 Hours with AI", channel:"Fireship", thumbnail:"https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg", viewCount:2900000, likeCount:195000, commentCount:8100, viralScore:92, style:"educational", publishedAt:new Date(Date.now()-2*24*3600000).toISOString() },
  { id:"nGdFHJXciAQ", title:"She Made $100K Selling Digital Products", channel:"Sara Finance", thumbnail:"https://img.youtube.com/vi/nGdFHJXciAQ/hqdefault.jpg", viewCount:5500000, likeCount:340000, commentCount:13000, viralScore:96, style:"storytelling", publishedAt:new Date(Date.now()-1*24*3600000).toISOString() },
  { id:"RVlOr-KQnbQ", title:"The Uncomfortable Truth About Hard Work", channel:"Alex Hormozi", thumbnail:"https://img.youtube.com/vi/RVlOr-KQnbQ/hqdefault.jpg", viewCount:9800000, likeCount:580000, commentCount:22000, viralScore:98, style:"motivational", publishedAt:new Date(Date.now()-3*24*3600000).toISOString() },
  { id:"Imuua3NCRZE", title:"ChatGPT vs Claude vs Gemini: The REAL Test", channel:"AI Explained", thumbnail:"https://img.youtube.com/vi/Imuua3NCRZE/hqdefault.jpg", viewCount:6700000, likeCount:390000, commentCount:15000, viralScore:95, style:"educational", publishedAt:new Date(Date.now()-2*24*3600000).toISOString() },
  { id:"l-a4ssMz0dI", title:"10 Psychology Tricks That Always Work", channel:"Jordan Harbinger", thumbnail:"https://img.youtube.com/vi/l-a4ssMz0dI/hqdefault.jpg", viewCount:3800000, likeCount:210000, commentCount:8900, viralScore:89, style:"educational", publishedAt:new Date(Date.now()-4*24*3600000).toISOString() },
  { id:"lsODSDmY4CY", title:"I Lived on $5/Day for 30 Days", channel:"Yes Theory", thumbnail:"https://img.youtube.com/vi/lsODSDmY4CY/hqdefault.jpg", viewCount:7200000, likeCount:430000, commentCount:17500, viralScore:93, style:"storytelling", publishedAt:new Date(Date.now()-6*24*3600000).toISOString() },
  { id:"wAZZ-UWGVHI", title:"The Morning Routine That Changed My Life", channel:"Ali Abdaal", thumbnail:"https://img.youtube.com/vi/wAZZ-UWGVHI/hqdefault.jpg", viewCount:4100000, likeCount:260000, commentCount:10200, viralScore:90, style:"educational", publishedAt:new Date(Date.now()-5*24*3600000).toISOString() },
];

const MOCK_NICHE: Record<string, typeof MOCK_TRENDING> = {
  finance:    [
    { id:"9bZkp7q19f0", title:"Why 99% of People Stay Broke Forever", channel:"Graham Stephan", thumbnail:"https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg", viewCount:9800000, likeCount:520000, commentCount:21000, viralScore:98, style:"educational", publishedAt:new Date(Date.now()-1*24*3600000).toISOString() },
    { id:"RVlOr-KQnbQ", title:"This Investment Strategy Made Me a Millionaire", channel:"Andrei Jikh", thumbnail:"https://img.youtube.com/vi/RVlOr-KQnbQ/hqdefault.jpg", viewCount:5600000, likeCount:340000, commentCount:14200, viralScore:95, style:"educational", publishedAt:new Date(Date.now()-2*24*3600000).toISOString() },
    { id:"lsODSDmY4CY", title:"The Passive Income Lie Everyone Believes", channel:"Mark Tilbury", thumbnail:"https://img.youtube.com/vi/lsODSDmY4CY/hqdefault.jpg", viewCount:3400000, likeCount:198000, commentCount:8100, viralScore:89, style:"storytelling", publishedAt:new Date(Date.now()-3*24*3600000).toISOString() },
  ],
  fitness:    [
    { id:"wnHW6o8WMas", title:"This 10-Minute Workout Burns More Fat Than 1hr Cardio", channel:"Thomas DeLauer", thumbnail:"https://img.youtube.com/vi/wnHW6o8WMas/hqdefault.jpg", viewCount:7200000, likeCount:410000, commentCount:16800, viralScore:96, style:"educational", publishedAt:new Date(Date.now()-1*24*3600000).toISOString() },
    { id:"HyWYpM_S-2c", title:"I Worked Out Every Day for 90 Days — Here's What Happened", channel:"Jeff Nippard", thumbnail:"https://img.youtube.com/vi/HyWYpM_S-2c/hqdefault.jpg", viewCount:4800000, likeCount:290000, commentCount:11500, viralScore:93, style:"storytelling", publishedAt:new Date(Date.now()-2*24*3600000).toISOString() },
    { id:"wAZZ-UWGVHI", title:"The Exercise You're Doing Wrong (Fix This Now)", channel:"Renaissance Periodization", thumbnail:"https://img.youtube.com/vi/wAZZ-UWGVHI/hqdefault.jpg", viewCount:3100000, likeCount:178000, commentCount:7200, viralScore:87, style:"educational", publishedAt:new Date(Date.now()-4*24*3600000).toISOString() },
  ],
  ai:         [
    { id:"JGwWNGJdvx8", title:"The AI Tool That Replaced My Entire Workflow", channel:"Matt Wolfe", thumbnail:"https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg", viewCount:6700000, likeCount:390000, commentCount:15800, viralScore:97, style:"educational", publishedAt:new Date(Date.now()-1*24*3600000).toISOString() },
    { id:"M7lc1UVf-VE", title:"Building a Full App in 10 Minutes with Claude AI", channel:"Fireship", thumbnail:"https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg", viewCount:4200000, likeCount:265000, commentCount:10100, viralScore:94, style:"educational", publishedAt:new Date(Date.now()-2*24*3600000).toISOString() },
    { id:"Imuua3NCRZE", title:"I Tested Every AI Model — Here's the Winner", channel:"AI Explained", thumbnail:"https://img.youtube.com/vi/Imuua3NCRZE/hqdefault.jpg", viewCount:5100000, likeCount:308000, commentCount:13200, viralScore:95, style:"educational", publishedAt:new Date(Date.now()-3*24*3600000).toISOString() },
  ],
  mindset:    [
    { id:"RVlOr-KQnbQ", title:"The Uncomfortable Truth About Motivation", channel:"Alex Hormozi", thumbnail:"https://img.youtube.com/vi/RVlOr-KQnbQ/hqdefault.jpg", viewCount:11200000, likeCount:620000, commentCount:25000, viralScore:99, style:"motivational", publishedAt:new Date(Date.now()-1*24*3600000).toISOString() },
    { id:"l-a4ssMz0dI", title:"Why You Procrastinate (And How to Stop)", channel:"Jordan Harbinger", thumbnail:"https://img.youtube.com/vi/l-a4ssMz0dI/hqdefault.jpg", viewCount:4600000, likeCount:270000, commentCount:11300, viralScore:92, style:"educational", publishedAt:new Date(Date.now()-3*24*3600000).toISOString() },
    { id:"ysz5S6PUM-U", title:"I Did This One Thing and My Life Changed", channel:"Iman Gadzhi", thumbnail:"https://img.youtube.com/vi/ysz5S6PUM-U/hqdefault.jpg", viewCount:7900000, likeCount:460000, commentCount:18700, viralScore:97, style:"storytelling", publishedAt:new Date(Date.now()-2*24*3600000).toISOString() },
  ],
};

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type   = searchParams.get("type") || "trending";
  const region = searchParams.get("region") || "US";
  const niche  = (searchParams.get("niche") || "").toLowerCase();
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    const nicheKey = Object.keys(MOCK_NICHE).find(k => niche.includes(k));
    const videos   = type === "niche" && nicheKey ? MOCK_NICHE[nicheKey] : MOCK_TRENDING;
    return NextResponse.json({ ok: true, videos, mock: true });
  }

  try {
    let videoItems: Array<Record<string, unknown>> = [];

    if (type === "trending") {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=${region}&maxResults=20&key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const data = await res.json() as { items?: Array<Record<string, unknown>> };
      videoItems = data.items || [];
    } else {
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=${encodeURIComponent(niche || "viral")}&order=viewCount&publishedAfter=${weekAgo}&maxResults=20&key=${apiKey}`;
      const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) });
      const searchData = await searchRes.json() as { items?: Array<{ id: { videoId: string } }> };
      const ids = (searchData.items || []).map(i => i.id.videoId).join(",");
      if (ids) {
        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${ids}&key=${apiKey}`;
        const statsRes = await fetch(statsUrl, { signal: AbortSignal.timeout(8000) });
        const statsData = await statsRes.json() as { items?: Array<Record<string, unknown>> };
        videoItems = statsData.items || [];
      }
    }

    const videos = videoItems.map(item => {
      const snippet  = item.snippet as Record<string, unknown>;
      const stats    = item.statistics as Record<string, string>;
      const views    = parseInt(stats?.viewCount || "0");
      const likes    = parseInt(stats?.likeCount || "0");
      const comments = parseInt(stats?.commentCount || "0");
      const published = new Date((snippet?.publishedAt as string) || Date.now());
      const hoursOld = (Date.now() - published.getTime()) / 3600000;
      return {
        id: item.id as string,
        title: (snippet?.title as string) || "",
        channel: (snippet?.channelTitle as string) || "",
        thumbnail: ((snippet?.thumbnails as Record<string, { url: string }>)?.high?.url) || `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`,
        viewCount: views, likeCount: likes, commentCount: comments,
        viralScore: calcViralScore(views, likes, comments, hoursOld),
        style: "educational",
        publishedAt: (snippet?.publishedAt as string) || new Date().toISOString(),
      };
    }).filter(v => v.title);

    return NextResponse.json({ ok: true, videos, region, type });
  } catch (err) {
    console.error("[trending]", err);
    const nicheKey = Object.keys(MOCK_NICHE).find(k => niche.includes(k));
    const videos   = type === "niche" && nicheKey ? MOCK_NICHE[nicheKey] : MOCK_TRENDING;
    return NextResponse.json({ ok: true, videos, mock: true });
  }
}

export const runtime = "nodejs";
/**
 * /api/ai-video — Complete AI Video Generation Pipeline
 *
 * POST body:
 *   mode: "prompt" | "script" | "youtube-to-shorts" | "long-video" | "viral-short"
 *   topic / script / youtubeUrl
 *   style: "motivational" | "educational" | "storytelling" | "cartoon" | "cinematic" | "anime"
 *   duration: number (seconds)
 *   platform: "shorts" | "reels" | "tiktok" | "youtube"
 *   sceneCount?: number
 *
 * Returns: { ok, script, scenes, title, hook, jobId, estimatedTime }
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { aiJSON, aiText, generateScript } from "@/lib/ai";
import { loadUserKeys } from "@/lib/userKeys";
import { prisma } from "@/lib/prisma";

interface Scene {
  index: number; title: string; narration: string; visual_prompt: string;
  style: string; duration: number; mood: string; camera: string;
}

async function planScenes(script: string, style: string, count: number): Promise<Scene[]> {
  const system = "You are a video director. Return ONLY valid JSON array, no markdown.";
  const prompt = `Break this script into ${count} visual scenes for a ${style} style video.

Script: "${script.slice(0, 2000)}"

Return ONLY this JSON array:
[{
  "index": 1,
  "title": "Scene name max 4 words",
  "narration": "Voiceover text for this scene (max 25 words)",
  "visual_prompt": "Detailed cinematic visual description for AI video (max 60 words)",
  "style": "${style}",
  "duration": 8,
  "mood": "energetic|dramatic|calm|mysterious|uplifting",
  "camera": "wide shot|close-up|tracking|aerial|static"
}]`;

  const scenes = await aiJSON<Scene[]>(system, prompt, 3000);
  return scenes.map((s, i) => ({ ...s, index: i + 1 }));
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await loadUserKeys(user.id);

  const {
    mode = "prompt",
    topic, script: inputScript, youtubeUrl,
    style = "cinematic",
    duration = 60,
    platform = "shorts",
    sceneCount = 4,
  } = await req.json();

  try {
    // ── MODE: youtube-to-shorts ──────────────────────────────────────────────
    if (mode === "youtube-to-shorts") {
      const videoId = youtubeUrl?.match(/(?:v=|youtu\.be\/)([^&\s?]+)/)?.[1];
      if (!videoId) return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });

      // Use Groq AI to generate short suggestions based on the video topic
      const analysis = await aiJSON<{
        shorts: Array<{ title: string; hook: string; hookOverlay: string; startTime: number; endTime: number; viralScore: number; why: string }>;
        meta: { title: string; channel: string };
      }>(
        "You are a viral content strategist. Return ONLY valid JSON.",
        `A YouTube video has ID: ${videoId}
Generate 5 viral short suggestions (15-90 seconds each) from this video.
Suggest compelling moments that would work as Shorts/Reels.

Return ONLY this JSON:
{
  "meta": { "title": "Estimated video title", "channel": "Creator name" },
  "shorts": [{
    "title": "Short title (max 8 words)",
    "hook": "Compelling description",
    "hookOverlay": "HOOK TEXT MAX 5 WORDS",
    "startTime": 45,
    "endTime": 105,
    "viralScore": 87,
    "why": "Why this moment is viral"
  }]
}`,
        2000
      );

      return NextResponse.json({
        ok: true, mode: "youtube-to-shorts", videoId,
        shorts: analysis.shorts || [],
        meta: { ...analysis.meta, thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` },
        message: `${analysis.shorts?.length || 5} viral moments found!`,
      });
    }

    // ── MODE: prompt or viral-short ──────────────────────────────────────────
    if (mode === "prompt" || mode === "viral-short") {
      if (!topic?.trim()) return NextResponse.json({ error: "Topic required" }, { status: 400 });

      const result = await generateScript({
        topic,
        style: style as Parameters<typeof generateScript>[0]["style"],
        duration: Math.min(duration, 180),
        platform: platform as Parameters<typeof generateScript>[0]["platform"],
        tone: mode === "viral-short" ? "viral, shocking, emotional" : "engaging",
      });

      const job = await prisma.generationJob.create({
        data: {
          userId: user.id,
          generationMode: "free",
          provider: "groq",
          totalScenes: result.scenes.length,
          status: "queued",
        },
      });

      return NextResponse.json({
        ok: true, mode,
        title: result.title, hook: result.hook, script: result.script,
        scenes: result.scenes, jobId: job.id,
        sceneCount: result.scenes.length,
        estimatedTime: result.scenes.length * 3,
        message: `${result.scenes.length} scenes planned! Click "Generate in Scene Studio" to create videos.`,
      });
    }

    // ── MODE: script → scenes ────────────────────────────────────────────────
    if (mode === "script") {
      if (!inputScript?.trim()) return NextResponse.json({ error: "Script required" }, { status: 400 });

      const count = Math.min(Math.max(sceneCount || 4, 2), 12);
      const scenes = await planScenes(inputScript, style, count);
      const title = await aiText(
        "Write a compelling video title. Return ONLY the title, no quotes.",
        `Script: "${inputScript.slice(0, 300)}"\nPlatform: ${platform}\n\nWrite a viral title for this video:`
      );

      const job = await prisma.generationJob.create({
        data: {
          userId: user.id, generationMode: "free", provider: "groq",
          totalScenes: scenes.length, status: "queued",
        },
      });

      return NextResponse.json({
        ok: true, mode: "script", title, scenes, jobId: job.id,
        sceneCount: scenes.length, estimatedTime: scenes.length * 3,
        message: `Script split into ${scenes.length} scenes!`,
      });
    }

    // ── MODE: long-video ─────────────────────────────────────────────────────
    if (mode === "long-video") {
      if (!topic?.trim()) return NextResponse.json({ error: "Topic required" }, { status: 400 });

      const longDuration = Math.min(duration, 300);
      const count = Math.min(sceneCount || Math.ceil(longDuration / 30), 12);

      const result = await generateScript({
        topic, style: style as Parameters<typeof generateScript>[0]["style"],
        duration: longDuration, platform: "youtube", tone: "educational, detailed",
      });

      const job = await prisma.generationJob.create({
        data: {
          userId: user.id, generationMode: "free", provider: "groq",
          totalScenes: result.scenes.length, status: "queued",
        },
      });

      return NextResponse.json({
        ok: true, mode: "long-video",
        title: result.title, hook: result.hook, script: result.script,
        scenes: result.scenes.slice(0, count), jobId: job.id,
        sceneCount: result.scenes.length, estimatedTime: result.scenes.length * 3,
        message: `Long video: ${result.scenes.length} scenes · ${longDuration}s planned!`,
      });
    }

    return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });

  } catch (err) {
    console.error("[ai-video]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// GET: list user's generation jobs
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await prisma.generationJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ ok: true, jobs });
}

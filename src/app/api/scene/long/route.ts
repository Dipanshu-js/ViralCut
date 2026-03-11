export const runtime = "nodejs";
/**
 * /api/scene/long — Generate multiple scenes for a long video
 * Generates a script first, then queues individual clip generation jobs
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { generateScript } from "@/lib/ai";
import { loadUserKeys } from "@/lib/userKeys";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await loadUserKeys(user.id);

  const {
    topic,
    style       = "cinematic",
    duration    = 60,
    platform    = "shorts",
    sceneCount  = 4,
    aspectRatio = "9:16",
    resolution  = "720p",
    generationMode = "free",
    preferredProvider,
    tone        = "engaging",
  } = await req.json();

  if (!topic?.trim()) return NextResponse.json({ error: "Topic required" }, { status: 400 });

  try {
    // 1. Generate script with scenes via Groq
    const result = await generateScript({
      topic,
      style: style as Parameters<typeof generateScript>[0]["style"],
      duration: Math.min(duration, 300),
      platform: platform as Parameters<typeof generateScript>[0]["platform"],
      tone,
    });

    const scenes = result.scenes.slice(0, Math.min(sceneCount, 12));

    // 2. Create a generation job
    const job = await prisma.generationJob.create({
      data: {
        userId: user.id,
        status: "queued",
        generationMode,
        provider: preferredProvider || "canvas",
        totalScenes: scenes.length,
        completedScenes: 0,
        failedScenes: 0,
      },
    });

    // 3. Create DB records for each scene (status=pending — client will trigger generation)
    const clipRecords = await Promise.all(scenes.map((scene, idx) =>
      prisma.generatedClip.create({
        data: {
          userId: user.id,
          prompt: scene.visual_prompt || `${scene.title}: ${scene.narration}`,
          duration: scene.duration || Math.ceil(duration / scenes.length),
          resolution,
          aspectRatio,
          style,
          sceneIndex: idx,
          status: "pending",
          generationMode,
          provider: preferredProvider || "canvas",
          jobId: job.id,
          estimatedTime: 5,
          metadata: {
            title: scene.title,
            narration: scene.narration,
            mood: scene.mood,
            camera: scene.camera || "wide shot",
          },
        },
      })
    ));

    return NextResponse.json({
      ok: true,
      jobId: job.id,
      title: result.title,
      hook: result.hook,
      script: result.script,
      scenes: scenes.map((s, i) => ({
        ...s,
        clipId: clipRecords[i].id,
        status: "pending",
      })),
      sceneCount: scenes.length,
      estimatedTime: scenes.length * 5,
      message: `${scenes.length} scenes planned! Generate each one below.`,
    });

  } catch (err) {
    console.error("[scene/long]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

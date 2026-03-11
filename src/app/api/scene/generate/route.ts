export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiText } from "@/lib/ai";
import { loadUserKeys } from "@/lib/userKeys";
import { getProvider, type GenerationMode } from "@/lib/video-providers";

// ── Prompt Enhancer ───────────────────────────────────────────────────────────
async function enhancePrompt(prompt: string, style: string): Promise<string> {
  try {
    return await aiText(
      "You are a cinematic AI video prompt engineer. Enhance prompts to be vivid, specific, and cinematically detailed. Return ONLY the enhanced prompt — no labels, no explanation, no preamble.",
      `Style: ${style}\nOriginal: ${prompt}\n\nRewrite as a detailed cinematic scene description for AI video generation (max 120 words):`
    );
  } catch {
    return prompt;
  }
}

// ── POST: Generate a single clip ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    prompt,
    duration     = 6,
    resolution   = "720p",
    aspectRatio  = "16:9",
    style        = "cinematic",
    projectId,
    generationMode = "free" as GenerationMode,  // Default to FREE
    preferredProvider,
    sceneIndex   = 0,
    jobId,
    autoFallback = true,
  } = await req.json();

  if (!prompt?.trim()) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

  // Load user's API keys (Pexels, Pixabay, premium providers)
  const userKeys = await loadUserKeys(user.id);
  // Override env vars with user's DB keys for this request
  if (userKeys.pexelsKey) process.env._USER_PEXELS = userKeys.pexelsKey;
  if (userKeys.pixabayKey) process.env._USER_PIXABAY = userKeys.pixabayKey;

  // 1. Resolve provider — free first by default
  const provider = await getProvider(generationMode as GenerationMode, preferredProvider);
  const actualMode = provider.mode;
  const estimatedTime = provider.getEstimatedTime(duration);

  // 2. Create DB record immediately
  const clip = await prisma.generatedClip.create({
    data: {
      userId: user.id,
      prompt,
      duration,
      resolution,
      aspectRatio,
      style,
      projectId,
      sceneIndex,
      status: "generating",
      generationMode: actualMode,
      provider: provider.name,
      estimatedTime,
      jobId,
    },
  });

  // 3. Enhance prompt with AI (Groq — fast & free)
  const enhancedPrompt = await enhancePrompt(prompt, style);

  // 4. Generate via resolved provider
  const result = await provider.generate({
    prompt,
    enhancedPrompt,
    duration,
    resolution,
    aspectRatio,
    style,
  });

  // 5. If free provider failed and autoFallback → try canvas (always works)
  let finalResult = result;
  let usedFallback = false;
  if (result.status === "failed" && autoFallback) {
    const { CanvasSlideProvider } = await import("@/lib/video-providers");
    const canvas = new CanvasSlideProvider();
    finalResult = await canvas.generate({ prompt, enhancedPrompt, duration, resolution, aspectRatio, style });
    usedFallback = true;
  }

  // 6. Determine final status
  const status = finalResult.status === "done" ? "done"
    : finalResult.status === "pending" ? "pending"
    : finalResult.videoUrl ? "done"
    : finalResult.canvasData ? "done"  // canvas is "done" even without videoUrl
    : "demo";

  // 7. Update DB record
  const updated = await prisma.generatedClip.update({
    where: { id: clip.id },
    data: {
      videoUrl: finalResult.videoUrl,
      status,
      prompt: enhancedPrompt,
      provider: usedFallback ? "canvas" : provider.name,
      generationMode: provider.mode,
      estimatedTime: finalResult.estimatedTime || 0,
      jobId: finalResult.jobId || jobId,
      errorMessage: finalResult.status === "failed" ? finalResult.message : null,
    },
  });

  return NextResponse.json({
    ok: true,
    clip: updated,
    enhancedPrompt,
    provider: usedFallback ? "canvas" : provider.name,
    generationMode: provider.mode,
    estimatedTime: finalResult.estimatedTime || 0,
    usedFallback,
    demo: false, // canvas mode is NOT demo — it's real free generation
    canvasData: finalResult.canvasData || null,
    message: usedFallback
      ? `Generated via Canvas Slideshow (free fallback)`
      : finalResult.message || `Generated successfully via ${provider.name}!`,
  });
}

// ── GET: list clips for current user ─────────────────────────────────────────
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clips = await prisma.generatedClip.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ clips });
}

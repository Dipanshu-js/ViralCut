export const runtime = "nodejs";
/**
 * /api/scene/queue — Get job/clip generation status
 * Used by scene-generator for polling during multi-scene generation
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const clipId = searchParams.get("clipId");

  if (jobId) {
    const job = await prisma.generationJob.findFirst({
      where: { id: jobId, userId: user.id },
    });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const clips = await prisma.generatedClip.findMany({
      where: { jobId, userId: user.id },
      orderBy: { sceneIndex: "asc" },
    });

    const done = clips.filter(c => c.status === "done" || c.status === "demo").length;
    const failed = clips.filter(c => c.status === "failed").length;
    const progress = clips.length > 0 ? Math.round((done / clips.length) * 100) : 0;

    return NextResponse.json({
      ok: true, job, clips, progress,
      done, failed, total: clips.length,
      status: done === clips.length && clips.length > 0 ? "complete" : "processing",
    });
  }

  if (clipId) {
    const clip = await prisma.generatedClip.findFirst({
      where: { id: clipId, userId: user.id },
    });
    if (!clip) return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    return NextResponse.json({ ok: true, clip });
  }

  // List recent clips for user
  const clips = await prisma.generatedClip.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const jobs = await prisma.generationJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ ok: true, clips, jobs });
}

// DELETE a clip or job
export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clipId, jobId } = await req.json();

  if (clipId) {
    await prisma.generatedClip.deleteMany({ where: { id: clipId, userId: user.id } });
    return NextResponse.json({ ok: true });
  }
  if (jobId) {
    await prisma.generationJob.deleteMany({ where: { id: jobId, userId: user.id } });
    await prisma.generatedClip.deleteMany({ where: { jobId, userId: user.id } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "clipId or jobId required" }, { status: 400 });
}

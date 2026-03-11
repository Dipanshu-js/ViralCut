export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Clip Stitching via FFmpeg
 * ─────────────────────────
 * Two modes:
 *   1. Server-side FFmpeg: calls local ffmpeg binary to concatenate real video files
 *   2. Client-side fallback: returns ordered clip list for MediaRecorder stitching
 *
 * For real videos: ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4
 *
 * Transition options: fade, crossfade, cut (default)
 */

interface StitchRequest {
  clipIds: string[];
  jobId?: string;
  transition?: "cut" | "fade" | "crossfade";
  outputFormat?: "mp4" | "webm";
}

async function stitchWithFFmpeg(
  videoUrls: string[],
  transition: string,
  outputFormat: string
): Promise<string | null> {
  // Check if ffmpeg is available on server
  const { execSync } = await import("child_process");
  const { writeFileSync, unlinkSync, existsSync } = await import("fs");
  const { join } = await import("path");
  const { tmpdir } = await import("os");
  const { randomUUID } = await import("crypto");

  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
  } catch {
    return null; // ffmpeg not available
  }

  const tmpDir = tmpdir();
  const uid = randomUUID().slice(0, 8);
  const listFile = join(tmpDir, `viralcut_list_${uid}.txt`);
  const outputFile = join(tmpDir, `viralcut_output_${uid}.${outputFormat}`);

  // Download video files to tmp (for URL-based clips)
  const localPaths: string[] = [];
  for (let i = 0; i < videoUrls.length; i++) {
    const url = videoUrls[i];
    if (url.startsWith("http")) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
        const buffer = await res.arrayBuffer();
        const ext = url.includes(".webm") ? "webm" : "mp4";
        const localPath = join(tmpDir, `viralcut_clip_${uid}_${i}.${ext}`);
        writeFileSync(localPath, Buffer.from(buffer));
        localPaths.push(localPath);
      } catch {
        continue; // skip failed downloads
      }
    } else {
      localPaths.push(url);
    }
  }

  if (localPaths.length === 0) return null;

  // Build FFmpeg concat list
  const listContent = localPaths.map(p => `file '${p}'`).join("\n");
  writeFileSync(listFile, listContent);

  try {
    let ffmpegCmd: string;
    if (transition === "crossfade") {
      // crossfade using xfade filter
      const inputs = localPaths.map(p => `-i "${p}"`).join(" ");
      const filters = localPaths.slice(0, -1).map((_, i) =>
        `[${i}][${i+1}]xfade=transition=fade:duration=0.5:offset=${i * 5.5}[v${i}]`
      ).join(";");
      ffmpegCmd = `ffmpeg -y ${inputs} -filter_complex "${filters}" -map "[v${localPaths.length-2}]" "${outputFile}" 2>/dev/null`;
    } else if (transition === "fade") {
      // simple concat with fade
      ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -vf "fade=in:0:15,fade=out:st=5:d=0.5" "${outputFile}" 2>/dev/null`;
    } else {
      // clean cut concat
      ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputFile}" 2>/dev/null`;
    }

    execSync(ffmpegCmd, { timeout: 120000 });

    if (existsSync(outputFile)) {
      // Read and return as base64 data URL (for small files <50MB)
      const { readFileSync, statSync } = await import("fs");
      const stat = statSync(outputFile);
      if (stat.size < 50 * 1024 * 1024) {
        const buf = readFileSync(outputFile);
        const b64 = buf.toString("base64");
        const mime = outputFormat === "webm" ? "video/webm" : "video/mp4";
        // Cleanup
        [listFile, outputFile, ...localPaths].forEach(f => { try { unlinkSync(f); } catch {} });
        return `data:${mime};base64,${b64}`;
      }
    }
  } catch (e) {
    console.error("[stitch] FFmpeg error:", e);
  }

  // Cleanup
  [listFile, outputFile, ...localPaths].forEach(f => { try { unlinkSync(f); } catch {} });
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    clipIds,
    jobId,
    transition = "cut",
    outputFormat = "mp4",
  }: StitchRequest = await req.json();

  if (!clipIds?.length) return NextResponse.json({ error: "No clip IDs provided" }, { status: 400 });

  // Fetch clips from DB
  const clips = await prisma.generatedClip.findMany({
    where: { id: { in: clipIds }, userId: user.id },
    orderBy: { sceneIndex: "asc" },
  });

  if (clips.length === 0) return NextResponse.json({ error: "No clips found" }, { status: 404 });

  const videoUrls = clips
    .map(c => c.videoUrl)
    .filter((u): u is string => !!u);

  // Single clip — no stitching needed
  if (videoUrls.length <= 1) {
    return NextResponse.json({
      ok: true,
      stitchedUrl: videoUrls[0] || null,
      method: "single",
      clipCount: clips.length,
      totalDuration: clips.reduce((a, c) => a + c.duration, 0),
      clips: clips.map(c => ({ id: c.id, sceneIndex: c.sceneIndex, duration: c.duration, videoUrl: c.videoUrl })),
    });
  }

  // Try server-side FFmpeg stitching
  const stitchedUrl = await stitchWithFFmpeg(videoUrls, transition, outputFormat);

  // Update job if provided
  if (jobId) {
    await prisma.generationJob.updateMany({
      where: { id: jobId, userId: user.id },
      data: { stitchedUrl: stitchedUrl || undefined, status: "complete" },
    });
  }

  // Update clips with stitchedUrl reference
  if (stitchedUrl) {
    await prisma.generatedClip.updateMany({
      where: { id: { in: clipIds }, userId: user.id },
      data: { stitchedUrl },
    });
  }

  const totalDuration = clips.reduce((a, c) => a + c.duration, 0);

  return NextResponse.json({
    ok: true,
    stitchedUrl,
    method: stitchedUrl ? "ffmpeg" : "client-side",
    clipCount: clips.length,
    totalDuration,
    transition,
    clips: clips.map(c => ({
      id: c.id,
      sceneIndex: c.sceneIndex,
      duration: c.duration,
      videoUrl: c.videoUrl,
    })),
    message: stitchedUrl
      ? `${clips.length} clips stitched into ${totalDuration}s video!`
      : `FFmpeg not available — use client-side stitching. ${clips.length} clips (${totalDuration}s) ready.`,
  });
}

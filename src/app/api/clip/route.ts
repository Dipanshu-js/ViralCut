export const runtime = "nodejs";

/**
 * /api/clip — Server-side YouTube video clipper
 *
 * Modes:
 *   ?mode=info    → return all available stream sources (for client)
 *   ?mode=stream  → server-side download + ffmpeg trim + return mp4 bytes
 *   ?mode=download → yt-dlp download + ffmpeg crop to 9:16 + download file
 *
 * Priority:
 * 1. yt-dlp (install: pip install yt-dlp OR: winget install yt-dlp)
 * 2. Invidious + ffmpeg
 * 3. Proxy URLs for client-side <video>
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { execSync, spawnSync } from "child_process";
import { existsSync, unlinkSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { INVIDIOUS_INSTANCES } from "@/lib/constants";

const TMP = join(tmpdir(), "viralcut-clips");
function ensureTmp() { if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true }); }

function hasYtDlp(): boolean {
  try { execSync("yt-dlp --version", { stdio: "ignore", timeout: 5000 }); return true; }
  catch { return false; }
}

function hasFfmpeg(): boolean {
  try { execSync("ffmpeg -version", { stdio: "ignore", timeout: 3000 }); return true; }
  catch { return false; }
}

async function ytdlpGetUrl(videoId: string, quality: "hd" | "sd"): Promise<string[]> {
  try {
    const fmt = quality === "hd"
      ? "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]"
      : "worst[ext=mp4]/worst[height<=480][ext=mp4]/worst";

    const result = spawnSync("yt-dlp", [
      "--get-url",
      "-f", fmt,
      "--no-playlist",
      "--no-warnings",
      `https://www.youtube.com/watch?v=${videoId}`,
    ], { timeout: 30000, encoding: "utf8" });

    if (result.status !== 0) return [];
    return (result.stdout?.trim().split("\n") || []).filter(Boolean);
  } catch { return []; }
}

async function invidiousGetStreams(videoId: string): Promise<{ sd: string; hd: string; audio: string } | null> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(
        `${instance}/api/v1/videos/${videoId}?fields=formatStreams,adaptiveFormats`,
        { signal: AbortSignal.timeout(6000), headers: { Accept: "application/json" } }
      );
      if (!res.ok) continue;
      type S = { itag: number; url: string };
      const data = await res.json() as { formatStreams?: S[]; adaptiveFormats?: S[] };
      const all = [...(data.formatStreams || []), ...(data.adaptiveFormats || [])];
      const sd  = all.find(s => s.itag === 18)?.url || `${instance}/latest_version?id=${videoId}&itag=18`;
      const hd  = all.find(s => s.itag === 22)?.url || `${instance}/latest_version?id=${videoId}&itag=22`;
      const aud = all.find(s => s.itag === 140)?.url || `${instance}/latest_version?id=${videoId}&itag=140`;
      return { sd, hd, audio: aud };
    } catch { continue; }
  }
  return null;
}

async function ffmpegTrimClip(
  videoUrls: string[],   // [videoUrl, audioUrl?]
  start: number,
  duration: number,
  outputPath: string,
  cropVertical = false
): Promise<boolean> {
  ensureTmp();
  const [videoUrl, audioUrl] = videoUrls;
  const cropFilter = cropVertical
    ? ",scale='if(gt(iw/ih,9/16),720,-2)':'if(gt(iw/ih,9/16),-2,1280)',crop=720:1280:(iw-720)/2:(ih-1280)/2"
    : "";

  try {
    let args: string[];
    if (audioUrl && audioUrl !== videoUrl) {
      args = [
        "-y",
        "-ss", String(start), "-i", videoUrl,
        "-ss", String(start), "-i", audioUrl,
        "-t", String(duration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        "-vf", `scale=-2:720${cropFilter}`,
        outputPath,
      ];
    } else {
      args = [
        "-y",
        "-ss", String(start), "-i", videoUrl,
        "-t", String(duration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        "-vf", `scale=-2:720${cropFilter}`,
        outputPath,
      ];
    }

    const result = spawnSync("ffmpeg", args, {
      timeout: 180000,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return existsSync(outputPath) && result.status === 0;
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const videoId  = searchParams.get("videoId");
  const start    = parseInt(searchParams.get("start") || "0");
  const duration = parseInt(searchParams.get("duration") || "60");
  const quality  = (searchParams.get("quality") || "sd") as "hd" | "sd";
  const mode     = searchParams.get("mode") || "info";
  const vertical = searchParams.get("vertical") !== "false"; // default true for Shorts

  if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });
  ensureTmp();

  const ytdlpAvail  = hasYtDlp();
  const ffmpegAvail = hasFfmpeg();

  // ── MODE: info — return sources for client-side video loading ─────────────
  if (mode === "info") {
    const sources: Array<{ url: string; type: string; quality: string; source: string }> = [];

    // PRIMARY: our own ytproxy (CORS-safe, always works)
    sources.push({
      url: `/api/ytproxy?videoId=${videoId}&itag=18`,
      type: "video/mp4",
      quality: "360p (proxy)",
      source: "ytproxy-sd",
    });
    sources.push({
      url: `/api/ytproxy?videoId=${videoId}&itag=22&hd=1`,
      type: "video/mp4",
      quality: "720p (proxy)",
      source: "ytproxy-hd",
    });

    // Server-side clip if ffmpeg available (already cropped/trimmed)
    if (ffmpegAvail) {
      sources.push({
        url: `/api/clip?videoId=${videoId}&start=${start}&duration=${duration}&mode=stream&quality=${quality}&vertical=${vertical}`,
        type: "video/mp4",
        quality: "server-clip (trimmed)",
        source: "server-ffmpeg",
      });
    }

    // Direct Invidious fallbacks
    INVIDIOUS_INSTANCES.slice(0, 3).forEach((inst, i) => {
      sources.push({
        url: `${inst}/latest_version?id=${videoId}&itag=18`,
        type: "video/mp4",
        quality: "360p",
        source: `invidious-${i + 1}`,
      });
    });

    return NextResponse.json({
      ok: true,
      videoId, start, duration,
      ytdlpAvailable: ytdlpAvail,
      ffmpegAvailable: ffmpegAvail,
      sources,
      embedUrl: `https://www.youtube.com/embed/${videoId}?start=${start}&autoplay=1`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}&t=${start}s`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    });
  }

  // ── MODE: stream / download — server downloads + ffmpeg trims ────────────
  if (mode === "stream" || mode === "download") {
    const uid = randomUUID().slice(0, 8);
    const outPath = join(TMP, `clip_${videoId}_${start}_${uid}.mp4`);
    let success = false;

    // Strategy 1: yt-dlp (best)
    if (ytdlpAvail && ffmpegAvail) {
      const urls = await ytdlpGetUrl(videoId, quality);
      if (urls.length > 0) {
        success = await ffmpegTrimClip(urls, start, duration, outPath, vertical);
      }
    }

    // Strategy 2: Invidious + ffmpeg
    if (!success && ffmpegAvail) {
      const inv = await invidiousGetStreams(videoId);
      if (inv) {
        const videoUrl = quality === "hd" ? inv.hd : inv.sd;
        success = await ffmpegTrimClip([videoUrl, inv.audio], start, duration, outPath, vertical);
      }
    }

    if (success && existsSync(outPath)) {
      const buf = readFileSync(outPath);
      try { unlinkSync(outPath); } catch {}

      const filename = `viralcut_${videoId}_${start}s_${duration}s.mp4`;
      return new Response(buf, {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(buf.length),
          "Cache-Control": "public, max-age=3600",
          "Content-Disposition": mode === "download"
            ? `attachment; filename="${filename}"`
            : `inline; filename="${filename}"`,
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Fallback: redirect to proxy
    return NextResponse.redirect(
      new URL(`/api/ytproxy?videoId=${videoId}&itag=18`, req.url)
    );
  }

  return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
}

// POST: clip info or trigger download
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { videoId, start, duration, quality = "sd", vertical = true } = await req.json();
  if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

  ensureTmp();
  const uid = randomUUID().slice(0, 8);
  const outPath = join(TMP, `clip_${videoId}_${uid}.mp4`);

  const ytdlpAvail  = hasYtDlp();
  const ffmpegAvail = hasFfmpeg();
  let success = false;

  if (ytdlpAvail && ffmpegAvail) {
    const urls = await ytdlpGetUrl(videoId, quality);
    if (urls.length > 0) {
      success = await ffmpegTrimClip(urls, start || 0, duration || 60, outPath, vertical);
    }
  }

  if (!success && ffmpegAvail) {
    const inv = await invidiousGetStreams(videoId);
    if (inv) {
      success = await ffmpegTrimClip(
        [quality === "hd" ? inv.hd : inv.sd, inv.audio],
        start || 0, duration || 60, outPath, vertical
      );
    }
  }

  if (success && existsSync(outPath)) {
    const buf = readFileSync(outPath);
    const b64 = buf.toString("base64");
    try { unlinkSync(outPath); } catch {}
    return NextResponse.json({
      ok: true,
      videoData: `data:video/mp4;base64,${b64}`,
      size: buf.length,
      filename: `viralcut_${videoId}_${start}s.mp4`,
    });
  }

  return NextResponse.json({
    ok: false,
    fallback: true,
    proxyUrl: `/api/ytproxy?videoId=${videoId}&itag=18`,
    downloadUrl: `https://www.youtube.com/watch?v=${videoId}&t=${start}s`,
    message: ytdlpAvail
      ? "Server clip failed — try proxy player or manual download"
      : "Install yt-dlp for server-side clipping: pip install yt-dlp",
    ytdlpInstall: "pip install yt-dlp",
  });
}

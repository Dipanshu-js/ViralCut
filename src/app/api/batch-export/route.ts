export const runtime = "nodejs";

/**
 * /api/batch-export — Server-side batch clip processing
 * Downloads multiple clips, burns captions, packages as ZIP
 *
 * POST body:
 *   videoId: string
 *   shorts: Array<{ id, startTime, duration, hookText, captionStyle, transcript }>
 *   quality: "sd"|"hd"
 *   burnCaptions: boolean
 *   addHook: boolean
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { execSync, spawnSync } from "child_process";
import { existsSync, unlinkSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

const TMP = join(tmpdir(), "viralcut-batch");
function ensureTmp() { if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true }); }

interface ShortSpec {
  id: string;
  title: string;
  startTime: number;
  duration: number;
  hookText?: string;
  captionStyle?: string;
  accentColor?: string;
  transcript?: Array<{ start: number; dur: number; text: string }>;
}

function hasFfmpeg(): boolean {
  try { execSync("ffmpeg -version", { stdio: "ignore", timeout: 3000 }); return true; }
  catch { return false; }
}

function hasYtDlp(): boolean {
  try { execSync("yt-dlp --version", { stdio: "ignore", timeout: 3000 }); return true; }
  catch { return false; }
}

async function getVideoUrl(videoId: string, quality: "sd" | "hd"): Promise<string | null> {
  if (hasYtDlp()) {
    try {
      const fmt = quality === "hd"
        ? "bestvideo[height<=720][ext=mp4]+bestaudio/best[height<=720]"
        : "worst[ext=mp4]/worst";
      const r = spawnSync("yt-dlp", ["--get-url","-f",fmt,"--no-playlist","--no-warnings",
        `https://www.youtube.com/watch?v=${videoId}`],
        { timeout: 30000, encoding: "utf8" });
      if (r.status === 0) return r.stdout?.trim().split("\n")[0] || null;
    } catch {}
  }
  return null;
}

// Build SRT from transcript segments (relative to clip start)
function buildSrt(segments: ShortSpec["transcript"], clipStart: number): string {
  if (!segments?.length) return "";
  let srt = "";
  segments.forEach((seg, i) => {
    const relStart = Math.max(0, seg.start - clipStart);
    const relEnd = relStart + seg.dur;
    const fmt = (s: number) => {
      const h = Math.floor(s/3600).toString().padStart(2,"0");
      const m = Math.floor((s%3600)/60).toString().padStart(2,"0");
      const sec = Math.floor(s%60).toString().padStart(2,"0");
      const ms = Math.floor((s%1)*1000).toString().padStart(3,"0");
      return `${h}:${m}:${sec},${ms}`;
    };
    srt += `${i+1}\n${fmt(relStart)} --> ${fmt(relEnd)}\n${seg.text}\n\n`;
  });
  return srt;
}

async function processClip(
  videoUrl: string,
  short: ShortSpec,
  dir: string,
  burnCaptions: boolean,
  addHook: boolean
): Promise<string | null> {
  const uid = randomUUID().slice(0, 6);
  const rawPath  = join(dir, `raw_${uid}.mp4`);
  const outPath  = join(dir, `short_${short.id}_${uid}.mp4`);
  const srtPath  = join(dir, `captions_${uid}.srt`);

  // 1. Download + trim + crop to 9:16
  const trimResult = spawnSync("ffmpeg", [
    "-y", "-ss", String(short.startTime), "-i", videoUrl,
    "-t", String(short.duration),
    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
    "-vf", "scale=-2:1280,crop=720:1280:(iw-720)/2:(ih-1280)/2",
    rawPath,
  ], { timeout: 120000, encoding: "utf8", stdio: ["ignore","pipe","pipe"] });

  if (!existsSync(rawPath)) return null;

  // 2. Build filter_complex for captions + hook
  const filters: string[] = [];
  const ffArgs: string[] = ["-y", "-i", rawPath];

  // Caption SRT
  if (burnCaptions && short.transcript?.length) {
    const srt = buildSrt(short.transcript, short.startTime);
    writeFileSync(srtPath, srt, "utf8");
    const style = short.captionStyle || "bold";
    const fontColor = style === "neon" ? "00d4ff" : style === "yellow" ? "ffd43b" : "ffffff";
    const fontSize = 52;
    filters.push(
      `subtitles='${srtPath.replace(/\\/g,"/")}':force_style='FontName=Arial,FontSize=${fontSize},PrimaryColour=&H${fontColor}&,OutlineColour=&H000000&,Outline=3,Shadow=2,Alignment=2,MarginV=120'`
    );
  }

  // Hook text overlay (first 4 seconds)
  if (addHook && short.hookText) {
    const hookEscaped = short.hookText.replace(/'/g,"").replace(/:/g,"\\:").toUpperCase();
    const color = (short.accentColor || "#6c5ce7").replace("#","");
    filters.push(
      `drawtext=text='${hookEscaped}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=64:fontcolor=white:shadowcolor=black:shadowx=3:shadowy=3:x=(w-text_w)/2:y=h*0.18:enable='lte(t,4)'`
    );
  }

  if (filters.length > 0) {
    ffArgs.push("-vf", filters.join(","));
  }

  ffArgs.push(
    "-c:v", "libx264", "-preset", "fast", "-crf", "22",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
    outPath
  );

  spawnSync("ffmpeg", ffArgs, { timeout: 120000, encoding: "utf8", stdio: ["ignore","pipe","pipe"] });

  // Cleanup
  try { if (existsSync(rawPath)) unlinkSync(rawPath); } catch {}
  try { if (existsSync(srtPath)) unlinkSync(srtPath); } catch {}

  return existsSync(outPath) ? outPath : null;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasFfmpeg()) {
    return NextResponse.json({ ok: false, error: "FFmpeg not installed on server" }, { status: 503 });
  }

  const { videoId, shorts, quality = "sd", burnCaptions = true, addHook = true } = await req.json();
  if (!videoId || !shorts?.length) {
    return NextResponse.json({ error: "videoId and shorts required" }, { status: 400 });
  }

  ensureTmp();
  const sessionDir = join(TMP, randomUUID().slice(0, 8));
  mkdirSync(sessionDir, { recursive: true });

  const videoUrl = await getVideoUrl(videoId, quality);
  if (!videoUrl) {
    return NextResponse.json({
      ok: false,
      error: "Could not get video URL. Install yt-dlp: pip install yt-dlp",
    }, { status: 422 });
  }

  // Process each clip
  const results: Array<{ id: string; path: string | null; title: string; error?: string }> = [];
  for (const short of shorts.slice(0, 10)) { // max 10 clips
    try {
      const path = await processClip(videoUrl, short, sessionDir, burnCaptions, addHook);
      results.push({ id: short.id, path, title: short.title });
    } catch (e) {
      results.push({ id: short.id, path: null, title: short.title, error: String(e) });
    }
  }

  const succeeded = results.filter(r => r.path !== null);

  if (succeeded.length === 0) {
    return NextResponse.json({ ok: false, error: "All clips failed to process" }, { status: 500 });
  }

  // Package as ZIP using system zip
  const zipPath = join(TMP, `viralcut_batch_${randomUUID().slice(0,6)}.zip`);
  const filePaths = succeeded.map(r => r.path!);

  try {
    spawnSync("zip", ["-j", zipPath, ...filePaths], { timeout: 60000, stdio: "ignore" });
  } catch {
    // Fallback: return first clip if zip fails
    if (succeeded[0]?.path) {
      const buf = readFileSync(succeeded[0].path);
      return new Response(buf, {
        headers: { "Content-Type": "video/mp4", "Content-Disposition": "attachment; filename=viralcut_short.mp4" }
      });
    }
  }

  // Cleanup individual files
  for (const r of succeeded) {
    try { if (r.path && existsSync(r.path)) unlinkSync(r.path); } catch {}
  }

  if (existsSync(zipPath)) {
    const buf = readFileSync(zipPath);
    try { unlinkSync(zipPath); } catch {}
    return new Response(buf, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(buf.length),
        "Content-Disposition": `attachment; filename="viralcut_${videoId}_${succeeded.length}clips.zip"`,
      }
    });
  }

  return NextResponse.json({
    ok: true,
    processed: succeeded.length,
    failed: results.filter(r => !r.path).length,
    results: results.map(r => ({ id: r.id, title: r.title, success: !!r.path })),
    message: "Batch processing complete",
  });
}

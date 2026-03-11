export const runtime = "nodejs";

/**
 * /api/ytproxy — YouTube video stream proxy (CORS-safe)
 *
 * This is the PRIMARY video loading mechanism.
 * Browser cannot draw cross-origin video to canvas → we proxy it via our own domain.
 *
 * Priority:
 * 1. yt-dlp (if installed) → get direct YouTube CDN URL → proxy it
 * 2. Invidious API → get stream URL → proxy it
 * 3. Invidious /latest_version fallback
 *
 * Usage:
 *   /api/ytproxy?videoId=xxx&itag=18          → 360p mp4
 *   /api/ytproxy?videoId=xxx&itag=22          → 720p mp4
 *   /api/ytproxy?url=https://...              → proxy arbitrary URL
 */
import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { INVIDIOUS_INSTANCES } from "@/lib/constants";
import { execSync } from "child_process";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Accept": "video/webm,video/mp4,video/*;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "identity",
  "Referer": "https://www.youtube.com/",
  "Origin": "https://www.youtube.com",
  "Sec-Fetch-Dest": "video",
  "Sec-Fetch-Mode": "no-cors",
  "Sec-Fetch-Site": "cross-site",
};

function hasYtDlp(): boolean {
  try {
    execSync("yt-dlp --version", { stdio: "ignore", timeout: 3000 });
    return true;
  } catch { return false; }
}

async function getYtDlpUrl(videoId: string, preferHd: boolean): Promise<string | null> {
  try {
    const fmt = preferHd
      ? "best[height<=720][ext=mp4]/bestvideo[height<=720]+bestaudio/best[height<=720]"
      : "worst[ext=mp4]/worst";
    const result = execSync(
      `yt-dlp --get-url -f "${fmt}" --no-playlist --no-warnings "https://www.youtube.com/watch?v=${videoId}"`,
      { timeout: 30000, encoding: "utf8" }
    );
    const lines = (result as string).trim().split("\n").filter(Boolean);
    return lines[0] || null;
  } catch { return null; }
}

async function getInvidiousUrl(videoId: string, itag: number): Promise<string | null> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(
        `${instance}/api/v1/videos/${videoId}?fields=formatStreams,adaptiveFormats`,
        { signal: AbortSignal.timeout(6000), headers: { Accept: "application/json" } }
      );
      if (!res.ok) continue;
      type Stream = { itag: number; url: string };
      const data = await res.json() as { formatStreams?: Stream[]; adaptiveFormats?: Stream[] };
      const all = [...(data.formatStreams || []), ...(data.adaptiveFormats || [])];
      const found = all.find(s => s.itag === itag);
      if (found?.url) return found.url;
      // Use latest_version endpoint
      return `${instance}/latest_version?id=${videoId}&itag=${itag}`;
    } catch { continue; }
  }
  // Last resort
  return `${INVIDIOUS_INSTANCES[0]}/latest_version?id=${videoId}&itag=${itag}`;
}

async function proxyStream(streamUrl: string, rangeHeader: string | null): Promise<Response> {
  const headers: Record<string, string> = { ...BROWSER_HEADERS };
  if (rangeHeader) headers["Range"] = rangeHeader;

  const upstream = await fetch(streamUrl, {
    headers,
    signal: AbortSignal.timeout(60000),
  });

  const responseHeaders: Record<string, string> = {
    "Content-Type": upstream.headers.get("content-type") || "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Range, Content-Type",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Cross-Origin-Embedder-Policy": "unsafe-none",
  };

  const contentLength = upstream.headers.get("content-length");
  const contentRange  = upstream.headers.get("content-range");
  const acceptRanges  = upstream.headers.get("accept-ranges");
  if (contentLength) responseHeaders["Content-Length"] = contentLength;
  if (contentRange)  responseHeaders["Content-Range"]  = contentRange;
  if (acceptRanges)  responseHeaders["Accept-Ranges"]  = acceptRanges;

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const videoId   = searchParams.get("videoId");
  const itag      = parseInt(searchParams.get("itag") || "18");
  const rawUrl    = searchParams.get("url");
  const preferHd  = searchParams.get("hd") === "1";

  let streamUrl: string | null = null;

  if (rawUrl) {
    streamUrl = rawUrl;
  } else if (videoId) {
    // 1. Try yt-dlp (best quality, direct CDN URL)
    if (hasYtDlp()) {
      streamUrl = await getYtDlpUrl(videoId, preferHd || itag === 22);
    }
    // 2. Fallback to Invidious
    if (!streamUrl) {
      streamUrl = await getInvidiousUrl(videoId, itag);
    }
  }

  if (!streamUrl) {
    return new Response(
      JSON.stringify({ error: "Could not resolve stream URL" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    return await proxyStream(streamUrl, req.headers.get("range"));
  } catch (firstErr) {
    // Retry with fallback Invidious instances
    if (videoId) {
      for (const inst of INVIDIOUS_INSTANCES.slice(1)) {
        try {
          const fallback = `${inst}/latest_version?id=${videoId}&itag=${itag}`;
          return await proxyStream(fallback, req.headers.get("range"));
        } catch { continue; }
      }
    }
    console.error("[ytproxy]", firstErr);
    return new Response(`Proxy error: ${String(firstErr)}`, { status: 502 });
  }
}

// Handle preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
    },
  });
}

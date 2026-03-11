export const runtime = "nodejs";

/**
 * /api/captions — Fetch YouTube captions server-side (avoids browser CORS)
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

interface Segment { start: number; dur: number; text: string; }

function parseXml(xml: string): Segment[] {
  const segs: Segment[] = [];
  const regex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(xml)) !== null) {
    const raw = m[3]
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, "").trim();
    if (raw) segs.push({ start: parseFloat(m[1]), dur: parseFloat(m[2]), text: raw });
  }
  return segs;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const videoId = new URL(req.url).searchParams.get("videoId");
  if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  };

  // Strategy 1: Direct timedtext endpoints
  const endpoints = [
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=xml`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=xml`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=xml`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(7000) });
      if (res.ok) {
        const text = await res.text();
        if (text.includes("<text")) {
          const segs = parseXml(text);
          if (segs.length > 3) return NextResponse.json({ ok: true, segments: segs, source: "timedtext" });
        }
      }
    } catch { continue; }
  }

  // Strategy 2: Parse YouTube page to extract caption track URL
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers, signal: AbortSignal.timeout(12000),
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      const captionMatch = html.match(/"captionTracks":\s*(\[[\s\S]*?\])/);
      if (captionMatch) {
        const tracks = JSON.parse(captionMatch[1]) as Array<{ baseUrl: string; languageCode: string; kind?: string }>;
        const enTrack = tracks.find(t => t.languageCode === "en" && t.kind === "asr")
          || tracks.find(t => t.languageCode === "en")
          || tracks.find(t => t.languageCode?.startsWith("en"))
          || tracks[0];
        if (enTrack?.baseUrl) {
          const capRes = await fetch(enTrack.baseUrl + "&fmt=xml", { headers, signal: AbortSignal.timeout(7000) });
          if (capRes.ok) {
            const capText = await capRes.text();
            const segs = parseXml(capText);
            if (segs.length > 0) return NextResponse.json({ ok: true, segments: segs, source: "page-extract" });
          }
        }
      }
    }
  } catch { /* fall through */ }

  return NextResponse.json({ ok: false, segments: [], message: "No captions found" });
}

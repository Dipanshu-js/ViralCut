export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { INVIDIOUS_INSTANCES } from "@/lib/constants";

interface InvidiousStream {
  url: string;
  itag: number;
  type: string;
  quality: string;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("videoId");
  if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

  const fields = "title,author,lengthSeconds,videoThumbnails,formatStreams,adaptiveFormats";

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${instance}/api/v1/videos/${videoId}?fields=${fields}`, {
        signal: AbortSignal.timeout(6000),
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) continue;
      const data = await res.json();

      const streams: InvidiousStream[] = [...(data.formatStreams || []), ...(data.adaptiveFormats || [])];

      const hd = streams.find((s: InvidiousStream) => s.itag === 22)?.url ||
                 `${instance}/latest_version?id=${videoId}&itag=22`;
      const sd = streams.find((s: InvidiousStream) => s.itag === 18)?.url ||
                 `${instance}/latest_version?id=${videoId}&itag=18`;
      const audio = streams.find((s: InvidiousStream) => s.itag === 140)?.url ||
                    `${instance}/latest_version?id=${videoId}&itag=140`;

      const fallbackLinks = INVIDIOUS_INSTANCES.map(inst => ({
        instance: inst,
        hd: `${inst}/latest_version?id=${videoId}&itag=22`,
        sd: `${inst}/latest_version?id=${videoId}&itag=18`,
        audio: `${inst}/latest_version?id=${videoId}&itag=140`,
      }));

      return NextResponse.json({
        ok: true,
        videoId,
        title: data.title,
        streams: { hd, sd, audio },
        instance,
        fallbackLinks,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      });
    } catch { /* try next instance */ }
  }

  // All instances failed — return fallback URLs
  const fallbackLinks = INVIDIOUS_INSTANCES.map(inst => ({
    instance: inst,
    hd: `${inst}/latest_version?id=${videoId}&itag=22`,
    sd: `${inst}/latest_version?id=${videoId}&itag=18`,
    audio: `${inst}/latest_version?id=${videoId}&itag=140`,
  }));

  return NextResponse.json({
    ok: true,
    videoId,
    streams: {
      hd: fallbackLinks[0].hd,
      sd: fallbackLinks[0].sd,
      audio: fallbackLinks[0].audio,
    },
    fallbackLinks,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    warning: "All Invidious instances unavailable — using fallback URLs",
  });
}

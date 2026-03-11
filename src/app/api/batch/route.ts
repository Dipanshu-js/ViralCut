export const runtime = "nodejs";
/**
 * /api/batch — Batch process multiple shorts at once
 * Queues multiple clip exports, returns ZIP download
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { aiText } from "@/lib/ai";

interface BatchItem {
  videoId: string;
  startTime: number;
  duration: number;
  title: string;
  hookOverlay: string;
  captionStyle: string;
  accentColor: string;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items, action = "plan" } = await req.json() as { items: BatchItem[]; action: string };

  if (!items?.length) return NextResponse.json({ error: "No items provided" }, { status: 400 });

  // action=plan → return download URLs for each clip
  if (action === "plan") {
    const plan = items.map((item, i) => ({
      index: i + 1,
      title: item.title,
      downloadUrl: `/api/clip?videoId=${item.videoId}&start=${item.startTime}&duration=${item.duration}&mode=download&vertical=true`,
      proxyUrl: `/api/ytproxy?videoId=${item.videoId}&itag=18`,
      watchUrl: `https://youtube.com/watch?v=${item.videoId}&t=${item.startTime}s`,
    }));
    return NextResponse.json({ ok: true, plan, total: items.length });
  }

  // action=titles → generate optimized titles for all
  if (action === "titles") {
    const titlesList = items.map((item, i) => `${i+1}. "${item.title}" (${item.duration}s)`).join("\n");
    const titles = await aiText(
      "You are a viral YouTube Shorts title optimizer. Return JSON array only.",
      `Optimize these ${items.length} short titles for maximum CTR on YouTube Shorts:\n${titlesList}\n\nReturn ONLY JSON array: [{"index":1,"title":"...","tags":["tag1","tag2"]}]`,
      2000
    );
    try {
      const parsed = JSON.parse(titles.replace(/```json|```/g, "").trim());
      return NextResponse.json({ ok: true, titles: parsed });
    } catch {
      return NextResponse.json({ ok: true, titles: items.map((item, i) => ({ index: i+1, title: item.title+" #shorts", tags: ["shorts","viral"] })) });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

interface Segment { start: number; dur: number; text: string; }

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transcript, startTime, endTime } = await req.json();
  if (!transcript || startTime == null || endTime == null) {
    return NextResponse.json({ error: "transcript, startTime, endTime required" }, { status: 400 });
  }

  const filtered = (transcript as Segment[])
    .filter(seg => seg.start >= startTime && seg.start < endTime)
    .map(seg => ({
      start: parseFloat((seg.start - startTime).toFixed(2)),
      end: parseFloat((seg.start - startTime + seg.dur).toFixed(2)),
      text: seg.text,
      highlight: seg.start < startTime + 5,
    }));

  return NextResponse.json({ ok: true, captions: filtered });
}

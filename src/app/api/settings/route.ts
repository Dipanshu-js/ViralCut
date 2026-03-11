export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ ok: true, settings });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const allowed = [
    "defaultTemplate","defaultCapStyle","defaultVoice","defaultPlatform","defaultStyle",
    "groqKeys","elevenLabsKey","youtubeApiKey","geminiKey","xaiKey","runwayKey",
    "pikaKey","lumaKey","pexelsKey","pixabayKey",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  // Validate types
  if (data.groqKeys && !Array.isArray(data.groqKeys)) delete data.groqKeys;

  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });
  return NextResponse.json({ ok: true, settings });
}

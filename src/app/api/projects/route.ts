export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      shorts: {
        select: { id: true, viralScore: true, title: true },
        orderBy: { viralScore: "desc" },
      },
      _count: { select: { shorts: true } },
    },
  });

  return NextResponse.json({ ok: true, projects });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, videoId, sourceUrl, thumbnail, duration, viewCount, channel } = await req.json();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const project = await prisma.project.create({
    data: { userId: user.id, title, videoId, sourceUrl, thumbnail, duration, viewCount, channel },
  });
  return NextResponse.json({ ok: true, project });
}

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Verify ownership
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.generatedClip.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}

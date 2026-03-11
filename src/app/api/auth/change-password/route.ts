export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getUser, comparePassword, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both fields required" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const valid = await comparePassword(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(newPassword) },
  });

  return NextResponse.json({ ok: true });
}

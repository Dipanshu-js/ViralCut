export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FREE_LIMIT = 1;

// GET — check current usage status
export async function GET() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isAdmin)
    return NextResponse.json({
      ok: true,
      limited: false,
      count: 0,
      limit: null,
    });

  const limited = user.usageCount >= FREE_LIMIT;
  return NextResponse.json({
    ok: true,
    limited,
    count: user.usageCount,
    limit: FREE_LIMIT,
  });
}

// POST — increment usage and return whether limit is now hit
export async function POST() {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isAdmin) return NextResponse.json({ ok: true, limited: false });

  if (user.usageCount >= FREE_LIMIT) {
    return NextResponse.json({
      ok: false,
      limited: true,
      count: user.usageCount,
      limit: FREE_LIMIT,
    });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { usageCount: { increment: 1 } },
  });

  const limited = updated.usageCount >= FREE_LIMIT;
  return NextResponse.json({
    ok: true,
    limited,
    count: updated.usageCount,
    limit: FREE_LIMIT,
  });
}

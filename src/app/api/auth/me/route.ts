export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getUser, COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user: { id: user.id, email: user.email, isAdmin: user.isAdmin } });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}

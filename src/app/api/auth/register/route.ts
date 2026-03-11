export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const user = await prisma.user.create({
      data: { email, password: await hashPassword(password), name: name || email.split("@")[0], isAdmin: false },
    });

    const token = signToken({ id: user.id, email: user.email, isAdmin: user.isAdmin });
    const cookie = setAuthCookie(token);
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, isAdmin: user.isAdmin } });
    res.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof res.cookies.set>[2]);
    return res;
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

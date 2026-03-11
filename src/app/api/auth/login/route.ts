export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, hashPassword, comparePassword, setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    // Auto-create admin on first login
    if (!user) {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPw = process.env.ADMIN_PASSWORD;
      if (email === adminEmail && password === adminPw) {
        user = await prisma.user.create({
          data: {
            email,
            password: await hashPassword(password),
            name: "Admin",
            isAdmin: true,
          },
        });
      } else {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
    } else {
      const valid = await comparePassword(password, user.password);
      if (!valid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
    }

    const token = signToken({ id: user.id, email: user.email, isAdmin: user.isAdmin });
    const cookie = setAuthCookie(token);

    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, isAdmin: user.isAdmin } });
    res.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof res.cookies.set>[2]);
    return res;
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE = "vc";
const SECRET = process.env.JWT_SECRET || "viralcut-dev-secret-change-in-prod-please";

export interface JwtPayload {
  id: string;
  email: string;
  isAdmin: boolean;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

export async function comparePassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function getUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE)?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    return user;
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string): { name: string; value: string; options: object } {
  return {
    name: COOKIE,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    },
  };
}

export const COOKIE_NAME = COOKIE;

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { aiJSON } from "@/lib/ai";
import { loadUserKeys } from "@/lib/userKeys";

interface HookItem {
  text: string;
  type: string;
  emoji: string;
  subtext: string;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await loadUserKeys(user.id);

  const { topic, style = "general", count = 8 } = await req.json();

  const system = `You are a viral hook writer for YouTube Shorts. Return ONLY a JSON array, no markdown, no explanation.`;
  const prompt = `Write ${count} viral hook text overlays for: "${topic}" (style: ${style})

Return ONLY this JSON array:
[{"text":"HOOK ALL CAPS MAX 5 WORDS","type":"shock|curiosity|value|secret|challenge|warning|emotional","emoji":"🔥","subtext":"short description max 8 words"}]`;

  try {
    const hooks = await aiJSON<HookItem[]>(system, prompt, 800);
    return NextResponse.json({ ok: true, hooks });
  } catch {
    // Fallback hooks
    const fallback: HookItem[] = [
      { text: "NOBODY TELLS YOU THIS", type: "secret", emoji: "🤫", subtext: "insider truth they keep hidden" },
      { text: "I TRIED IT FOR 30 DAYS", type: "challenge", emoji: "📅", subtext: "real experiment real results" },
      { text: "THIS CHANGED EVERYTHING", type: "transformation", emoji: "🔄", subtext: "life before vs after" },
      { text: "STOP DOING THIS NOW", type: "warning", emoji: "⚠️", subtext: "common mistake you make" },
      { text: "WATCH TILL THE END", type: "curiosity", emoji: "👀", subtext: "best part saved for last" },
      { text: "POV YOU FINALLY WIN", type: "emotional", emoji: "🏆", subtext: "relatable victory moment" },
      { text: "THE SECRET THEY HIDE", type: "conspiracy", emoji: "🕵️", subtext: "what experts wont tell you" },
      { text: "5 SECONDS CHANGES LIFE", type: "value", emoji: "⚡", subtext: "quick tip that works" },
    ];
    return NextResponse.json({ ok: true, hooks: fallback });
  }
}

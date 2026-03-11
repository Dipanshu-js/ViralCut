export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { loadUserKeys } from "@/lib/userKeys";
import { VOICES } from "@/lib/constants";

const SE_VOICES: Record<string, string> = {
  adam:   "Matthew",
  rachel: "Joanna",
  drew:   "Joey",
  bella:  "Salli",
  josh:   "Brian",
};

async function streamElementsTTS(text: string, voiceId: string): Promise<Buffer | null> {
  const sVoice = SE_VOICES[voiceId] || "Brian";
  const encoded = encodeURIComponent(text.slice(0, 500));
  try {
    const res = await fetch(
      `https://api.streamelements.com/kappa/v2/speech?voice=${sVoice}&text=${encoded}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
          "Referer": "https://streamelements.com",
        },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("audio") && !ct.includes("mpeg") && !ct.includes("octet-stream")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 1000 ? buf : null;
  } catch { return null; }
}

async function googleTTS(text: string): Promise<Buffer | null> {
  const encoded = encodeURIComponent(text.slice(0, 200));
  for (const url of [
    `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=en&client=tw-ob&ttsspeed=1`,
    `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=en-US&client=gtx&ttsspeed=0.9`,
  ]) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "audio/mpeg,audio/*;q=0.9", "Referer": "https://translate.google.com/" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("audio") || ct.includes("mpeg")) {
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length > 1000) return buf;
        }
      }
    } catch { continue; }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, voice: voiceId = "adam" } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });

  const voiceDef = VOICES.find(v => v.id === voiceId);
  if (!voiceDef) return NextResponse.json({ error: "Unknown voice" }, { status: 400 });

  const cleanText = text.trim().slice(0, 600);

  // Load user's keys (ElevenLabs from DB takes priority over env)
  const userKeys = await loadUserKeys(user.id);
  const elKey = userKeys.elevenLabsKey || process.env.ELEVENLABS_API_KEY;

  // 1. ElevenLabs (premium)
  if (elKey) {
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceDef.voiceId}`, {
        method: "POST",
        headers: { "xi-api-key": elKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
        body: JSON.stringify({ text: cleanText, model_id: "eleven_turbo_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        return NextResponse.json({ ok: true, audio: `data:audio/mpeg;base64,${buf.toString("base64")}`, provider: "elevenlabs", voice: voiceDef.name });
      }
    } catch { /* fall through */ }
  }

  // 2. StreamElements TTS (free, good quality)
  const seAudio = await streamElementsTTS(cleanText, voiceId);
  if (seAudio) {
    return NextResponse.json({
      ok: true,
      audio: `data:audio/mpeg;base64,${seAudio.toString("base64")}`,
      provider: "streamelements",
      voice: SE_VOICES[voiceId] || "Brian",
      note: "Free TTS via StreamElements.",
    });
  }

  // 3. Google TTS (free fallback)
  const gtAudio = await googleTTS(cleanText);
  if (gtAudio) {
    return NextResponse.json({
      ok: true,
      audio: `data:audio/mpeg;base64,${gtAudio.toString("base64")}`,
      provider: "google-tts",
    });
  }

  // 4. Browser speech synthesis
  return NextResponse.json({
    ok: true,
    useBrowserTTS: true,
    text: cleanText,
    provider: "browser",
  });
}

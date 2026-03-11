export const runtime = "nodejs";

/**
 * /api/transcribe — Whisper auto-transcription via Groq API
 * Groq provides free Whisper-large-v3 inference
 *
 * POST: { audioBase64?, mimeType?, videoId? }
 * Returns: { segments: [{start, dur, text}], text, language }
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { INVIDIOUS_INSTANCES } from "@/lib/constants";

interface WhisperSegment { start: number; end: number; text: string; }

async function fetchAudioViaInvidious(videoId: string): Promise<Buffer | null> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const audioUrl = `${instance}/latest_version?id=${videoId}&itag=140`;
      const res = await fetch(audioUrl, {
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (buf.byteLength > 1000) return Buffer.from(buf);
    } catch { continue; }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { audioBase64, mimeType = "audio/mp4", videoId } = await req.json();

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return NextResponse.json({ ok: false, error: "GROQ_API_KEY not set", fallback: true });
  }

  try {
    let audioBuffer: Buffer | null = null;

    // If videoId given, fetch audio via Invidious (no localhost dependency)
    if (videoId && !audioBase64) {
      audioBuffer = await fetchAudioViaInvidious(videoId);
      if (!audioBuffer) {
        return NextResponse.json({
          ok: false,
          error: "Could not fetch audio. Try uploading audio manually or use YouTube captions.",
          fallback: true,
        });
      }
    } else if (audioBase64) {
      audioBuffer = Buffer.from(audioBase64, "base64");
    }

    if (!audioBuffer) {
      return NextResponse.json({ ok: false, error: "No audio data provided" }, { status: 400 });
    }

    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: mimeType });
    formData.append("file", audioBlob, "audio.mp4");
    formData.append("model", "whisper-large-v3");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "segment");
    formData.append("language", "en");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}` },
      body: formData,
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ ok: false, error: `Whisper API error: ${err.slice(0, 200)}` }, { status: 500 });
    }

    const data = await res.json() as { text: string; language: string; segments?: WhisperSegment[] };

    const segments = (data.segments || []).map(s => ({
      start: s.start,
      dur: s.end - s.start,
      text: s.text.trim(),
    })).filter(s => s.text);

    return NextResponse.json({
      ok: true, text: data.text, language: data.language,
      segments, segmentCount: segments.length,
    });

  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

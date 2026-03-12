export const runtime = "nodejs";
/**
 * /api/music — Background music library
 * Returns curated free-to-use music tracks categorized by mood/style
 * Uses Pixabay Music API (free) + curated CDN fallbacks
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export const MUSIC_LIBRARY = [
  // Motivational / Upbeat
  {
    id: "m1",
    name: "Epic Rise",
    mood: "motivational",
    bpm: 128,
    duration: 180,
    style: "cinematic",
    url: "https://cdn.pixabay.com/audio/2023/06/19/audio_01c7f50aff.mp3",
    waveform: [0.3, 0.5, 0.7, 0.9, 1, 0.8, 0.6, 0.7, 0.9, 1, 0.8, 0.6],
  },
  {
    id: "m2",
    name: "Victory March",
    mood: "motivational",
    bpm: 120,
    duration: 165,
    style: "orchestral",
    url: "https://cdn.pixabay.com/audio/2022/11/22/audio_f37f765f9b.mp3",
    waveform: [0.4, 0.6, 0.8, 1, 0.7, 0.5, 0.8, 1, 0.6, 0.4, 0.7, 0.9],
  },
  {
    id: "m3",
    name: "Morning Drive",
    mood: "upbeat",
    bpm: 110,
    duration: 200,
    style: "pop",
    url: "https://cdn.pixabay.com/audio/2022/03/15/audio_8cb749fc9b.mp3",
    waveform: [0.5, 0.7, 0.6, 0.8, 1, 0.7, 0.5, 0.6, 0.8, 0.9, 0.7, 0.5],
  },
  // Calm / Study
  {
    id: "m4",
    name: "Deep Focus",
    mood: "calm",
    bpm: 75,
    duration: 240,
    style: "ambient",
    url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
    waveform: [0.2, 0.3, 0.4, 0.3, 0.2, 0.4, 0.5, 0.3, 0.2, 0.3, 0.4, 0.3],
  },
  {
    id: "m5",
    name: "Soft Piano",
    mood: "calm",
    bpm: 65,
    duration: 210,
    style: "piano",
    url: "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3",
    waveform: [0.3, 0.4, 0.2, 0.5, 0.4, 0.3, 0.5, 0.6, 0.4, 0.3, 0.4, 0.5],
  },
  // Dramatic / Cinematic
  {
    id: "m6",
    name: "Dark Tension",
    mood: "dramatic",
    bpm: 95,
    duration: 175,
    style: "cinematic",
    url: "https://cdn.pixabay.com/audio/2022/10/25/audio_8b7bda6cce.mp3",
    waveform: [0.6, 0.8, 1, 0.7, 0.5, 0.9, 1, 0.8, 0.6, 0.7, 1, 0.9],
  },
  {
    id: "m7",
    name: "Suspense Build",
    mood: "dramatic",
    bpm: 105,
    duration: 155,
    style: "cinematic",
    url: "https://cdn.pixabay.com/audio/2023/01/11/audio_8f3e0cd09c.mp3",
    waveform: [0.4, 0.5, 0.7, 0.9, 1, 0.8, 0.6, 0.8, 1, 0.9, 0.7, 0.5],
  },
  // Energetic / Gaming
  {
    id: "m8",
    name: "Pulse Wave",
    mood: "energetic",
    bpm: 140,
    duration: 145,
    style: "electronic",
    url: "https://cdn.pixabay.com/audio/2022/09/23/audio_15b6e9b90d.mp3",
    waveform: [0.7, 1, 0.8, 1, 0.9, 0.7, 1, 0.8, 0.9, 1, 0.8, 0.7],
  },
  {
    id: "m9",
    name: "Cyber Run",
    mood: "energetic",
    bpm: 135,
    duration: 160,
    style: "electronic",
    url: "https://cdn.pixabay.com/audio/2023/03/27/audio_c612e5c35a.mp3",
    waveform: [0.8, 0.9, 1, 0.8, 0.7, 1, 0.9, 0.8, 1, 0.9, 0.7, 0.8],
  },
  // Emotional / Storytelling
  {
    id: "m10",
    name: "Hopeful Journey",
    mood: "emotional",
    bpm: 85,
    duration: 195,
    style: "orchestral",
    url: "https://cdn.pixabay.com/audio/2022/08/04/audio_2dde668d05.mp3",
    waveform: [0.3, 0.5, 0.7, 0.8, 1, 0.9, 0.7, 0.5, 0.6, 0.8, 1, 0.8],
  },
  {
    id: "m11",
    name: "Nostalgic Memory",
    mood: "emotional",
    bpm: 72,
    duration: 185,
    style: "piano",
    url: "https://cdn.pixabay.com/audio/2021/11/25/audio_cb4f4c524e.mp3",
    waveform: [0.2, 0.4, 0.6, 0.8, 0.7, 0.5, 0.4, 0.6, 0.8, 0.9, 0.7, 0.5],
  },
  // Finance / Professional
  {
    id: "m12",
    name: "Corporate Edge",
    mood: "professional",
    bpm: 100,
    duration: 170,
    style: "corporate",
    url: "https://cdn.pixabay.com/audio/2022/10/30/audio_946b1c7498.mp3",
    waveform: [0.4, 0.5, 0.6, 0.5, 0.4, 0.5, 0.6, 0.7, 0.5, 0.4, 0.5, 0.6],
  },
];

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mood = searchParams.get("mood") || "";
  const style = searchParams.get("style") || "";

  let tracks = MUSIC_LIBRARY;
  if (mood) tracks = tracks.filter((t) => t.mood === mood || t.style === mood);
  if (style) tracks = tracks.filter((t) => t.style === style);

  const moods = Array.from(new Set(MUSIC_LIBRARY.map((t) => t.mood)));
  const styles = Array.from(new Set(MUSIC_LIBRARY.map((t) => t.style)));

  return NextResponse.json({
    ok: true,
    tracks,
    moods,
    styles,
    total: tracks.length,
  });
}

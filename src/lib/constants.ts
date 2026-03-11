export const TEMPLATES = [
  { id: "dark",   name: "Dark",   bg1: "#0d0f18", bg2: "#1a0a2e", acc: "#5b5bd6" },
  { id: "ocean",  name: "Ocean",  bg1: "#0c1445", bg2: "#0a2a4a", acc: "#06b6d4" },
  { id: "forest", name: "Forest", bg1: "#052e16", bg2: "#14532d", acc: "#10b981" },
  { id: "fire",   name: "Fire",   bg1: "#1c0a00", bg2: "#431407", acc: "#f97316" },
  { id: "gold",   name: "Gold",   bg1: "#1c1004", bg2: "#3b2000", acc: "#f59e0b" },
  { id: "cherry", name: "Cherry", bg1: "#200a0a", bg2: "#4c0519", acc: "#f43f5e" },
  { id: "cosmic", name: "Cosmic", bg1: "#0a0a1f", bg2: "#1e0533", acc: "#a78bfa" },
  { id: "steel",  name: "Steel",  bg1: "#0f172a", bg2: "#1e293b", acc: "#38bdf8" },
] as const;

export const CAP_STYLES = [
  { id: "bold",   name: "Bold" },
  { id: "neon",   name: "Neon" },
  { id: "boxed",  name: "Boxed" },
  { id: "yellow", name: "Yellow" },
  { id: "word",   name: "Word" },
] as const;

export const VOICES = [
  { id: "adam",   name: "Adam",   voiceId: "pNInz6obpgDQGcFmaJgB", emoji: "🎙️", desc: "Deep & authoritative" },
  { id: "rachel", name: "Rachel", voiceId: "21m00Tcm4TlvDq8ikWAM", emoji: "🎤", desc: "Warm & engaging" },
  { id: "drew",   name: "Drew",   voiceId: "29vD33N1osed6aR3HFq7", emoji: "🔊", desc: "Energetic & youthful" },
  { id: "bella",  name: "Bella",  voiceId: "EXAVITQu4vr4xnSDxMaL", emoji: "✨", desc: "Clear & professional" },
  { id: "josh",   name: "Josh",   voiceId: "TxGEqnHWrfWFTfGW9XjX", emoji: "💥", desc: "Bold & dynamic" },
] as const;

// Updated with more reliable public Invidious instances (Jan 2025)
export const INVIDIOUS_INSTANCES = [
  "https://invidious.nerdvpn.de",
  "https://invidious.privacyredirect.com",
  "https://inv.tux.pizza",
  "https://invidious.darkness.services",
  "https://yt.cdaut.de",
  "https://invidious.fdn.fr",
  "https://invidious.perennialte.ch",
  "https://iv.melmac.space",
];

export const VIDEO_STYLES = [
  { id: "motivational", label: "Motivational", emoji: "💪", desc: "Inspiring, high-energy" },
  { id: "educational",  label: "Educational",  emoji: "📚", desc: "Informative, clear" },
  { id: "storytelling", label: "Storytelling", emoji: "📖", desc: "Narrative, emotional" },
  { id: "cartoon",      label: "Cartoon",      emoji: "🎨", desc: "Animated, fun" },
  { id: "cinematic",    label: "Cinematic",    emoji: "🎬", desc: "Dramatic, film-like" },
  { id: "anime",        label: "Anime",        emoji: "✨", desc: "Anime style" },
] as const;

export const VIDEO_PLATFORMS = [
  { id: "shorts",  label: "YouTube Shorts", ratio: "9:16" },
  { id: "reels",   label: "Instagram Reels", ratio: "9:16" },
  { id: "tiktok",  label: "TikTok",          ratio: "9:16" },
  { id: "youtube", label: "YouTube",         ratio: "16:9" },
] as const;

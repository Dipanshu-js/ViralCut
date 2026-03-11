/**
 * AI Library — Multi-key Groq rotation + Gemini fallback
 * Supports: llama-3.3-70b-versatile, llama-3.1-8b-instant
 */
import Groq from "groq-sdk";

// ── Build key pool from env vars ─────────────────────────────────────────────
const ENV_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4,
].filter(Boolean) as string[];

const BASE_KEYS = ENV_KEYS.length > 0 ? ENV_KEYS : [];
let keyIndex = 0;

// Extra keys can be injected at runtime (from user DB settings)
let extraKeys: string[] = [];
export function setExtraGroqKeys(keys: string[]) {
  extraKeys = (keys || []).filter(k => typeof k === "string" && k.startsWith("gsk_"));
}

function getAllKeys(): string[] {
  const all = [...BASE_KEYS, ...extraKeys];
  return all.length > 0 ? all : [""];
}

function getGroqClient(): Groq {
  const keys = getAllKeys();
  return new Groq({ apiKey: keys[keyIndex % keys.length] });
}

function rotateKey(): void {
  const keys = getAllKeys();
  keyIndex = (keyIndex + 1) % keys.length;
}

// ── Core text generation with auto key rotation ───────────────────────────────
export async function aiText(
  system: string,
  user: string,
  maxTokens = 2000,
  model = "llama-3.3-70b-versatile"
): Promise<string> {
  const keys = getAllKeys();
  let lastErr: Error | null = null;

  for (let attempt = 0; attempt < Math.max(keys.length, 1); attempt++) {
    try {
      const groq = getGroqClient();
      const resp = await groq.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      return resp.choices[0]?.message?.content || "";
    } catch (err: unknown) {
      lastErr = err as Error;
      const msg = (err as Error).message || "";
      if (msg.includes("rate") || msg.includes("429") || msg.includes("401") || msg.includes("exceeded") || msg.includes("limit")) {
        rotateKey();
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      throw err;
    }
  }

  // All Groq keys exhausted → try Gemini fallback
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try { return await geminiText(system, user, maxTokens, geminiKey); } catch {}
  }

  throw lastErr || new Error("All AI providers failed");
}

// ── Gemini fallback ───────────────────────────────────────────────────────────
async function geminiText(system: string, user: string, maxTokens: number, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ── Fast model for short tasks ─────────────────────────────────────────────────
export async function aiTextFast(system: string, user: string, maxTokens = 1000): Promise<string> {
  return aiText(system, user, maxTokens, "llama-3.1-8b-instant");
}

// ── JSON generation ─────────────────────────────────────────────────────────
export async function aiJSON<T>(system: string, user: string, maxTokens = 3000): Promise<T> {
  const raw = await aiText(system, user, maxTokens);
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = cleaned.indexOf("[") !== -1 && (cleaned.indexOf("[") < cleaned.indexOf("{") || cleaned.indexOf("{") === -1) ? "[" : "{";
  const end = start === "[" ? "]" : "}";
  const si = cleaned.indexOf(start);
  const ei = cleaned.lastIndexOf(end);
  if (si === -1 || ei === -1) throw new Error("No JSON in response");
  return JSON.parse(cleaned.slice(si, ei + 1)) as T;
}

// ── Script Generator ──────────────────────────────────────────────────────────
export interface SceneData {
  index: number; title: string; narration: string; visual_prompt: string;
  style: string; duration: number; mood: string; camera: string;
}

export async function generateScript(opts: {
  topic: string; style?: string; duration?: number; platform?: string;
  tone?: string; sceneCount?: number;
}): Promise<{ script: string; title: string; hook: string; scenes: SceneData[] }> {
  const { topic, style = "motivational", duration = 60, platform = "shorts", tone = "engaging", sceneCount = 4 } = opts;
  const system = `You are a viral ${platform} scriptwriter. Return ONLY valid JSON, no markdown.`;
  const prompt = `Create a ${duration}s ${style} ${platform} script about: "${topic}"
Tone: ${tone} | Scenes: ${sceneCount}

Return ONLY this JSON (no other text):
{
  "title": "Viral title max 8 words",
  "hook": "First 3 seconds hook sentence",
  "script": "Full narration script",
  "scenes": [{"index":1,"title":"Scene name","narration":"25 words","visual_prompt":"60-word cinematic scene description","style":"${style}","duration":${Math.floor(duration/sceneCount)},"mood":"energetic","camera":"close-up"}]
}`;
  return aiJSON<{ script: string; title: string; hook: string; scenes: SceneData[] }>(system, prompt, 3000);
}

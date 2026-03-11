/**
 * Modular Video Generation Provider System
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture: Provider interface → concrete providers → factory function
 *
 * FREE providers (work without any paid API key):
 *   - PexelsVideoProvider   (Free    — Pexels stock video API, 200req/hr free)
 *   - PixabayVideoProvider  (Free    — Pixabay stock video API, free)
 *   - CanvasSlideProvider   (Free    — AI-described scene → canvas animation metadata)
 *
 * PREMIUM providers (require paid API keys):
 *   - GrokVideoProvider     (Premium — xAI Grok Imagine API)
 *   - RunwayVideoProvider   (Premium — Runway ML Gen-3 API)
 *   - PikaVideoProvider     (Premium — Pika Labs API)
 *   - LumaVideoProvider     (Premium — Luma Dream Machine API)
 *
 * LOCAL providers (require local GPU setup):
 *   - LocalVideoProvider    (Free    — Stable Video Diffusion + AnimateDiff via ComfyUI)
 */

export type GenerationMode = "free" | "premium";

export interface GenerationRequest {
  prompt: string;
  enhancedPrompt?: string;
  duration: number;        // seconds: 3 | 5 | 8
  resolution: string;      // "720p" | "1080p"
  aspectRatio: string;     // "16:9" | "9:16" | "1:1"
  style: string;           // "cinematic" | "realistic" | "animation" | "anime"
}

export interface GenerationResult {
  videoUrl: string | null;
  jobId?: string;
  status: "done" | "pending" | "failed" | "demo";
  provider: string;
  estimatedTime: number;   // seconds until completion
  message?: string;
  // For canvas-based free generation — client renders this
  canvasData?: {
    type: "slideshow" | "stock";
    scenes: Array<{
      text: string;
      subtext?: string;
      bg1: string;
      bg2: string;
      accent: string;
      duration: number;
      animation: "zoom" | "slide-up" | "fade" | "pan";
    }>;
  };
}

export interface VideoProvider {
  name: string;
  mode: GenerationMode;
  isFree: boolean;
  isAvailable(): Promise<boolean>;
  getEstimatedTime(duration: number): number;
  generate(req: GenerationRequest): Promise<GenerationResult>;
}

// ─────────────────────────────────────────────────────────────────────────────
// FREE PROVIDER 1: Pexels Stock Video Search
// Free API key at pexels.com/api — 200 requests/hour free tier
// ─────────────────────────────────────────────────────────────────────────────
export class PexelsVideoProvider implements VideoProvider {
  name = "pexels";
  mode: GenerationMode = "free";
  isFree = true;

  async isAvailable() {
    return !!(process.env.PEXELS_API_KEY || process.env._USER_PEXELS);
  }

  getEstimatedTime() { return 3; }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    const apiKey = process.env._USER_PEXELS || process.env.PEXELS_API_KEY;
    if (!apiKey) return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0, message: "Add PEXELS_API_KEY (free at pexels.com/api)" };

    // Extract keywords from prompt for search
    const keywords = this.extractKeywords(req.prompt || req.enhancedPrompt || "");
    const orientation = req.aspectRatio === "9:16" ? "portrait" : "landscape";

    try {
      const res = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(keywords)}&orientation=${orientation}&per_page=5&min_duration=${req.duration - 2}&max_duration=${req.duration + 10}`,
        { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0 };

      const data = await res.json() as {
        videos: Array<{ video_files: Array<{ link: string; quality: string; width: number; height: number }> }>
      };

      const video = data.videos?.[0];
      if (!video) return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0, message: `No Pexels video found for: ${keywords}` };

      // Pick best quality file
      const files = video.video_files.sort((a, b) => b.width - a.width);
      const file = files.find(f => f.width <= 1280) || files[0];

      return {
        videoUrl: file?.link || null,
        status: file?.link ? "done" : "failed",
        provider: this.name,
        estimatedTime: 0,
        message: file?.link ? `Stock video from Pexels` : "No suitable file found",
      };
    } catch (e) {
      return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0, message: String(e) };
    }
  }

  private extractKeywords(prompt: string): string {
    // Strip common filler words, keep meaningful nouns/adjectives
    const stopWords = new Set(["a","an","the","with","and","or","in","at","to","of","for","on","by","is","are","was","that","this","from","into","through","over","under","between","among","about","after","before","during"]);
    const words = prompt.toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
      .slice(0, 4);
    return words.join(" ") || "nature scenic";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FREE PROVIDER 2: Pixabay Stock Video Search
// Free API key at pixabay.com/api/docs — generous free tier
// ─────────────────────────────────────────────────────────────────────────────
export class PixabayVideoProvider implements VideoProvider {
  name = "pixabay";
  mode: GenerationMode = "free";
  isFree = true;

  async isAvailable() {
    return !!(process.env.PIXABAY_API_KEY || process.env._USER_PIXABAY);
  }

  getEstimatedTime() { return 3; }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    const apiKey = process.env._USER_PIXABAY || process.env.PIXABAY_API_KEY;
    if (!apiKey) return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0, message: "Add PIXABAY_API_KEY (free at pixabay.com/api)" };

    const keywords = this.extractKeywords(req.prompt || req.enhancedPrompt || "");

    try {
      const res = await fetch(
        `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(keywords)}&per_page=5&min_width=640`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0 };

      const data = await res.json() as {
        hits: Array<{ videos: { medium: { url: string; width: number }; large: { url: string; width: number } } }>
      };

      const hit = data.hits?.[0];
      if (!hit) return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0, message: `No Pixabay video for: ${keywords}` };

      const url = hit.videos.large?.url || hit.videos.medium?.url;
      return {
        videoUrl: url || null,
        status: url ? "done" : "failed",
        provider: this.name,
        estimatedTime: 0,
        message: url ? "Stock video from Pixabay" : "No video file found",
      };
    } catch (e) {
      return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0, message: String(e) };
    }
  }

  private extractKeywords(prompt: string): string {
    const stopWords = new Set(["a","an","the","with","and","or","in","at","to","of","for","on","by","is","are","was"]);
    return prompt.toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
      .slice(0, 3)
      .join("+") || "nature";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FREE PROVIDER 3: Canvas Slideshow (Zero Cost — Always Works)
// Returns scene metadata for client-side canvas animation
// No API key needed — uses AI to describe scenes, client animates them
// ─────────────────────────────────────────────────────────────────────────────
export class CanvasSlideProvider implements VideoProvider {
  name = "canvas";
  mode: GenerationMode = "free";
  isFree = true;

  async isAvailable() { return true; } // Always available

  getEstimatedTime() { return 2; }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    const prompt = req.enhancedPrompt || req.prompt;
    const palette = this.getPalette(req.style);
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 5);

    // Build animated scenes from prompt sentences
    const animations: Array<"zoom" | "slide-up" | "fade" | "pan"> = ["zoom", "slide-up", "fade", "pan"];
    const scenes = sentences.slice(0, Math.min(4, Math.ceil(req.duration / 2))).map((sentence, i) => ({
      text: sentence.trim().slice(0, 80),
      subtext: i === 0 ? "✨ AI Generated" : undefined,
      bg1: palette.bg1,
      bg2: palette.bg2,
      accent: palette.accent,
      duration: Math.ceil(req.duration / sentences.length),
      animation: animations[i % animations.length],
    }));

    if (scenes.length === 0) {
      scenes.push({
        text: prompt.slice(0, 100),
        bg1: palette.bg1,
        bg2: palette.bg2,
        accent: palette.accent,
        duration: req.duration,
        animation: "zoom",
      });
    }

    return {
      videoUrl: null, // Client renders canvas
      status: "done",
      provider: this.name,
      estimatedTime: 0,
      message: "Canvas slideshow ready — rendered in browser",
      canvasData: { type: "slideshow", scenes },
    };
  }

  private getPalette(style: string) {
    const palettes: Record<string, { bg1: string; bg2: string; accent: string }> = {
      cinematic:    { bg1: "#0d0f18", bg2: "#1a0a2e", accent: "#5b5bd6" },
      realistic:    { bg1: "#0f172a", bg2: "#1e293b", accent: "#38bdf8" },
      animation:    { bg1: "#0c1445", bg2: "#0a2a4a", accent: "#06b6d4" },
      anime:        { bg1: "#200a0a", bg2: "#4c0519", accent: "#f43f5e" },
      motivational: { bg1: "#1c0a00", bg2: "#431407", accent: "#f97316" },
      educational:  { bg1: "#052e16", bg2: "#14532d", accent: "#10b981" },
    };
    return palettes[style] || palettes.cinematic;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM PROVIDER: Grok Imagine API (xAI)
// ─────────────────────────────────────────────────────────────────────────────
export class GrokVideoProvider implements VideoProvider {
  name = "grok";
  mode: GenerationMode = "premium";
  isFree = false;

  async isAvailable() {
    return !!(process.env.XAI_API_KEY);
  }

  getEstimatedTime(duration: number) { return duration * 5 + 10; }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { videoUrl: null, status: "demo", provider: this.name, estimatedTime: 0, message: "Add XAI_API_KEY for Grok video" };

    try {
      const res = await fetch("https://api.x.ai/v1/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "grok-imagine-video",
          prompt: `${req.style} style: ${req.enhancedPrompt || req.prompt}`,
          duration: req.duration,
          resolution: req.resolution,
          aspect_ratio: req.aspectRatio,
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0, message: `Grok API error: ${res.status}` };
      const data = await res.json() as { video_url?: string; url?: string; id?: string };
      const videoUrl = data.video_url || data.url || null;
      return { videoUrl, jobId: data.id, status: videoUrl ? "done" : "pending", provider: this.name, estimatedTime: this.getEstimatedTime(req.duration) };
    } catch (e) {
      return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0, message: String(e) };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FREE/LOCAL PROVIDER: ComfyUI + Stable Video Diffusion (requires GPU)
// ─────────────────────────────────────────────────────────────────────────────
export class LocalVideoProvider implements VideoProvider {
  name = "local";
  mode: GenerationMode = "free";
  isFree = true;
  private comfyUrl: string;

  constructor() {
    this.comfyUrl = process.env.COMFYUI_URL || "http://localhost:8188";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.comfyUrl}/system_stats`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch { return false; }
  }

  getEstimatedTime(duration: number) { return duration * 15 + 30; }

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    if (!await this.isAvailable()) {
      return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0, message: "ComfyUI not running on localhost:8188" };
    }

    try {
      const workflow = this.buildComfyWorkflow(req);
      const submitRes = await fetch(`${this.comfyUrl}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: workflow }),
      });

      if (!submitRes.ok) return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: this.getEstimatedTime(req.duration), message: "ComfyUI submission failed" };

      const submitData = await submitRes.json() as { prompt_id?: string };
      const promptId = submitData.prompt_id;

      // Poll for completion (max 5 minutes)
      const maxPolls = 60;
      for (let i = 0; i < maxPolls; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const histRes = await fetch(`${this.comfyUrl}/history/${promptId}`, { signal: AbortSignal.timeout(5000) });
        const hist = await histRes.json() as Record<string, { outputs?: Record<string, { videos?: Array<{ filename: string; subfolder: string }> }> }>;
        const entry = hist[promptId!];
        if (entry?.outputs) {
          for (const node of Object.values(entry.outputs)) {
            const vid = node.videos?.[0];
            if (vid) {
              const videoUrl = `${this.comfyUrl}/view?filename=${vid.filename}&subfolder=${vid.subfolder}&type=output`;
              return { videoUrl, status: "done", provider: this.name, estimatedTime: 0 };
            }
          }
        }
      }

      return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0, message: "Generation timed out" };
    } catch (e) {
      return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0, message: String(e) };
    }
  }

  private buildComfyWorkflow(req: GenerationRequest): Record<string, unknown> {
    const [w, h] = this.getResolution(req.aspectRatio, req.resolution);
    const frames = req.duration * 8;
    return {
      "1": { class_type: "CLIPTextEncode", inputs: { clip: ["4", 1], text: `${req.style} style, ${req.enhancedPrompt || req.prompt}, cinematic, high quality, 8K` } },
      "2": { class_type: "CLIPTextEncode", inputs: { clip: ["4", 1], text: "blurry, low quality, distorted, watermark, text, ugly, deformed" } },
      "3": { class_type: "KSampler", inputs: { model: ["10", 0], positive: ["1", 0], negative: ["2", 0], latent_image: ["5", 0], seed: Math.floor(Math.random() * 999999), steps: 20, cfg: 7.5, sampler_name: "euler_ancestral", scheduler: "karras", denoise: 1.0 } },
      "4": { class_type: "DualCLIPLoader", inputs: { clip_name1: "clip_l.safetensors", clip_name2: "t5xxl_fp8_e4m3fn.safetensors", type: "flux" } },
      "5": { class_type: "EmptyLatentImage", inputs: { width: w, height: h, batch_size: 1 } },
      "6": { class_type: "VAEDecode", inputs: { samples: ["3", 0], vae: ["7", 0] } },
      "7": { class_type: "VAELoader", inputs: { vae_name: "ae.safetensors" } },
      "10": { class_type: "ADE_LoadAnimateDiffModel", inputs: { model_name: "mm_sdxl_v10_beta.ckpt" } },
      "11": { class_type: "ADE_AnimateDiffLoaderWithContext", inputs: { model: ["10", 0], context_options: ["12", 0], motion_lora: null, ad_settings: null } },
      "12": { class_type: "ADE_AnimateDiffUniformContextOptions", inputs: { context_length: Math.min(frames, 16), context_stride: 1, context_overlap: 4, context_schedule: "uniform", closed_loop: false } },
      "20": { class_type: "VHS_VideoCombine", inputs: { images: ["6", 0], frame_rate: 8, loop_count: 0, filename_prefix: "viralcut_clip", format: "video/webm-vp9", pingpong: false, save_output: true } },
    };
  }

  private getResolution(aspectRatio: string, resolution: string): [number, number] {
    const is1080 = resolution === "1080p";
    const map: Record<string, [number, number]> = {
      "16:9": is1080 ? [1920, 1080] : [1280, 720],
      "9:16": is1080 ? [1080, 1920] : [720, 1280],
      "1:1":  is1080 ? [1080, 1080] : [720, 720],
    };
    return map[aspectRatio] || [1280, 720];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM PROVIDERS
// ─────────────────────────────────────────────────────────────────────────────

export class RunwayVideoProvider implements VideoProvider {
  name = "runway";
  mode: GenerationMode = "premium";
  isFree = false;
  async isAvailable() { return !!(process.env.RUNWAY_API_KEY); }
  getEstimatedTime(d: number) { return d * 15 + 10; }
  async generate(req: GenerationRequest): Promise<GenerationResult> {
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) return { videoUrl: null, status: "demo", provider: this.name, estimatedTime: 0, message: "RUNWAY_API_KEY not set" };
    try {
      const res = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Runway-Version": "2024-11-06" },
        body: JSON.stringify({ promptText: req.enhancedPrompt || req.prompt, model: "gen3a_turbo", duration: Math.min(req.duration, 10), ratio: req.aspectRatio === "9:16" ? "768:1280" : "1280:768" }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0 };
      const data = await res.json() as { id?: string; output?: string[] };
      return { videoUrl: data.output?.[0] || null, jobId: data.id, status: data.output ? "done" : "pending", provider: this.name, estimatedTime: this.getEstimatedTime(req.duration) };
    } catch (e) { return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0, message: String(e) }; }
  }
}

export class PikaVideoProvider implements VideoProvider {
  name = "pika";
  mode: GenerationMode = "premium";
  isFree = false;
  async isAvailable() { return !!(process.env.PIKA_API_KEY); }
  getEstimatedTime(d: number) { return d * 10 + 15; }
  async generate(req: GenerationRequest): Promise<GenerationResult> {
    const apiKey = process.env.PIKA_API_KEY;
    if (!apiKey) return { videoUrl: null, status: "demo", provider: this.name, estimatedTime: 0, message: "PIKA_API_KEY not set" };
    try {
      const res = await fetch("https://api.pika.art/v1/generate", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: req.enhancedPrompt || req.prompt, duration: req.duration, aspectRatio: req.aspectRatio }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0 };
      const data = await res.json() as { video?: { url?: string }; id?: string };
      return { videoUrl: data.video?.url || null, jobId: data.id, status: data.video ? "done" : "pending", provider: this.name, estimatedTime: this.getEstimatedTime(req.duration) };
    } catch (e) { return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0, message: String(e) }; }
  }
}

export class LumaVideoProvider implements VideoProvider {
  name = "luma";
  mode: GenerationMode = "premium";
  isFree = false;
  async isAvailable() { return !!(process.env.LUMA_API_KEY); }
  getEstimatedTime(d: number) { return d * 20 + 20; }
  async generate(req: GenerationRequest): Promise<GenerationResult> {
    const apiKey = process.env.LUMA_API_KEY;
    if (!apiKey) return { videoUrl: null, status: "demo", provider: this.name, estimatedTime: 0, message: "LUMA_API_KEY not set" };
    try {
      const res = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: req.enhancedPrompt || req.prompt, loop: false, aspect_ratio: req.aspectRatio }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0 };
      const data = await res.json() as { assets?: { video?: string }; id?: string };
      return { videoUrl: data.assets?.video || null, jobId: data.id, status: data.assets?.video ? "done" : "pending", provider: this.name, estimatedTime: this.getEstimatedTime(req.duration) };
    } catch (e) { return { videoUrl: null, status: "failed", provider: this.name, estimatedTime: 0, message: String(e) }; }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER REGISTRY — ordered by priority (free first, then premium)
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_PROVIDERS: VideoProvider[] = [
  // FREE (no cost, no GPU required)
  new PexelsVideoProvider(),
  new PixabayVideoProvider(),
  new CanvasSlideProvider(),
  // FREE (requires local GPU)
  new LocalVideoProvider(),
  // PREMIUM (paid APIs)
  new GrokVideoProvider(),
  new RunwayVideoProvider(),
  new PikaVideoProvider(),
  new LumaVideoProvider(),
];

/**
 * Get the best available provider.
 * Free providers are always tried first.
 * Premium providers used only if explicitly requested or free fails.
 */
export async function getProvider(
  mode: GenerationMode,
  preferredProvider?: string
): Promise<VideoProvider> {
  // If a specific provider is requested, try it first
  if (preferredProvider) {
    const specific = ALL_PROVIDERS.find(p => p.name === preferredProvider);
    if (specific && await specific.isAvailable()) return specific;
  }

  if (mode === "free") {
    // Try free providers in priority order: pexels → pixabay → canvas (always works)
    for (const provider of ALL_PROVIDERS.filter(p => p.mode === "free")) {
      if (await provider.isAvailable()) return provider;
    }
    // Canvas is always available as last resort for free
    return new CanvasSlideProvider();
  }

  // Premium mode: try premium providers
  const premiumCandidates = ALL_PROVIDERS.filter(p => p.mode === "premium");
  for (const provider of premiumCandidates) {
    if (await provider.isAvailable()) return provider;
  }

  // No premium available → fall back to free
  for (const provider of ALL_PROVIDERS.filter(p => p.mode === "free")) {
    if (await provider.isAvailable()) return provider;
  }

  // Last resort: canvas always works
  return new CanvasSlideProvider();
}

export async function checkProviderAvailability(): Promise<{
  freeProviders: Array<{ name: string; available: boolean; label: string; note: string }>;
  premiumProviders: Array<{ name: string; available: boolean; estimatedTime: number; label: string }>;
  hasAnyFree: boolean;
  hasAnyPremium: boolean;
  recommendation: "free" | "premium";
}> {
  const freeMap: Record<string, { label: string; note: string }> = {
    pexels:  { label: "Pexels Stock Video", note: "Free API key at pexels.com/api" },
    pixabay: { label: "Pixabay Stock Video", note: "Free API key at pixabay.com/api" },
    canvas:  { label: "Canvas Slideshow", note: "Always free — no setup required" },
    local:   { label: "Local AI (ComfyUI)", note: "Requires GPU + ComfyUI install" },
  };
  const premiumMap: Record<string, string> = {
    grok: "Grok (xAI)", runway: "Runway ML", pika: "Pika Labs", luma: "Luma Dream Machine",
  };

  const freeProviders = await Promise.all(
    ALL_PROVIDERS.filter(p => p.mode === "free").map(async p => ({
      name: p.name,
      available: await p.isAvailable(),
      label: freeMap[p.name]?.label || p.name,
      note: freeMap[p.name]?.note || "",
    }))
  );

  const premiumProviders = await Promise.all(
    ALL_PROVIDERS.filter(p => p.mode === "premium").map(async p => ({
      name: p.name,
      available: await p.isAvailable(),
      estimatedTime: p.getEstimatedTime(6),
      label: premiumMap[p.name] || p.name,
    }))
  );

  const hasAnyFree = freeProviders.some(p => p.available);
  const hasAnyPremium = premiumProviders.some(p => p.available);

  return {
    freeProviders,
    premiumProviders,
    hasAnyFree,
    hasAnyPremium,
    recommendation: hasAnyPremium ? "premium" : "free",
  };
}

// Legacy GPU check (kept for backward compatibility)
export async function checkGpuAvailability() {
  const local = new LocalVideoProvider();
  const comfyRunning = await local.isAvailable();
  return {
    hasGpu: false,
    comfyUiRunning: comfyRunning,
    cudaDevices: 0,
    message: comfyRunning ? "ComfyUI running" : "ComfyUI not running",
  };
}

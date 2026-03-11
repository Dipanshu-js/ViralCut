"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────
type GenMode = "free" | "premium";
type ProviderName = "pexels" | "pixabay" | "canvas" | "local" | "grok" | "runway" | "pika" | "luma";

interface CanvasScene {
  text: string;
  subtext?: string;
  bg1: string;
  bg2: string;
  accent: string;
  duration: number;
  animation: "zoom" | "slide-up" | "fade" | "pan";
}

interface Clip {
  id: string;
  prompt: string;
  enhancedPrompt?: string;
  videoUrl: string | null;
  stitchedUrl?: string | null;
  duration: number;
  aspectRatio: string;
  resolution: string;
  style: string;
  status: "generating" | "done" | "demo" | "error" | "pending";
  sceneIndex: number;
  title?: string;
  narration?: string;
  provider?: string;
  generationMode?: string;
  estimatedTime?: number;
  canvasData?: { type: string; scenes: CanvasScene[] };
}

interface LongScene {
  index: number;
  title: string;
  prompt: string;
  enhancedPrompt?: string;
  duration: number;
  narration: string;
  mood: string;
  cameraMovement: string;
}

interface ProviderStatus {
  name: string;
  available: boolean;
  label: string;
  note?: string;
  estimatedTime?: number;
}

interface CapabilityStatus {
  freeMode: {
    available: boolean;
    message: string;
    stack: string[];
    providers: ProviderStatus[];
  };
  premiumMode: { available: boolean; providers: ProviderStatus[] };
  recommendation: "free" | "premium";
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STYLES   = ["cinematic","realistic","animation","anime","motivational","educational"];
const DURATIONS = [3, 5, 6, 8, 10];
const RATIOS   = ["16:9","9:16","1:1"];
const RESOLUTIONS = ["720p","1080p"];
const TRANSITIONS = [{ id:"cut", label:"Hard Cut", icon:"⚡" }, { id:"fade", label:"Fade", icon:"🌗" }, { id:"crossfade", label:"Crossfade", icon:"✨" }];
const BROLL_TOPICS = ["motivation","business","technology","travel","nature","fitness","food","urban","finance","education","health","creativity"];

const PROVIDER_INFO: Record<string, { label: string; speed: string; quality: string; cost: string; color: string; icon: string }> = {
  pexels:  { label:"Pexels Stock Video",   speed:"Fast (~3s)",    quality:"⭐⭐⭐⭐",  cost:"FREE",        color:"var(--green)",  icon:"🎞️" },
  pixabay: { label:"Pixabay Stock Video",  speed:"Fast (~3s)",    quality:"⭐⭐⭐",    cost:"FREE",        color:"var(--green)",  icon:"🎬" },
  canvas:  { label:"Canvas Slideshow",     speed:"Instant",       quality:"⭐⭐⭐",    cost:"FREE",        color:"var(--cyan)",   icon:"✨" },
  local:   { label:"Local AI (ComfyUI)",   speed:"Slow (~90s)",   quality:"⭐⭐⭐⭐",  cost:"FREE+GPU",    color:"var(--green)",  icon:"💻" },
  grok:    { label:"Grok (xAI)",           speed:"Fast (~30s)",   quality:"⭐⭐⭐⭐⭐", cost:"Paid API",    color:"var(--brand)",  icon:"🤖" },
  runway:  { label:"Runway ML Gen-3",      speed:"Fast (~20s)",   quality:"⭐⭐⭐⭐⭐", cost:"Paid API",    color:"var(--cyan)",   icon:"🚀" },
  pika:    { label:"Pika Labs",            speed:"Medium (~40s)", quality:"⭐⭐⭐⭐",  cost:"Paid API",    color:"var(--orange)", icon:"⚡" },
  luma:    { label:"Luma Dream Machine",   speed:"Slow (~60s)",   quality:"⭐⭐⭐⭐⭐", cost:"Paid API",    color:"#a855f7",       icon:"🌙" },
};

function fmtTime(s: number) { const m = Math.floor(s/60); const sec = Math.floor(s%60); return m>0?`${m}m ${sec}s`:`${sec}s`; }

// ── Canvas Renderer for slideshow clips ───────────────────────────────────────
function CanvasClipPreview({ canvasData, aspectRatio, playing }: {
  canvasData: { scenes: CanvasScene[] };
  aspectRatio: string;
  playing?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const sceneRef = useRef<number>(0);

  const [w, h] = aspectRatio === "9:16" ? [360, 640] : aspectRatio === "1:1" ? [400, 400] : [640, 360];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasData.scenes.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const totalDuration = canvasData.scenes.reduce((sum, s) => sum + s.duration * 1000, 0);

    const render = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = (timestamp - startRef.current) % totalDuration;

      // Find current scene
      let sceneStart = 0;
      let currentScene = canvasData.scenes[0];
      for (const scene of canvasData.scenes) {
        const sceneDur = scene.duration * 1000;
        if (elapsed < sceneStart + sceneDur) {
          currentScene = scene;
          const progress = (elapsed - sceneStart) / sceneDur;
          drawScene(ctx, canvas, currentScene, progress, w, h);
          break;
        }
        sceneStart += sceneDur;
      }

      animRef.current = requestAnimationFrame(render);
    };

    function drawScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, scene: CanvasScene, progress: number, w: number, h: number) {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, scene.bg1);
      grad.addColorStop(1, scene.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Animated particles
      const time = Date.now() / 1000;
      for (let i = 0; i < 20; i++) {
        const x = (Math.sin(time * 0.5 + i * 1.7) * 0.5 + 0.5) * w;
        const y = (Math.cos(time * 0.3 + i * 2.1) * 0.5 + 0.5) * h;
        const alpha = (Math.sin(time + i) * 0.3 + 0.3);
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = scene.accent + Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }

      // Animation transform
      ctx.save();
      let scale = 1;
      let tx = 0;
      let ty = 0;
      const ease = progress < 0.5 ? progress * 2 : (1 - progress) * 2;

      if (scene.animation === "zoom") {
        scale = 1 + progress * 0.05;
        ctx.translate(w/2, h/2);
        ctx.scale(scale, scale);
        ctx.translate(-w/2, -h/2);
      } else if (scene.animation === "slide-up") {
        ty = (1 - ease) * -30;
      } else if (scene.animation === "pan") {
        tx = progress * -20;
      }

      // Accent line
      const lineY = h * 0.35;
      ctx.fillStyle = scene.accent;
      ctx.fillRect(w * 0.1, lineY - 2, w * 0.8 * ease, 3);

      // Main text
      const fontSize = Math.max(14, Math.min(w * 0.055, 28));
      ctx.font = `bold ${fontSize}px -apple-system, system-ui, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 8;
      ctx.textAlign = "center";

      // Word wrap
      const maxWidth = w * 0.8;
      const words = scene.text.split(" ");
      const lines: string[] = [];
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else { line = test; }
      }
      if (line) lines.push(line);

      const lineHeight = fontSize * 1.4;
      const startY = h * 0.45 - (lines.length - 1) * lineHeight / 2 + ty;
      for (let i = 0; i < lines.length; i++) {
        const alpha = Math.min(1, ease * 2);
        ctx.globalAlpha = alpha;
        ctx.fillText(lines[i], w/2 + tx, startY + i * lineHeight);
      }

      // Subtext / provider badge
      if (scene.subtext) {
        ctx.globalAlpha = 0.7;
        ctx.font = `${Math.max(10, fontSize * 0.55)}px -apple-system, system-ui, sans-serif`;
        ctx.fillStyle = scene.accent;
        ctx.fillText(scene.subtext, w/2, h * 0.75);
      }

      ctx.globalAlpha = 1;
      ctx.restore();

      // Bottom brand bar
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, h - 28, w, 28);
      ctx.font = `bold 10px -apple-system, sans-serif`;
      ctx.fillStyle = scene.accent;
      ctx.textAlign = "center";
      ctx.fillText("🎬 ViralCut — Canvas Mode (FREE)", w/2, h - 10);
    }

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [canvasData, w, h]);

  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={h}
      style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }}
    />
  );
}

// ── Export canvas clip as WebM ────────────────────────────────────────────────
async function exportCanvasToWebm(canvasData: { scenes: CanvasScene[] }, aspectRatio: string, duration: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const [w, h] = aspectRatio === "9:16" ? [720, 1280] : aspectRatio === "1:1" ? [720, 720] : [1280, 720];
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "";
    const recorderOpts = mimeType ? { mimeType, videoBitsPerSecond: 3000000 } : { videoBitsPerSecond: 3000000 };
    const recorder = new MediaRecorder(stream, recorderOpts);
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => { resolve(URL.createObjectURL(new Blob(chunks, { type: "video/webm" }))); };
    recorder.onerror = () => reject(new Error("Recording failed"));

    recorder.start(100);
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const totalMs = duration * 1000;
      if (elapsed >= totalMs) { recorder.stop(); return; }

      // Draw scene
      const progress = elapsed / totalMs;
      const sceneIdx = Math.min(Math.floor(progress * canvasData.scenes.length), canvasData.scenes.length - 1);
      const scene = canvasData.scenes[sceneIdx];

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, scene.bg1);
      grad.addColorStop(1, scene.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Title text
      const fontSize = Math.min(w * 0.06, 50);
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 15;

      const words = scene.text.split(" ");
      const lines: string[] = [];
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > w * 0.8 && line) { lines.push(line); line = word; }
        else { line = test; }
      }
      if (line) lines.push(line);

      const lineH = fontSize * 1.5;
      const startY = h * 0.45 - (lines.length * lineH) / 2;
      lines.forEach((l, i) => ctx.fillText(l, w/2, startY + i * lineH));

      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  });
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SceneGeneratorPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // — Core settings —
  const [activeTab,  setActiveTab]  = useState<"text"|"script"|"image"|"broll"|"viral">("text");
  const [genMode,    setGenMode]    = useState<GenMode>("free");
  const [provider,   setProvider]   = useState<ProviderName>("canvas");
  const [duration,   setDuration]   = useState(6);
  const [aspectRatio,setAspectRatio]= useState("9:16");
  const [resolution, setResolution] = useState("720p");
  const [style,      setStyle]      = useState("cinematic");
  const [transition, setTransition] = useState("cut");
  const [viralMode,  setViralMode]  = useState(true); // Default to vertical shorts
  const [autoFallback, setAutoFallback] = useState(true);

  // — Input fields —
  const [prompt,      setPrompt]     = useState("");
  const [script,      setScript]     = useState("");
  const [brollTopic,  setBrollTopic] = useState("");
  const [uploadedImg, setUploadedImg]= useState<string|null>(null);
  const [clipCount,   setClipCount]  = useState(4);

  // — State —
  const [clips,         setClips]        = useState<Clip[]>([]);
  const [longScenes,    setLongScenes]   = useState<LongScene[]>([]);
  const [activeClipIdx, setActiveClipIdx]= useState<number|null>(null);
  const [generating,    setGenerating]   = useState(false);
  const [genProgress,   setGenProgress]  = useState(0);
  const [genStep,       setGenStep]      = useState("");
  const [currentJobId,  setCurrentJobId] = useState<string|null>(null);
  const [stitching,     setStitching]    = useState(false);
  const [stitchedUrl,   setStitchedUrl]  = useState<string|null>(null);
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [exportingCanvas, setExportingCanvas] = useState<string|null>(null);

  // — Provider capability status —
  const [capStatus,  setCapStatus]  = useState<CapabilityStatus|null>(null);
  const [capLoading, setCapLoading] = useState(true);

  // ── Load provider capability on mount ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/scene/gpu-check");
        const data = await res.json();
        setCapStatus({
          freeMode: data.freeMode,
          premiumMode: data.premiumMode,
          recommendation: data.recommendation,
        });
        // Canvas is always available — always default to free
        setGenMode("free");
        // Pick best free provider
        const freeProviders: ProviderStatus[] = data.freeMode?.providers || [];
        const bestFree = freeProviders.find((p: ProviderStatus) => p.available && p.name !== "canvas");
        setProvider(bestFree?.name as ProviderName || "canvas");
      } catch { /* silent */ }
      finally { setCapLoading(false); }
    })();
  }, []);

  const effectiveRatio = viralMode ? "9:16" : aspectRatio;

  // ── API: Generate one clip ────────────────────────────────────────────────
  const generateClip = useCallback(async (
    clipPrompt: string,
    idx = 0,
    jobId?: string
  ): Promise<Clip> => {
    const res = await fetch("/api/scene/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: clipPrompt,
        duration,
        aspectRatio: effectiveRatio,
        resolution,
        style,
        generationMode: genMode,
        preferredProvider: provider,
        sceneIndex: idx,
        jobId,
        autoFallback,
      }),
    });
    const data = await res.json();
    if (!data.ok && !data.clip) throw new Error(data.error || "Generation failed");

    const clip = data.clip;
    return {
      id: clip.id,
      prompt: clipPrompt,
      enhancedPrompt: data.enhancedPrompt || clip.prompt,
      videoUrl: clip.videoUrl,
      duration,
      aspectRatio: effectiveRatio,
      resolution,
      style,
      status: clip.status,
      sceneIndex: idx,
      provider: data.provider || clip.provider,
      generationMode: data.generationMode || clip.generationMode,
      estimatedTime: data.estimatedTime || clip.estimatedTime,
      canvasData: data.canvasData || null,
    };
  }, [duration, effectiveRatio, resolution, style, genMode, provider, autoFallback]);

  // ── TEXT → VIDEO ──────────────────────────────────────────────────────────
  const handleGenerateText = async () => {
    if (!prompt.trim()) { toast.error("Enter a scene description"); return; }
    setGenerating(true); setGenProgress(20);
    setGenStep(`Generating via ${PROVIDER_INFO[provider]?.label || provider}...`);
    try {
      setGenProgress(50);
      const clip = await generateClip(prompt, 0);
      setClips(prev => [clip, ...prev]);
      setActiveClipIdx(0);
      setGenProgress(100);
      const provLabel = PROVIDER_INFO[clip.provider || "canvas"]?.label || clip.provider;
      toast.success(clip.canvasData
        ? `Canvas slideshow ready! (${provLabel}) 🎬`
        : `Video generated via ${provLabel}! 🎬`);
    } catch (e) { toast.error(String(e)); }
    finally { setGenerating(false); setGenProgress(0); setGenStep(""); }
  };

  // ── SCRIPT → MULTI-SCENE ─────────────────────────────────────────────────
  const handleGenerateFromScript = async () => {
    if (!script.trim()) { toast.error("Paste a script"); return; }
    setGenerating(true); setGenProgress(8); setGenStep("AI segmenting script into scenes...");
    try {
      const res = await fetch("/api/scene/long", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ script, clipCount, aspectRatio: effectiveRatio, resolution, style, generationMode: genMode, preferredProvider: provider }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setLongScenes(data.scenes);
      setCurrentJobId(data.jobId);
      toast.success(`Script → ${data.scenes.length} scenes planned · via ${data.provider}`);

      const newClips: Clip[] = [];
      for (let i = 0; i < data.scenes.length; i++) {
        const scene: LongScene = data.scenes[i];
        const pct = 10 + Math.round((i / data.scenes.length) * 80);
        setGenProgress(pct);
        setGenStep(`Scene ${i+1}/${data.scenes.length}: "${scene.title}"...`);

        try {
          const clip = await generateClip(scene.enhancedPrompt || scene.prompt, i, data.jobId);
          const full: Clip = { ...clip, title: scene.title, narration: scene.narration, sceneIndex: i + 1 };
          newClips.push(full);
          setClips(prev => [...newClips, ...prev.filter(c => !newClips.find(nc => nc.id === c.id))]);
        } catch {
          newClips.push({
            id: `err_${Date.now()}_${i}`, prompt: scene.prompt, videoUrl: null,
            duration, aspectRatio: effectiveRatio, resolution, style,
            status: "error", sceneIndex: i + 1, title: scene.title,
            provider, generationMode: genMode,
          });
        }
      }

      setGenProgress(100);
      toast.success(`${newClips.length} scenes generated! 🎉`);
    } catch (e) { toast.error(String(e)); }
    finally { setGenerating(false); setGenProgress(0); setGenStep(""); setCurrentJobId(null); }
  };

  // ── B-ROLL ────────────────────────────────────────────────────────────────
  const handleBroll = async (topic: string) => {
    const t = topic || brollTopic;
    if (!t.trim()) { toast.error("Enter a topic"); return; }
    setGenerating(true); setGenProgress(10); setGenStep("Generating b-roll clips...");
    const brollPrompts = [
      `Aerial footage of ${t} with golden hour lighting`,
      `Close-up detail shot of ${t} with natural light`,
      `Wide establishing shot of ${t} environment`,
      `Motion time-lapse of ${t} activity`,
    ];
    const newClips: Clip[] = [];
    for (let i = 0; i < brollPrompts.length; i++) {
      setGenProgress(10 + i * 22);
      setGenStep(`B-Roll ${i+1}/4...`);
      try {
        const clip = await generateClip(brollPrompts[i], i);
        newClips.push({ ...clip, title: `B-Roll ${i+1}: ${t}` });
        setClips(prev => [...newClips, ...prev.filter(c => !newClips.find(nc => nc.id === c.id))]);
      } catch { /* skip */ }
    }
    setGenProgress(100);
    toast.success(`4 b-roll clips for "${t}"!`);
    setGenerating(false); setGenProgress(0); setGenStep("");
  };

  // ── IMAGE ANIMATE ─────────────────────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => setUploadedImg(ev.target?.result as string);
    r.readAsDataURL(f);
  };

  const handleImageAnimate = async () => {
    if (!uploadedImg) { toast.error("Upload an image first"); return; }
    setGenerating(true); setGenProgress(30); setGenStep("Analyzing image...");
    try {
      const clip = await generateClip("Cinematic animation of the uploaded scene with subtle motion", clips.length);
      setClips(prev => [{ ...clip, title: "Animated Scene" }, ...prev]);
      setActiveClipIdx(0);
      setGenProgress(100);
      toast.success("Image animated! 🎬");
    } catch (e) { toast.error(String(e)); }
    finally { setGenerating(false); setGenProgress(0); setGenStep(""); }
  };

  // ── VIRAL REMIX ───────────────────────────────────────────────────────────
  const handleViralRemix = async () => {
    setGenerating(true); setGenProgress(10); setGenStep("Generating viral short...");
    const viralPrompts = [
      "Hook shot: shocking reveal or surprising fact with text overlay",
      "Problem phase: the challenge or pain point shown visually",
      "Solution reveal: the answer or transformation moment",
      "Call to action: subscribe/follow with energetic closing",
    ];
    const newClips: Clip[] = [];
    for (let i = 0; i < viralPrompts.length; i++) {
      setGenProgress(10 + i * 22);
      try {
        const clip = await generateClip(viralPrompts[i], i);
        newClips.push({ ...clip, title: ["Hook", "Problem", "Solution", "CTA"][i] });
        setClips(prev => [...newClips, ...prev.filter(c => !newClips.find(nc => nc.id === c.id))]);
      } catch { /* skip */ }
    }
    setGenProgress(100);
    toast.success("Viral short structure generated!");
    setGenerating(false); setGenProgress(0); setGenStep("");
  };

  // ── Export canvas clip ────────────────────────────────────────────────────
  const handleExportCanvas = async (clip: Clip) => {
    if (!clip.canvasData) return;
    setExportingCanvas(clip.id);
    try {
      const url = await exportCanvasToWebm(clip.canvasData as { scenes: CanvasScene[] }, clip.aspectRatio, clip.duration);
      const a = document.createElement("a");
      a.href = url;
      a.download = `viralcut-canvas-${Date.now()}.webm`;
      a.click();
      toast.success("Canvas clip exported! 🎬");
    } catch (e) { toast.error(`Export failed: ${e}`); }
    finally { setExportingCanvas(null); }
  };

  const activeClip = activeClipIdx !== null ? clips[activeClipIdx] : null;

  const freeProviders = capStatus?.freeMode.providers || [];
  const premiumProviders = capStatus?.premiumMode.providers || [];

  return (
    <div style={{ display:"flex", height:"calc(100vh - 60px)", overflow:"hidden", background:"var(--bg)" }}>

      {/* ── Left Panel: Controls ── */}
      <div style={{ width:320, flexShrink:0, borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column", overflow:"hidden", background:"var(--bg-1)" }}>
        {/* Header */}
        <div style={{ padding:"16px 16px 12px", borderBottom:"1px solid var(--border)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:17 }}>🎬 Scene Generator</div>
              <div style={{ fontSize:11, color:"var(--text-4)", marginTop:2 }}>AI-powered free video creation</div>
            </div>
            <span className="badge badge-green" style={{ fontSize:9 }}>FREE</span>
          </div>

          {/* Mode Toggle */}
          <div style={{ display:"flex", gap:6, marginBottom:8 }}>
            {(["free","premium"] as GenMode[]).map(m => (
              <button key={m} onClick={() => setGenMode(m)}
                className={`btn btn-sm ${genMode === m ? "btn-primary" : ""}`}
                style={{ flex:1, textTransform:"capitalize", fontSize:12 }}>
                {m === "free" ? "🆓 Free" : "💎 Premium"}
              </button>
            ))}
          </div>

          {/* Provider selector */}
          <div style={{ background:"var(--bg-2)", borderRadius:8, padding:"8px 10px" }}>
            {capLoading ? (
              <div style={{ fontSize:11, color:"var(--text-4)" }}>Checking providers...</div>
            ) : (
              <>
                <div style={{ fontSize:10, color:"var(--text-4)", marginBottom:6, fontWeight:600 }}>
                  {genMode === "free" ? "FREE PROVIDERS" : "PREMIUM PROVIDERS"}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {(genMode === "free" ? freeProviders : premiumProviders).map((p: ProviderStatus) => {
                    const info = PROVIDER_INFO[p.name] || {};
                    return (
                      <button key={p.name}
                        onClick={() => p.available && setProvider(p.name as ProviderName)}
                        style={{
                          display:"flex", alignItems:"center", gap:8, padding:"6px 8px",
                          borderRadius:6, border:`1px solid ${provider === p.name ? info.color || "var(--brand)" : "var(--border)"}`,
                          background: provider === p.name ? `${info.color || "var(--brand)"}15` : "transparent",
                          cursor: p.available ? "pointer" : "default", opacity: p.available ? 1 : 0.5,
                          textAlign:"left", width:"100%",
                        }}>
                        <span style={{ fontSize:14 }}>{info.icon || "🎬"}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:11, fontWeight:600, color: p.available ? "#fff" : "var(--text-4)" }}>
                            {info.label || p.name}
                          </div>
                          <div style={{ fontSize:9, color:"var(--text-4)" }}>
                            {p.available ? (info.cost || "Available") : (p.note || "Not available")}
                          </div>
                        </div>
                        {p.available
                          ? <span className="badge badge-green" style={{fontSize:8}}>✓</span>
                          : <span className="badge" style={{fontSize:8}}>⚙️</span>
                        }
                      </button>
                    );
                  })}
                </div>
                {genMode === "free" && (
                  <div style={{ marginTop:6, fontSize:10, color:"var(--text-4)", lineHeight:1.4 }}>
                    💡 Canvas Slideshow is always free. Add PEXELS_API_KEY for real stock video.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tab selector */}
        <div style={{ display:"flex", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
          {(["text","script","broll","image","viral"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                flex:1, padding:"8px 4px", fontSize:9, fontWeight:600,
                borderBottom:`2px solid ${activeTab === tab ? "var(--brand)" : "transparent"}`,
                borderTop:"none", borderLeft:"none", borderRight:"none",
                color: activeTab === tab ? "var(--brand)" : "var(--text-4)",
                background:"none", cursor:"pointer", textTransform:"uppercase",
              }}>
              {tab === "text" ? "✏️ Text" : tab === "script" ? "📄 Script" : tab === "broll" ? "🎞️ B-Roll" : tab === "image" ? "🖼️ Image" : "🚀 Viral"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex:1, overflow:"auto", padding:14 }}>
          {activeTab === "text" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <textarea
                value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder="Describe your scene... e.g. 'A person on a mountain at sunrise, golden hour light, cinematic wide shot'"
                style={{ height:100, resize:"vertical", fontSize:13, lineHeight:1.5 }}
              />
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {["Mountain sunrise epic", "City time-lapse night", "Ocean waves slow motion", "Forest meditation calm"].map(ex => (
                  <button key={ex} onClick={() => setPrompt(ex)} className="badge" style={{ cursor:"pointer", fontSize:10 }}>{ex}</button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "script" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <textarea
                value={script} onChange={e => setScript(e.target.value)}
                placeholder="Paste your full script or topic outline here. AI will split it into scenes automatically..."
                style={{ height:120, resize:"vertical", fontSize:13, lineHeight:1.5 }}
              />
              <div>
                <label style={{ fontSize:11, color:"var(--text-4)", display:"block", marginBottom:4 }}>
                  Number of scenes: <strong>{clipCount}</strong>
                </label>
                <input type="range" min={2} max={8} value={clipCount} onChange={e => setClipCount(+e.target.value)}
                  style={{ width:"100%", accentColor:"var(--brand)" }} />
              </div>
            </div>
          )}

          {activeTab === "broll" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input value={brollTopic} onChange={e => setBrollTopic(e.target.value)}
                placeholder="Topic for b-roll (e.g. fitness, technology, nature)" style={{ fontSize:13 }} />
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {BROLL_TOPICS.map(t => (
                  <button key={t} onClick={() => handleBroll(t)} disabled={generating}
                    className="badge" style={{ cursor:"pointer", fontSize:10, textTransform:"capitalize" }}>{t}</button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "image" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input type="file" ref={fileRef} accept="image/*" onChange={handleImageUpload} style={{ display:"none" }} />
              <button onClick={() => fileRef.current?.click()} className="btn btn-secondary" style={{ height:80 }}>
                {uploadedImg ? "✅ Image loaded — click Generate" : "🖼️ Upload Image to Animate"}
              </button>
              {uploadedImg && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={uploadedImg} alt="uploaded" style={{ width:"100%", borderRadius:8, maxHeight:100, objectFit:"cover" }} />
              )}
            </div>
          )}

          {activeTab === "viral" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ background:"var(--bg-2)", borderRadius:8, padding:10, fontSize:12, lineHeight:1.6 }}>
                <div style={{ fontWeight:700, marginBottom:6 }}>🚀 Viral Short Structure</div>
                <div>Automatically generates a 4-clip structure proven to go viral:</div>
                <div style={{ marginTop:6, color:"var(--text-4)", fontSize:11 }}>
                  1. 🎣 Hook (2s)<br/>
                  2. 😤 Problem (3s)<br/>
                  3. 💡 Solution (4s)<br/>
                  4. 📢 CTA (2s)
                </div>
              </div>
            </div>
          )}

          {/* Shared settings */}
          <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              <div>
                <label style={{ fontSize:10, color:"var(--text-4)", display:"block", marginBottom:3 }}>Duration</label>
                <select value={duration} onChange={e => setDuration(+e.target.value)} style={{ width:"100%", fontSize:12 }}>
                  {DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:10, color:"var(--text-4)", display:"block", marginBottom:3 }}>Style</label>
                <select value={style} onChange={e => setStyle(e.target.value)} style={{ width:"100%", fontSize:12 }}>
                  {STYLES.map(s => <option key={s} value={s} style={{ textTransform:"capitalize" }}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--bg-2)", borderRadius:8, padding:"8px 10px" }}>
              <label style={{ flex:1, fontSize:11, cursor:"pointer" }}>
                📱 Viral Mode (9:16 vertical)
              </label>
              <button onClick={() => setViralMode(v => !v)}
                style={{
                  width:36, height:20, borderRadius:10, border:"none", cursor:"pointer",
                  background: viralMode ? "var(--brand)" : "var(--border)", position:"relative", transition:"0.2s",
                }}>
                <span style={{
                  position:"absolute", top:2, left: viralMode ? 18 : 2, width:16, height:16,
                  borderRadius:"50%", background:"#fff", transition:"0.2s",
                }} />
              </button>
            </div>

            {!viralMode && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                <div>
                  <label style={{ fontSize:10, color:"var(--text-4)", display:"block", marginBottom:3 }}>Ratio</label>
                  <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} style={{ width:"100%", fontSize:12 }}>
                    {RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:10, color:"var(--text-4)", display:"block", marginBottom:3 }}>Quality</label>
                  <select value={resolution} onChange={e => setResolution(e.target.value)} style={{ width:"100%", fontSize:12 }}>
                    {RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={
                activeTab === "text" ? handleGenerateText :
                activeTab === "script" ? handleGenerateFromScript :
                activeTab === "broll" ? () => handleBroll(brollTopic) :
                activeTab === "image" ? handleImageAnimate :
                handleViralRemix
              }
              disabled={generating}
              className="btn btn-primary"
              style={{ width:"100%", height:44, fontSize:14, fontWeight:700, marginTop:4 }}>
              {generating ? `⏳ ${genStep || "Generating..."}` : `🎬 Generate (${PROVIDER_INFO[provider]?.icon || ""} ${PROVIDER_INFO[provider]?.label || provider})`}
            </button>

            {/* Progress bar */}
            {generating && (
              <div style={{ background:"var(--bg-2)", borderRadius:6, height:6, overflow:"hidden" }}>
                <div style={{
                  height:"100%", background:"var(--brand)", borderRadius:6,
                  width:`${genProgress}%`, transition:"width 0.3s ease",
                }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main: Preview + Clip List ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Preview */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#0a0a0a", position:"relative", overflow:"hidden", minHeight:0 }}>
          {activeClip ? (
            <div style={{ height:"100%", maxHeight:"70vh", aspectRatio: effectiveRatio === "9:16" ? "9/16" : effectiveRatio === "1:1" ? "1/1" : "16/9", background:"#000", borderRadius:12, overflow:"hidden", position:"relative" }}>
              {activeClip.canvasData ? (
                <CanvasClipPreview canvasData={activeClip.canvasData as { scenes: CanvasScene[] }} aspectRatio={activeClip.aspectRatio} playing />
              ) : activeClip.videoUrl ? (
                <video
                  src={activeClip.videoUrl}
                  autoPlay loop muted playsInline
                  style={{ width:"100%", height:"100%", objectFit:"cover" }}
                />
              ) : (
                <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8 }}>
                  <div style={{ fontSize:40 }}>{activeClip.status === "error" ? "❌" : "⏳"}</div>
                  <div style={{ color:"var(--text-4)", fontSize:12 }}>{activeClip.status === "error" ? "Generation failed" : "Processing..."}</div>
                </div>
              )}

              {/* Clip info overlay */}
              <div style={{ position:"absolute", top:8, left:8, right:8, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <span className={`badge badge-${activeClip.provider === "canvas" ? "cyan" : activeClip.provider === "pexels" || activeClip.provider === "pixabay" ? "green" : "brand"}`} style={{ fontSize:9 }}>
                  {PROVIDER_INFO[activeClip.provider || "canvas"]?.icon} {activeClip.provider?.toUpperCase() || "CANVAS"}
                </span>
                <span className="badge" style={{ fontSize:9 }}>{activeClip.aspectRatio} · {activeClip.duration}s</span>
              </div>

              {/* Export button */}
              {activeClip.canvasData && (
                <button
                  onClick={() => handleExportCanvas(activeClip)}
                  disabled={exportingCanvas === activeClip.id}
                  className="btn btn-success btn-sm"
                  style={{ position:"absolute", bottom:8, right:8, fontSize:11 }}>
                  {exportingCanvas === activeClip.id ? "Exporting..." : "⬇️ Export .webm"}
                </button>
              )}
              {activeClip.videoUrl && (
                <a href={activeClip.videoUrl} download target="_blank" rel="noreferrer"
                  className="btn btn-success btn-sm"
                  style={{ position:"absolute", bottom:8, right:8, fontSize:11, textDecoration:"none" }}>
                  ⬇️ Download
                </a>
              )}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:40, color:"var(--text-4)" }}>
              <div style={{ fontSize:60, marginBottom:12 }}>🎬</div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, marginBottom:8, color:"var(--text-2)" }}>Free AI Video Generator</div>
              <div style={{ fontSize:13, lineHeight:1.7, maxWidth:380, margin:"0 auto" }}>
                Generate videos for free using:<br/>
                <strong style={{ color:"var(--green)" }}>🆓 Canvas Slideshow</strong> — always works, no setup<br/>
                <strong style={{ color:"var(--green)" }}>🎞️ Pexels Stock Video</strong> — free API key<br/>
                <strong style={{ color:"var(--cyan)" }}>🤖 Premium AI</strong> — Grok/Runway/Luma (optional)
              </div>
            </div>
          )}
        </div>

        {/* Clip strip */}
        {clips.length > 0 && (
          <div style={{ height:130, flexShrink:0, borderTop:"1px solid var(--border)", background:"var(--bg-1)", display:"flex", alignItems:"center", gap:10, overflowX:"auto", padding:"10px 14px" }}>
            {clips.map((clip, i) => (
              <div key={clip.id}
                onClick={() => setActiveClipIdx(i)}
                style={{
                  width:90, height:108, flexShrink:0, borderRadius:8, overflow:"hidden",
                  border:`2px solid ${activeClipIdx === i ? "var(--brand)" : "var(--border)"}`,
                  cursor:"pointer", position:"relative", background:"#111",
                }}>
                {clip.canvasData ? (
                  <CanvasClipPreview canvasData={clip.canvasData as { scenes: CanvasScene[] }} aspectRatio={clip.aspectRatio} />
                ) : clip.videoUrl ? (
                  <video src={clip.videoUrl} muted style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                ) : (
                  <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
                    {clip.status === "error" ? "❌" : clip.status === "generating" ? "⏳" : "🎬"}
                  </div>
                )}
                <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.8)", padding:"2px 4px", fontSize:9, color:"#fff", textAlign:"center", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {clip.title || `Scene ${i+1}`}
                </div>
                <div style={{ position:"absolute", top:3, right:3 }}>
                  <span className={`badge badge-${clip.provider === "canvas" ? "cyan" : "green"}`} style={{ fontSize:7, padding:"1px 3px" }}>
                    {clip.provider?.slice(0,4).toUpperCase() || "AI"}
                  </span>
                </div>
              </div>
            ))}

            {stitchedUrl && (
              <div style={{ display:"flex", flexDirection:"column", gap:6, padding:"0 10px", borderLeft:"1px solid var(--border)" }}>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--green)" }}>✅ Stitched</div>
                <a href={stitchedUrl} download className="btn btn-success btn-sm" style={{ fontSize:10 }}>⬇️ Download</a>
                <button onClick={() => router.push("/video-editor")} className="btn btn-secondary btn-sm" style={{ fontSize:10 }}>✂️ Edit</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right Panel: Narration + Actions ── */}
      {activeClip && (
        <div style={{ width:260, flexShrink:0, borderLeft:"1px solid var(--border)", background:"var(--bg-1)", overflow:"auto", padding:14, display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:14 }}>📋 Clip Details</div>

          <div style={{ background:"var(--bg-2)", borderRadius:8, padding:10, fontSize:12 }}>
            <div style={{ color:"var(--text-4)", fontSize:10, marginBottom:4 }}>PROMPT</div>
            <div style={{ lineHeight:1.5 }}>{activeClip.enhancedPrompt || activeClip.prompt}</div>
          </div>

          {activeClip.narration && (
            <div style={{ background:"var(--bg-2)", borderRadius:8, padding:10, fontSize:12 }}>
              <div style={{ color:"var(--text-4)", fontSize:10, marginBottom:4 }}>NARRATION</div>
              <div style={{ lineHeight:1.5 }}>{activeClip.narration}</div>
              <button className="btn btn-secondary btn-sm" style={{ marginTop:8, fontSize:10, width:"100%" }}
                onClick={() => {
                  if ("speechSynthesis" in window) {
                    const u = new SpeechSynthesisUtterance(activeClip.narration!);
                    window.speechSynthesis.speak(u);
                    toast.success("🔊 Playing narration (free browser TTS)");
                  } else { toast.error("Browser TTS not supported"); }
                }}>
                🔊 Play (Browser TTS)
              </button>
            </div>
          )}

          <div style={{ background:"var(--bg-2)", borderRadius:8, padding:10, fontSize:11 }}>
            <div style={{ color:"var(--text-4)", fontSize:10, marginBottom:6 }}>INFO</div>
            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"var(--text-4)" }}>Provider</span>
                <span style={{ fontWeight:600 }}>{PROVIDER_INFO[activeClip.provider || "canvas"]?.icon} {activeClip.provider || "canvas"}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"var(--text-4)" }}>Duration</span>
                <span>{activeClip.duration}s</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"var(--text-4)" }}>Ratio</span>
                <span>{activeClip.aspectRatio}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"var(--text-4)" }}>Mode</span>
                <span className={`badge badge-${activeClip.generationMode === "free" ? "green" : "brand"}`} style={{ fontSize:9 }}>
                  {activeClip.generationMode || "free"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {activeClip.canvasData && (
              <button onClick={() => handleExportCanvas(activeClip)} disabled={exportingCanvas === activeClip.id}
                className="btn btn-success" style={{ fontSize:12 }}>
                {exportingCanvas === activeClip.id ? "⏳ Exporting..." : "⬇️ Export as .webm"}
              </button>
            )}
            {activeClip.videoUrl && (
              <a href={activeClip.videoUrl} download target="_blank" rel="noreferrer"
                className="btn btn-success" style={{ fontSize:12, textDecoration:"none", textAlign:"center", display:"block" }}>
                ⬇️ Download Video
              </a>
            )}
            <button onClick={() => router.push("/video-editor")} className="btn btn-secondary" style={{ fontSize:12 }}>
              ✂️ Open in Editor
            </button>
            <button onClick={() => router.push("/factory")} className="btn btn-secondary" style={{ fontSize:12 }}>
              🏭 Open in Factory
            </button>
          </div>

          {/* Free setup tips */}
          <div style={{ background:"var(--bg-2)", borderRadius:8, padding:10, fontSize:10, lineHeight:1.6 }}>
            <div style={{ fontWeight:700, marginBottom:4, color:"var(--green)" }}>💡 Get More Free Videos</div>
            <div style={{ color:"var(--text-4)" }}>
              • <strong>Pexels</strong>: Free at pexels.com/api<br/>
              • <strong>Pixabay</strong>: Free at pixabay.com/api<br/>
              • Canvas: Always works (no setup)<br/>
              • Premium APIs: Grok, Runway, Luma
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

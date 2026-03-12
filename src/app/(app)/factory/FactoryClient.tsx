"use client";
import { useState, useRef, useCallback, useEffect, useReducer } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { drawFrame } from "@/components/CanvasRenderer";
import { TEMPLATES, CAP_STYLES, VOICES } from "@/lib/constants";
import { trackUsage } from "@/lib/trackUsage";

interface Short {
  id: string;
  title: string;
  hook: string;
  startTime: number;
  endTime: number;
  duration: number;
  viralScore: number;
  style: string;
  captionStyle: string;
  hookOverlay: string;
  why: string;
  callToAction: string;
  accentColor: string;
  suggestedTitle: string;
  suggestedTags: string[];
  youtubeUrl?: string;
}
interface TranscriptSeg {
  start: number;
  dur: number;
  text: string;
}
interface VideoMeta {
  title: string;
  channel: string;
  thumbnail: string;
  viewCount: number;
}
interface HookItem {
  text: string;
  type: string;
  emoji: string;
  subtext: string;
}
interface VideoSource {
  url: string;
  type: string;
  quality: string;
  source: string;
}
interface ClipInfo {
  sources: VideoSource[];
  embedUrl: string;
  watchUrl: string;
  thumbnailUrl: string;
  ytdlpAvailable: boolean;
  ffmpegAvailable: boolean;
}
interface MusicTrack {
  id: string;
  name: string;
  mood: string;
  bpm: number;
  duration: number;
  url: string;
}

// ── Editor state with undo ────────────────────────────────────────────────────
interface EditorState {
  template: string;
  capStyle: string;
  hookText: string;
  ctaText: string;
  accentColor: string;
}
type EditorAction =
  | { type: "SET_TEMPLATE"; val: string }
  | { type: "SET_CAP"; val: string }
  | { type: "SET_HOOK"; val: string }
  | { type: "SET_CTA"; val: string }
  | { type: "SET_COLOR"; val: string }
  | { type: "UNDO" };

const MAX_UNDO = 20;

function editorReducer(
  state: { present: EditorState; past: EditorState[] },
  action: EditorAction,
) {
  const pushUndo = (next: EditorState) => ({
    present: next,
    past: [...state.past.slice(-MAX_UNDO), state.present],
  });
  switch (action.type) {
    case "SET_TEMPLATE":
      return pushUndo({ ...state.present, template: action.val });
    case "SET_CAP":
      return pushUndo({ ...state.present, capStyle: action.val });
    case "SET_HOOK":
      return pushUndo({ ...state.present, hookText: action.val });
    case "SET_CTA":
      return pushUndo({ ...state.present, ctaText: action.val });
    case "SET_COLOR":
      return pushUndo({ ...state.present, accentColor: action.val });
    case "UNDO":
      if (!state.past.length) return state;
      return {
        present: state.past[state.past.length - 1],
        past: state.past.slice(0, -1),
      };
    default:
      return state;
  }
}

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}`;
}
function scoreClass(n: number) {
  return n >= 90
    ? "badge score-viral"
    : n >= 75
      ? "badge score-hot"
      : n >= 60
        ? "badge score-rising"
        : "badge score-normal";
}

const MOCK_TRANSCRIPT: TranscriptSeg[] = [
  {
    start: 0,
    dur: 8,
    text: "Welcome back everyone, today I'm going to share the ten habits that genuinely changed my life.",
  },
  {
    start: 8,
    dur: 10,
    text: "I've been experimenting with productivity systems for over five years now and I finally figured it out.",
  },
  {
    start: 18,
    dur: 12,
    text: "The number one thing most people get wrong is trying to change too many habits at once.",
  },
  {
    start: 30,
    dur: 12,
    text: "When I started focusing on just one keystone habit everything else fell into place automatically.",
  },
  {
    start: 42,
    dur: 13,
    text: "That habit was waking up at five AM and spending the first hour completely offline and in silence.",
  },
  {
    start: 55,
    dur: 13,
    text: "No phone, no email, no social media. Just me, my journal, and a cup of coffee.",
  },
  {
    start: 68,
    dur: 14,
    text: "In that hour I would write down my three most important tasks for the day and visualize completing them.",
  },
  {
    start: 82,
    dur: 13,
    text: "Within two weeks my productivity had doubled and within a month I was hitting goals I'd been putting off for years.",
  },
];
const MOCK_SHORTS: Short[] = [
  {
    id: "s1",
    title: "The ONE habit that 10x'd my productivity",
    hook: "I added just ONE thing to my morning...",
    startTime: 120,
    endTime: 185,
    duration: 65,
    viralScore: 92,
    style: "educational",
    captionStyle: "bold",
    hookOverlay: "THIS CHANGED EVERYTHING",
    why: "Single-habit hook + transformation promise.",
    callToAction: "Follow for more! 🔥",
    accentColor: "#5b5bd6",
    suggestedTitle: "Morning Habit That Changed My Life #shorts",
    suggestedTags: ["productivity", "habits", "motivation"],
  },
  {
    id: "s2",
    title: "Why your sleep is destroying your results",
    hook: "You're sleeping wrong and here's proof...",
    startTime: 430,
    endTime: 495,
    duration: 65,
    viralScore: 78,
    style: "motivational",
    captionStyle: "neon",
    hookOverlay: "STOP DOING THIS AT NIGHT",
    why: "Fear-based health hook.",
    callToAction: "Save this! 💾",
    accentColor: "#06b6d4",
    suggestedTitle: "Why You're Always Tired #shorts",
    suggestedTags: ["sleep", "health", "wellbeing"],
  },
  {
    id: "s3",
    title: "Journaling technique nobody talks about",
    hook: "Most people journal completely wrong...",
    startTime: 780,
    endTime: 845,
    duration: 65,
    viralScore: 65,
    style: "educational",
    captionStyle: "boxed",
    hookOverlay: "JOURNALING HACK",
    why: "Expert contrarian framing.",
    callToAction: "Try this tonight 📓",
    accentColor: "#10b981",
    suggestedTitle: "This Journaling Method Is Different #shorts",
    suggestedTags: ["journaling", "mentalhealth"],
  },
];

export default function FactoryClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Persist URL across sessions
  const [url, setUrl] = useState(() => {
    if (typeof window !== "undefined")
      return localStorage.getItem("vc_url") || searchParams.get("url") || "";
    return searchParams.get("url") || "";
  });
  const [count, setCount] = useState(5);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [transcript, setTranscript] = useState<TranscriptSeg[]>([]);
  const [activeShort, setActiveShort] = useState<Short | null>(null);
  const [activeShortIdx, setActiveShortIdx] = useState(0);
  const [rpTab, setRpTab] = useState<
    "style" | "hooks" | "captions" | "voice" | "music" | "titles" | "video"
  >("style");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hooks, setHooks] = useState<HookItem[]>([]);
  const [abHooks, setAbHooks] = useState<{
    a: HookItem | null;
    b: HookItem | null;
  }>({ a: null, b: null });
  const [appliedHook, setAppliedHook] = useState<number | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("adam");
  const [voiceAudio, setVoiceAudio] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [hooksLoading, setHooksLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [activeCapSeg, setActiveCapSeg] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [batchExporting, setBatchExporting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [musicLibrary, setMusicLibrary] = useState<MusicTrack[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [musicVol, setMusicVol] = useState(35);
  const [musicPlaying, setMusicPlaying] = useState(false);

  // Video loading state
  const [clipInfo, setClipInfo] = useState<ClipInfo | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoSourceIdx, setVideoSourceIdx] = useState(0);
  const [useVideoBackground, setUseVideoBackground] = useState(true);
  const [showEmbedPlayer, setShowEmbedPlayer] = useState(false);

  // Editor state with undo support
  const [editorState, editorDispatch] = useReducer(editorReducer, {
    present: {
      template: "dark",
      capStyle: "bold",
      hookText: "",
      ctaText: "",
      accentColor: "#5b5bd6",
    },
    past: [],
  });
  const { template, capStyle, hookText, ctaText } = editorState.present;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number>(0);
  const startTsRef = useRef<number | null>(null);
  const startProgRef = useRef(0);
  const currentVideoIdRef = useRef<string>("");
  const loadAttemptRef = useRef(0);

  const tpl = TEMPLATES.find((t) => t.id === template) || TEMPLATES[0];

  const extractVideoId = (ytUrl: string): string | null =>
    ytUrl.match(/(?:v=|youtu\.be\/)([^&\s?]+)/)?.[1] || null;

  // Persist URL
  useEffect(() => {
    if (url) localStorage.setItem("vc_url", url);
  }, [url]);

  // Load music library
  useEffect(() => {
    fetch("/api/music")
      .then((r) => r.json())
      .then((d) => {
        if (d.tracks) setMusicLibrary(d.tracks.slice(0, 8));
      });
  }, []);

  // ── KEYBOARD SHORTCUTS ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === " ") {
        e.preventDefault();
        if (playing) stopPlay();
        else startPlay();
      }
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        exportWebm();
      }
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        editorDispatch({ type: "UNDO" });
        toast.info("Undone ↩");
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToShort(activeShortIdx - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goToShort(activeShortIdx + 1);
      }
      for (let i = 1; i <= 8; i++) {
        if (e.key === String(i)) {
          editorDispatch({
            type: "SET_TEMPLATE",
            val: TEMPLATES[i - 1]?.id || "dark",
          });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, activeShortIdx, shorts]);

  const goToShort = (idx: number) => {
    const clamped = Math.max(0, Math.min(shorts.length - 1, idx));
    if (shorts[clamped]) {
      setActiveShortIdx(clamped);
      setActiveShort(shorts[clamped]);
      setProgress(0);
      stopPlay();
    }
  };

  // ── REDRAW ────────────────────────────────────────────────────────────────
  const redraw = useCallback(
    (prog: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !activeShort) return;
      const dur = activeShort.duration || 65;
      const capTime = prog * dur;
      const seg = transcript.find(
        (t) => capTime >= t.start && capTime < t.start + t.dur,
      );
      const vid = videoRef.current;
      if (vid && videoLoaded && activeShort) {
        const targetTime = activeShort.startTime + prog * dur;
        if (Math.abs(vid.currentTime - targetTime) > 0.5)
          vid.currentTime = targetTime;
      }
      drawFrame(canvas, {
        bg1: tpl.bg1,
        bg2: tpl.bg2,
        acc: editorState.present.accentColor || tpl.acc,
        hookText: hookText || activeShort.hookOverlay || "",
        capText: seg ? seg.text.split(" ").slice(0, 10).join(" ") : "",
        capStyleId: capStyle,
        cta: ctaText || activeShort.callToAction || "",
        progress: prog,
        videoEl: videoLoaded && useVideoBackground ? videoRef.current : null,
        showVideoBackground: useVideoBackground,
      });
    },
    [
      activeShort,
      tpl,
      capStyle,
      transcript,
      hookText,
      ctaText,
      videoLoaded,
      useVideoBackground,
      editorState.present.accentColor,
    ],
  );

  useEffect(() => {
    redraw(progress);
  }, [redraw, progress]);

  useEffect(() => {
    if (activeShort) {
      editorDispatch({ type: "SET_HOOK", val: activeShort.hookOverlay || "" });
      editorDispatch({ type: "SET_CTA", val: activeShort.callToAction || "" });
      if (currentVideoIdRef.current) loadVideoForShort(activeShort);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShort?.id]);

  // ── VIDEO LOADING ──────────────────────────────────────────────────────────
  const loadVideoForShort = useCallback(async (short: Short) => {
    const videoId = currentVideoIdRef.current;
    if (!videoId) return;
    setVideoLoading(true);
    setVideoError(null);
    setVideoLoaded(false);
    loadAttemptRef.current += 1;
    const thisAttempt = loadAttemptRef.current;
    try {
      const res = await fetch(
        `/api/clip?videoId=${videoId}&start=${short.startTime}&duration=${short.duration}&mode=info`,
      );
      const data: ClipInfo = await res.json();
      setClipInfo(data);
      if (thisAttempt !== loadAttemptRef.current) return;
      await tryLoadVideoSource(data.sources, 0, short.startTime);
    } catch {
      setVideoError("Could not load video sources");
      setVideoLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tryLoadVideoSource = useCallback(
    async (
      sources: VideoSource[],
      idx: number,
      startTime: number,
    ): Promise<void> => {
      if (idx >= sources.length) {
        setVideoLoading(false);
        setVideoError("Video proxy unavailable — showing embed player");
        setShowEmbedPlayer(true);
        toast.info(
          "Using YouTube embed player 📺 — canvas export still works for template mode",
        );
        return;
      }
      const vid = videoRef.current;
      if (!vid) return;
      setVideoSourceIdx(idx);
      const src = sources[idx];
      // Skip direct Invidious sources (they have CORS issues in browser)
      if (src.source?.includes("invidious")) {
        return tryLoadVideoSource(sources, idx + 1, startTime);
      }
      return new Promise<void>((resolve) => {
        let settled = false;
        const settle = () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };
        const onCanPlay = () => {
          vid.currentTime = startTime;
          setVideoLoaded(true);
          setVideoLoading(false);
          setVideoError(null);
          setShowEmbedPlayer(false);
          toast.success(`🎬 Video loaded (${src.quality})`);
          cleanup();
          settle();
        };
        const onError = () => {
          cleanup();
          tryLoadVideoSource(sources, idx + 1, startTime).then(settle);
        };
        const cleanup = () => {
          vid.removeEventListener("canplay", onCanPlay);
          vid.removeEventListener("error", onError);
        };
        vid.addEventListener("canplay", onCanPlay, { once: true });
        vid.addEventListener("error", onError, { once: true });
        vid.crossOrigin = "anonymous";
        vid.src = src.url;
        vid.preload = "auto";
        vid.load();
        setTimeout(() => {
          if (!settled) {
            cleanup();
            tryLoadVideoSource(sources, idx + 1, startTime).then(settle);
          }
        }, 10000);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [],
  );

  // ── PLAYBACK ──────────────────────────────────────────────────────────────
  const stopPlay = useCallback(() => {
    setPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    videoRef.current?.pause();
  }, []);

  const startPlay = useCallback(() => {
    if (!activeShort) return;
    setPlaying(true);
    startProgRef.current = progress >= 1 ? 0 : progress;
    startTsRef.current = null;
    const dur = activeShort.duration || 65;
    const vid = videoRef.current;
    if (vid && videoLoaded) {
      vid.currentTime = activeShort.startTime + startProgRef.current * dur;
      vid.play().catch(() => {});
    }
    const tick = (ts: number) => {
      if (!startTsRef.current) startTsRef.current = ts;
      const elapsed = (ts - startTsRef.current) / 1000;
      const p = Math.min(startProgRef.current + elapsed / dur, 1);
      setProgress(p);
      const canvas = canvasRef.current;
      if (canvas && activeShort) {
        const capTime = p * dur;
        const seg = transcript.find(
          (t) => capTime >= t.start && capTime < t.start + t.dur,
        );
        drawFrame(canvas, {
          bg1: tpl.bg1,
          bg2: tpl.bg2,
          acc: editorState.present.accentColor || tpl.acc,
          hookText: hookText || activeShort.hookOverlay || "",
          capText: seg ? seg.text.split(" ").slice(0, 10).join(" ") : "",
          capStyleId: capStyle,
          cta: ctaText || activeShort.callToAction || "",
          progress: p,
          videoEl: videoLoaded && useVideoBackground ? vid : null,
          showVideoBackground: useVideoBackground,
        });
      }
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        setPlaying(false);
        setProgress(0);
        vid?.pause();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [
    activeShort,
    progress,
    tpl,
    capStyle,
    transcript,
    hookText,
    ctaText,
    videoLoaded,
    useVideoBackground,
    editorState.present.accentColor,
  ]);

  // ── ANALYZE ──────────────────────────────────────────────────────────────
  const analyze = async () => {
    const videoId = extractVideoId(url);
    if (!url.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }
    currentVideoIdRef.current = videoId || "";
    setAnalyzing(true);
    setVideoLoaded(false);
    setClipInfo(null);
    setVideoError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: videoId || "dQw4w9WgXcQ",
          count,
          save: false,
        }),
      });
      const data = await res.json();
      if (data.limitReached) {
        window.dispatchEvent(new Event("vc:usage"));
        return;
      }
      if (data.ok) {
        setVideoMeta(data.meta);
        setShorts(data.shorts);
        // Use transcript from analysis first
        const segs = data.transcript?.length ? data.transcript : [];
        setTranscript(segs);
        setActiveShort(data.shorts[0]);
        setAnalyzed(true);
        setProgress(0);
        toast.success(`${data.shorts.length} viral moments found! 🔥`);
        await trackUsage();
        if (videoId && data.shorts[0])
          setTimeout(() => loadVideoForShort(data.shorts[0]), 800);
        // If no captions from analysis, try dedicated captions endpoint
        if (!segs.length && videoId) {
          setTimeout(async () => {
            try {
              const capRes = await fetch(`/api/captions?videoId=${videoId}`);
              const capData = await capRes.json();
              if (capData.ok && capData.segments?.length) {
                setTranscript(capData.segments);
                toast.success(
                  `✅ ${capData.segments.length} caption segments loaded`,
                );
              }
            } catch {
              /* silent */
            }
          }, 1500);
        }
      } else throw new Error(data.error);
    } catch {
      const vid2 = extractVideoId(url) || "dQw4w9WgXcQ";
      setVideoMeta({
        title: "10 Habits That Changed My Life",
        channel: "Demo Channel",
        thumbnail: `https://img.youtube.com/vi/${vid2}/hqdefault.jpg`,
        viewCount: 2400000,
      });
      setShorts(MOCK_SHORTS);
      setTranscript(MOCK_TRANSCRIPT);
      setActiveShort(MOCK_SHORTS[0]);
      setAnalyzed(true);
      setProgress(0);
      currentVideoIdRef.current = vid2;
      toast.success(`${MOCK_SHORTS.length} viral moments found! (demo) 🔥`);
      if (extractVideoId(url))
        setTimeout(() => loadVideoForShort(MOCK_SHORTS[0]), 800);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── WHISPER TRANSCRIPTION ────────────────────────────────────────────────
  const transcribeWithWhisper = async () => {
    const videoId = currentVideoIdRef.current;
    if (!videoId) {
      toast.error("Analyze a video first");
      return;
    }
    setTranscribing(true);

    // First try: dedicated captions endpoint (fast, free)
    try {
      const capRes = await fetch(`/api/captions?videoId=${videoId}`);
      const capData = await capRes.json();
      if (capData.ok && capData.segments?.length > 3) {
        setTranscript(capData.segments);
        toast.success(
          `✅ ${capData.segments.length} caption segments loaded (${capData.source})`,
        );
        setTranscribing(false);
        return;
      }
    } catch {
      /* try Whisper */
    }

    // Second try: Whisper AI via Groq
    toast.info("Running Whisper transcription via Groq...");
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      const d = await res.json();
      if (d.ok && d.segments?.length) {
        setTranscript(d.segments);
        toast.success(
          `✅ Whisper transcript: ${d.segments.length} segments in ${d.language}`,
        );
      } else toast.error(d.error || "Transcription failed");
    } catch {
      toast.error("Transcription request failed");
    } finally {
      setTranscribing(false);
    }
  };

  // ── EXPORT CANVAS ────────────────────────────────────────────────────────
  const exportWebm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeShort) {
      toast.error("No canvas to export");
      return;
    }
    setExporting(true);
    setExportProgress(0);
    toast.info(
      videoLoaded
        ? "Rendering with real footage... 🎬"
        : "Rendering template...",
    );
    try {
      const vid = videoRef.current;
      if (vid && videoLoaded) {
        vid.currentTime = activeShort.startTime;
        vid.pause();
      }
      const fps = 30,
        dur = activeShort.duration,
        frameCount = Math.floor(fps * dur);

      // Build audio tracks: video audio + optional voiceover
      const audioTracks: MediaStream[] = [];

      // Video audio
      if (vid && videoLoaded) {
        try {
          const actx = new AudioContext();
          const src = actx.createMediaElementSource(vid);
          const dest = actx.createMediaStreamDestination();
          src.connect(dest);
          src.connect(actx.destination);
          if (dest.stream.getAudioTracks().length > 0)
            audioTracks.push(dest.stream);
        } catch {}
      }

      // Voiceover audio (if generated)
      if (voiceAudio && voiceOn) {
        try {
          const voiceEl = new Audio(voiceAudio);
          voiceEl.volume = 0.85;
          const actx2 = new AudioContext();
          const src2 = actx2.createMediaElementSource(voiceEl);
          const dest2 = actx2.createMediaStreamDestination();
          src2.connect(dest2);
          src2.connect(actx2.destination);
          if (dest2.stream.getAudioTracks().length > 0)
            audioTracks.push(dest2.stream);
          voiceEl.play().catch(() => {});
        } catch {}
      }

      const canvasStream = canvas.captureStream(fps);
      let stream: MediaStream;
      if (audioTracks.length > 0) {
        const allAudio = audioTracks.flatMap((s) => s.getAudioTracks());
        stream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...allAudio,
        ]);
      } else {
        stream = canvasStream;
      }

      const mimeType = MediaRecorder.isTypeSupported(
        "video/webm;codecs=vp9,opus",
      )
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 6_000_000,
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        const safeName = (activeShort.title || activeShort.id)
          .replace(/[^a-z0-9]/gi, "-")
          .slice(0, 40);
        a.download = `viralcut-${safeName}.webm`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
        toast.success("✅ Short exported!");
        setExporting(false);
        setExportProgress(0);
      };
      recorder.start(100); // collect data every 100ms
      if (vid && videoLoaded) {
        vid.currentTime = activeShort.startTime;
        vid.muted = false;
        vid.play().catch(() => {
          vid.muted = true;
          vid.play().catch(() => {});
        });
      }

      // Render frames
      for (let f = 0; f < frameCount; f++) {
        if (!exporting && f > 0) break; // allow cancel
        const prog = f / frameCount,
          capTime = prog * dur;
        const seg = transcript.find(
          (t) => capTime >= t.start && capTime < t.start + t.dur,
        );
        drawFrame(canvas, {
          bg1: tpl.bg1,
          bg2: tpl.bg2,
          acc: editorState.present.accentColor || tpl.acc,
          hookText: hookText || activeShort.hookOverlay || "",
          capText: seg ? seg.text.split(" ").slice(0, 10).join(" ") : "",
          capStyleId: capStyle,
          cta: ctaText || activeShort.callToAction || "",
          progress: prog,
          videoEl: vid && videoLoaded && useVideoBackground ? vid : null,
          showVideoBackground: useVideoBackground,
        });
        setExportProgress(Math.round((f / frameCount) * 100));
        await new Promise((r) => setTimeout(r, 1000 / fps));
      }
      vid?.pause();
      recorder.stop();
    } catch (err) {
      toast.error("Export failed: " + String(err));
      setExporting(false);
      setExportProgress(0);
    }
  };

  // ── SERVER CLIP ───────────────────────────────────────────────────────────
  const downloadServerClip = async () => {
    const videoId = currentVideoIdRef.current;
    if (!videoId || !activeShort) {
      toast.error("No video selected");
      return;
    }
    setDownloading(true);
    toast.info("Server clipping with yt-dlp + ffmpeg...");
    try {
      const clipUrl = `/api/clip?videoId=${videoId}&start=${activeShort.startTime}&duration=${activeShort.duration}&mode=download&quality=sd&vertical=true`;
      const res = await fetch(clipUrl);
      if (res.ok) {
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `viralcut_${videoId}_${activeShort.startTime}s.mp4`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success("✅ Clip downloaded (9:16)!");
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(
          d.message ||
            "Server clip failed — install yt-dlp: pip install yt-dlp",
        );
        window.open(
          `https://youtube.com/watch?v=${videoId}&t=${activeShort.startTime}s`,
          "_blank",
        );
      }
    } catch {
      toast.error("Clip download failed");
    } finally {
      setDownloading(false);
    }
  };

  // ── BATCH EXPORT ──────────────────────────────────────────────────────────
  const batchExport = async () => {
    if (!shorts.length || !currentVideoIdRef.current) {
      toast.error("Analyze a video first");
      return;
    }
    setBatchExporting(true);
    try {
      const items = shorts.map((s) => ({
        videoId: currentVideoIdRef.current,
        startTime: s.startTime,
        duration: s.duration,
        title: s.title,
        hookOverlay: s.hookOverlay,
        captionStyle: s.captionStyle,
        accentColor: s.accentColor,
      }));
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, action: "plan" }),
      });
      const d = await res.json();
      if (d.ok) {
        const blob = new Blob([JSON.stringify(d.plan, null, 2)], {
          type: "application/json",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "viralcut-batch-export.json";
        a.click();
        toast.success(`Batch plan exported! ${d.total} clips queued 📦`);
      }
    } catch {
      toast.error("Batch export failed");
    } finally {
      setBatchExporting(false);
    }
  };

  // ── HOOKS & VOICE ─────────────────────────────────────────────────────────
  const regenHooks = async () => {
    if (!activeShort) return;
    setHooksLoading(true);
    try {
      const res = await fetch("/api/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: activeShort.title,
          style: activeShort.style,
          count: 8,
        }),
      });
      const data = await res.json();
      setHooks(data.hooks || []);
      toast.success("8 new hooks generated!");
    } catch {
      toast.error("Hook generation failed");
    } finally {
      setHooksLoading(false);
    }
  };

  const generateAbTest = async () => {
    if (!activeShort) return;
    setHooksLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/hooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: activeShort.title,
            style: activeShort.style,
            count: 1,
          }),
        }),
        fetch("/api/hooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: activeShort.title,
            style: "shock",
            count: 1,
          }),
        }),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      setAbHooks({ a: d1.hooks?.[0] || null, b: d2.hooks?.[0] || null });
      toast.success("A/B variants ready! Compare them 🆚");
    } catch {
      toast.error("A/B generation failed");
    } finally {
      setHooksLoading(false);
    }
  };

  const generateVoice = async () => {
    if (!activeShort || !voiceOn) return;
    setVoiceLoading(true);
    const voiceText =
      hookText ||
      activeShort.hookOverlay ||
      activeShort.hook ||
      activeShort.title;
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: voiceText, voice: selectedVoice }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error || "Voice generation failed");
        return;
      }

      if (data.audio) {
        // Got real audio (ElevenLabs / StreamElements / Google TTS)
        setVoiceAudio(data.audio);
        const providerLabel =
          data.provider === "elevenlabs"
            ? "ElevenLabs AI 🎙️"
            : data.provider === "streamelements"
              ? `StreamElements (${data.voice}) 🔊`
              : "Google TTS 🔊";
        toast.success(`Voiceover ready! ${providerLabel}`);
      } else if (data.useBrowserTTS) {
        // Browser speech synthesis fallback
        setVoiceAudio(null);
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const utter = new SpeechSynthesisUtterance(data.text || voiceText);
          utter.rate = 0.95;
          utter.pitch = 1;
          utter.volume = 1;
          // Try to find a good English voice
          const voices = speechSynthesis.getVoices();
          const engVoice =
            voices.find(
              (v) => v.lang.startsWith("en") && v.name.includes("Google"),
            ) ||
            voices.find((v) => v.lang.startsWith("en-US")) ||
            voices[0];
          if (engVoice) utter.voice = engVoice;
          speechSynthesis.speak(utter);
          toast.info(
            "🔊 Playing via browser speech synthesis (add ELEVENLABS_API_KEY for audio export)",
          );
        } else {
          toast.error("Browser speech synthesis not available");
        }
      }
    } catch {
      toast.error("Voice generation failed");
    } finally {
      setVoiceLoading(false);
    }
  };

  const retryNextVideoSource = async () => {
    if (!clipInfo || !activeShort) return;
    setVideoLoading(true);
    setVideoError(null);
    await tryLoadVideoSource(
      clipInfo.sources,
      videoSourceIdx + 1,
      activeShort.startTime,
    );
  };

  const playMusic = (track: MusicTrack) => {
    setSelectedMusic(track.id);
    if (audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.volume = musicVol / 100;
      audioRef.current.play().catch(() => {});
      setMusicPlaying(true);
    }
  };

  const displayHooks: HookItem[] =
    hooks.length > 0
      ? hooks
      : [
          {
            text: "NOBODY TELLS YOU THIS",
            type: "secret",
            emoji: "🤫",
            subtext: "insider truth",
          },
          {
            text: "I TRIED IT FOR 30 DAYS",
            type: "challenge",
            emoji: "📅",
            subtext: "real results",
          },
          {
            text: "THIS CHANGED EVERYTHING",
            type: "transformation",
            emoji: "🔄",
            subtext: "life before vs after",
          },
          {
            text: "STOP DOING THIS NOW",
            type: "warning",
            emoji: "⚠️",
            subtext: "common mistake",
          },
          {
            text: "WATCH TILL THE END",
            type: "curiosity",
            emoji: "👀",
            subtext: "best part saved",
          },
          {
            text: "POV YOU FINALLY WIN",
            type: "emotional",
            emoji: "🏆",
            subtext: "relatable victory",
          },
        ];

  const undoCount = editorState.past.length;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="factory-shell">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        style={{ display: "none" }}
        crossOrigin="anonymous"
        preload="auto"
        playsInline
      />
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} loop onEnded={() => setMusicPlaying(false)} />

      {/* TOPBAR */}
      <div className="factory-topbar">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 16,
                pointerEvents: "none",
              }}
            >
              🔗
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
              placeholder="https://youtube.com/watch?v=..."
              style={{ paddingLeft: 34 }}
            />
          </div>
          <select
            value={count}
            onChange={(e) => setCount(+e.target.value)}
            style={{ width: 95 }}
          >
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n} Shorts
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            onClick={analyze}
            disabled={analyzing || !url.trim()}
          >
            {analyzing ? (
              <>
                <div className="spin" style={{ borderTopColor: "#fff" }} />
                Analyzing...
              </>
            ) : (
              <>
                <span>⚡</span>Analyze
              </>
            )}
          </button>
          {analyzed && (
            <button
              className="btn btn-outline btn-sm"
              onClick={exportWebm}
              disabled={exporting}
              title="E"
            >
              {exporting ? (
                <>
                  <div className="spin spin-sm" />
                  Exporting {exportProgress}%
                </>
              ) : (
                "📤 Export"
              )}
            </button>
          )}
          {analyzed && activeShort && currentVideoIdRef.current && (
            <button
              className="btn btn-success btn-sm"
              onClick={downloadServerClip}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <div
                    className="spin spin-sm"
                    style={{ borderTopColor: "#fff" }}
                  />
                  Clipping...
                </>
              ) : (
                "⬇️ Server Clip"
              )}
            </button>
          )}
          {analyzed && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={batchExport}
              disabled={batchExporting}
              title="Batch export all shorts"
            >
              {batchExporting ? (
                <>
                  <div className="spin spin-sm" />
                  ...
                </>
              ) : (
                "📦 Batch"
              )}
            </button>
          )}
          {undoCount > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                editorDispatch({ type: "UNDO" });
                toast.info("Undone ↩");
              }}
              title="Ctrl+Z"
            >
              ↩ Undo ({undoCount})
            </button>
          )}
          <div
            style={{
              marginLeft: "auto",
              fontSize: 10,
              color: "var(--text-4)",
              fontFamily: "var(--mono)",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 1,
            }}
          >
            <span>Space=play · E=export · ←→=prev/next</span>
            <span>1-8=templates · Ctrl+Z=undo</span>
          </div>
        </div>

        {videoMeta && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 10,
              padding: "8px 10px",
              background: "var(--bg-2)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={videoMeta.thumbnail}
              alt=""
              style={{
                width: 56,
                height: 36,
                borderRadius: 5,
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {videoMeta.title}
              </div>
              <div
                style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}
              >
                {videoMeta.channel} · {(videoMeta.viewCount / 1000).toFixed(0)}K
                views · {shorts.length} shorts
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexShrink: 0,
                alignItems: "center",
              }}
            >
              {videoLoading && (
                <>
                  <div
                    className="spin spin-sm"
                    style={{ borderTopColor: "var(--brand)" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                    Loading...
                  </span>
                </>
              )}
              {videoLoaded && (
                <span className="badge badge-green" style={{ fontSize: 10 }}>
                  🎬 Video Active
                </span>
              )}
              {showEmbedPlayer && !videoLoaded && (
                <span className="badge badge-cyan" style={{ fontSize: 10 }}>
                  📺 Embed
                </span>
              )}
              {videoError &&
                !videoLoading &&
                !videoLoaded &&
                !showEmbedPlayer && (
                  <span className="badge badge-orange" style={{ fontSize: 10 }}>
                    ⚠ Template
                  </span>
                )}
              <span className="badge badge-brand" style={{ fontSize: 10 }}>
                Groq AI ✓
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3-COL */}
      <div className="factory-3col">
        {/* LEFT */}
        <div className="factory-left">
          <div
            style={{
              padding: "12px 14px 10px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div className="slabel">
              {analyzed ? `${shorts.length} SHORTS` : "READY"}
            </div>
            {analyzed && (
              <div style={{ display: "flex", gap: 5 }}>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => goToShort(activeShortIdx - 1)}
                  disabled={activeShortIdx === 0}
                >
                  ‹
                </button>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    color: "var(--text-4)",
                    alignSelf: "center",
                  }}
                >
                  {activeShortIdx + 1}/{shorts.length}
                </span>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => goToShort(activeShortIdx + 1)}
                  disabled={activeShortIdx >= shorts.length - 1}
                >
                  ›
                </button>
              </div>
            )}
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {!analyzed ? (
              <div className="empty">
                <div className="empty-icon">⚡</div>
                <div className="empty-title">Paste a YouTube URL</div>
                <div className="empty-desc">
                  AI finds viral moments automatically
                </div>
              </div>
            ) : (
              shorts.map((s, idx) => (
                <div
                  key={s.id}
                  className={`short-card ${activeShort?.id === s.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveShort(s);
                    setActiveShortIdx(idx);
                    setProgress(0);
                    stopPlay();
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginBottom: 7,
                      flexWrap: "wrap",
                    }}
                  >
                    <span className={scoreClass(s.viralScore)}>
                      {s.viralScore}
                    </span>
                    <span className="badge badge-gray">{s.style}</span>
                    {activeShort?.id === s.id && videoLoaded && (
                      <span
                        className="badge badge-green"
                        style={{ fontSize: 9 }}
                      >
                        🎬 live
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      lineHeight: 1.35,
                      marginBottom: 4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-3)",
                      fontStyle: "italic",
                      marginBottom: 8,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {s.hook}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      color: "var(--text-4)",
                    }}
                  >
                    <span>
                      {fmtTime(s.startTime)} → {fmtTime(s.endTime)}
                    </span>
                    <span>·</span>
                    <span>{s.duration}s</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CENTER */}
        <div className="factory-center">
          {!analyzed ? (
            <div className="empty" style={{ color: "var(--text-3)" }}>
              <div className="empty-icon">🎬</div>
              <div className="empty-title" style={{ color: "var(--text-2)" }}>
                Canvas Preview
              </div>
              <div className="empty-desc">
                Paste a YouTube URL and click Analyze
              </div>
            </div>
          ) : (
            <>
              <div className="canvas-area">
                <div className="canvas-glow-wrap">
                  <canvas
                    ref={canvasRef}
                    width={360}
                    height={640}
                    style={{
                      borderRadius: 14,
                      display: showEmbedPlayer ? "none" : "block",
                    }}
                  />
                  {showEmbedPlayer && clipInfo && (
                    <div
                      style={{
                        position: "relative",
                        width: 360,
                        height: 640,
                        borderRadius: 14,
                        overflow: "hidden",
                        background: "#000",
                      }}
                    >
                      <iframe
                        src={`https://www.youtube.com/embed/${currentVideoIdRef.current}?start=${activeShort?.startTime || 0}&autoplay=0&rel=0&modestbranding=1`}
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "none",
                        }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: "8px 12px",
                          background:
                            "linear-gradient(transparent,rgba(0,0,0,0.9))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: "rgba(255,255,255,0.7)",
                          }}
                        >
                          📺 Embed preview — canvas mode for export
                        </span>
                        <button
                          style={{
                            fontSize: 10,
                            color: "var(--brand)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                          onClick={() => setShowEmbedPlayer(false)}
                        >
                          ← Canvas
                        </button>
                      </div>
                    </div>
                  )}
                  {videoLoading && (
                    <div
                      style={{
                        position: "absolute",
                        top: 16,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(0,0,0,0.7)",
                        backdropFilter: "blur(8px)",
                        borderRadius: 20,
                        padding: "6px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        zIndex: 20,
                      }}
                    >
                      <div
                        className="spin spin-sm"
                        style={{ borderTopColor: "var(--brand)" }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.8)",
                          fontWeight: 600,
                        }}
                      >
                        Loading video...
                      </span>
                    </div>
                  )}
                  {videoLoaded && !showEmbedPlayer && (
                    <div
                      style={{
                        position: "absolute",
                        top: 16,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(0,180,100,0.85)",
                        backdropFilter: "blur(8px)",
                        borderRadius: 20,
                        padding: "5px 12px",
                        zIndex: 20,
                      }}
                    >
                      <span
                        style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}
                      >
                        🎬 REAL VIDEO
                      </span>
                    </div>
                  )}
                  {videoError &&
                    !videoLoading &&
                    !videoLoaded &&
                    !showEmbedPlayer &&
                    clipInfo && (
                      <div
                        style={{
                          position: "absolute",
                          top: 16,
                          left: "50%",
                          transform: "translateX(-50%)",
                          zIndex: 20,
                        }}
                      >
                        <button
                          style={{
                            background: "rgba(255,140,66,0.9)",
                            border: "none",
                            borderRadius: 20,
                            padding: "5px 12px",
                            fontSize: 10,
                            color: "#fff",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                          onClick={() => setShowEmbedPlayer(true)}
                        >
                          📺 Show Embed Player
                        </button>
                      </div>
                    )}
                </div>
                <div className="playback-bar">
                  <button
                    className="ctrl-btn"
                    onClick={() => {
                      stopPlay();
                      setProgress(0);
                    }}
                  >
                    ⏮
                  </button>
                  <button
                    className="ctrl-btn"
                    onClick={() => {
                      if (playing) stopPlay();
                      else startPlay();
                    }}
                  >
                    {playing ? "⏸" : "▶"}
                  </button>
                  <button
                    className="ctrl-btn"
                    onClick={() => {
                      stopPlay();
                      setProgress(0);
                    }}
                  >
                    ⏹
                  </button>
                  <input
                    type="range"
                    style={{
                      width: 140,
                      accentColor: "var(--brand)",
                      cursor: "pointer",
                      height: 3,
                    }}
                    min={0}
                    max={100}
                    value={Math.round(progress * 100)}
                    onChange={(e) => {
                      stopPlay();
                      const p = +e.target.value / 100;
                      setProgress(p);
                      redraw(p);
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      color: "rgba(255,255,255,0.5)",
                      minWidth: 72,
                    }}
                  >
                    {fmtTime(progress * (activeShort?.duration || 65))} /{" "}
                    {fmtTime(activeShort?.duration || 65)}
                  </span>
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    zIndex: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    alignItems: "flex-end",
                  }}
                >
                  {activeShort && (
                    <span
                      className={`${scoreClass(activeShort.viralScore)} badge`}
                    >
                      {activeShort.viralScore}
                    </span>
                  )}
                  <button
                    style={{
                      background: useVideoBackground
                        ? "rgba(0,229,160,0.15)"
                        : "rgba(255,255,255,0.07)",
                      border: `1px solid ${useVideoBackground ? "rgba(0,229,160,0.3)" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: 8,
                      padding: "3px 8px",
                      fontSize: 9,
                      fontWeight: 700,
                      color: useVideoBackground
                        ? "var(--green)"
                        : "rgba(255,255,255,0.4)",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setUseVideoBackground((v) => !v);
                      redraw(progress);
                    }}
                  >
                    {useVideoBackground ? "🎬 Video BG" : "🎨 Template BG"}
                  </button>
                </div>
              </div>
              <div className="template-bar">
                {TEMPLATES.map((t, i) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      editorDispatch({ type: "SET_TEMPLATE", val: t.id })
                    }
                    title={`${t.name} (${i + 1})`}
                  >
                    <div
                      className={`tpl-swatch ${template === t.id ? "active" : ""}`}
                      style={{
                        background: `linear-gradient(180deg,${t.bg1},${t.bg2})`,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 9,
                        color: "rgba(255,255,255,0.4)",
                        marginTop: 3,
                      }}
                    >
                      {t.name}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* RIGHT */}
        <div className="factory-right">
          <div className="rpanel-tabs">
            {(
              [
                "style",
                "hooks",
                "captions",
                "voice",
                "music",
                "titles",
                "video",
              ] as const
            ).map((t) => (
              <button
                key={t}
                className={`rpanel-tab ${rpTab === t ? "active" : ""}`}
                onClick={() => setRpTab(t)}
              >
                {t === "style"
                  ? "Style"
                  : t === "hooks"
                    ? "Hooks"
                    : t === "captions"
                      ? "Caps"
                      : t === "voice"
                        ? "Voice"
                        : t === "music"
                          ? "🎵"
                          : t === "titles"
                            ? "Titles"
                            : "Video"}
              </button>
            ))}
          </div>
          <div className="rpanel-body">
            {!analyzed ? (
              <div className="empty" style={{ padding: 30 }}>
                <div className="empty-icon">🎛️</div>
                <div className="empty-title">No short selected</div>
              </div>
            ) : (
              <>
                {rpTab === "style" && (
                  <div>
                    <div className="slabel" style={{ marginBottom: 8 }}>
                      TEMPLATE{" "}
                      <span style={{ color: "var(--text-4)", fontSize: 9 }}>
                        (keys 1-8)
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4,1fr)",
                        gap: 6,
                        marginBottom: 14,
                      }}
                    >
                      {TEMPLATES.map((t) => (
                        <div
                          key={t.id}
                          style={{
                            aspectRatio: "2/3",
                            borderRadius: 6,
                            cursor: "pointer",
                            border: `2px solid ${template === t.id ? t.acc : "transparent"}`,
                            background: `linear-gradient(180deg,${t.bg1},${t.bg2})`,
                            transition: "all 0.18s",
                            boxShadow:
                              template === t.id
                                ? `0 0 12px ${t.acc}40`
                                : "none",
                          }}
                          onClick={() =>
                            editorDispatch({ type: "SET_TEMPLATE", val: t.id })
                          }
                          title={t.name}
                        />
                      ))}
                    </div>
                    <div className="divider" />
                    <div className="slabel" style={{ marginBottom: 8 }}>
                      CAPTION STYLE
                    </div>
                    {CAP_STYLES.map((cs) => (
                      <div
                        key={cs.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 10px",
                          border: `1.5px solid ${capStyle === cs.id ? "var(--brand)" : "var(--border)"}`,
                          borderRadius: "var(--radius-xs)",
                          cursor: "pointer",
                          marginBottom: 5,
                          background:
                            capStyle === cs.id
                              ? "var(--brand-lt)"
                              : "transparent",
                          transition: "all 0.13s",
                        }}
                        onClick={() =>
                          editorDispatch({ type: "SET_CAP", val: cs.id })
                        }
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: capStyle === cs.id ? 700 : 500,
                            color:
                              capStyle === cs.id
                                ? "var(--brand)"
                                : "var(--text-2)",
                          }}
                        >
                          {cs.name}
                        </span>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color:
                              cs.id === "neon"
                                ? "#67e8f9"
                                : cs.id === "yellow"
                                  ? "#fde047"
                                  : "#fff",
                          }}
                        >
                          Aa
                        </span>
                      </div>
                    ))}
                    <div className="divider" />
                    <div style={{ marginBottom: 12 }}>
                      <label>Hook Overlay</label>
                      <input
                        value={hookText}
                        onChange={(e) =>
                          editorDispatch({
                            type: "SET_HOOK",
                            val: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="HOOK MAX 5 WORDS"
                        style={{
                          fontFamily: "var(--mono)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label>Call to Action</label>
                      <input
                        value={ctaText}
                        onChange={(e) =>
                          editorDispatch({
                            type: "SET_CTA",
                            val: e.target.value,
                          })
                        }
                        placeholder="Subscribe! 🔥"
                      />
                    </div>
                    {activeShort?.why && (
                      <>
                        <div className="divider" />
                        <div className="slabel" style={{ marginBottom: 7 }}>
                          AI RATIONALE
                        </div>
                        <div
                          style={{
                            background: "rgba(108,92,231,0.06)",
                            border: "1px solid rgba(108,92,231,0.18)",
                            borderRadius: "var(--radius-sm)",
                            padding: "10px 12px",
                            fontSize: 12,
                            color: "var(--text-3)",
                            lineHeight: 1.6,
                          }}
                        >
                          {activeShort.why}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {rpTab === "hooks" && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <div className="slabel">AI HOOKS</div>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={generateAbTest}
                          disabled={hooksLoading}
                        >
                          🆚 A/B
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={regenHooks}
                          disabled={hooksLoading}
                        >
                          {hooksLoading ? (
                            <>
                              <div className="spin spin-sm" />
                              ...
                            </>
                          ) : (
                            "↺ Regen"
                          )}
                        </button>
                      </div>
                    </div>
                    {/* A/B Test */}
                    {(abHooks.a || abHooks.b) && (
                      <div style={{ marginBottom: 12 }}>
                        <div className="slabel" style={{ marginBottom: 6 }}>
                          A/B TEST VARIANTS
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 6,
                            marginBottom: 8,
                          }}
                        >
                          {[abHooks.a, abHooks.b].map((h, i) =>
                            h ? (
                              <div
                                key={i}
                                onClick={() => {
                                  editorDispatch({
                                    type: "SET_HOOK",
                                    val: h.text,
                                  });
                                  toast.success(
                                    `Variant ${i === 0 ? "A" : "B"} applied!`,
                                  );
                                }}
                                style={{
                                  padding: "8px 10px",
                                  border: "1.5px solid var(--border)",
                                  borderRadius: "var(--radius-sm)",
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                  background: "var(--bg-2)",
                                }}
                              >
                                <div
                                  style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: 9,
                                    fontWeight: 700,
                                    color:
                                      i === 0 ? "var(--cyan)" : "var(--orange)",
                                    marginBottom: 4,
                                  }}
                                >
                                  VARIANT {i === 0 ? "A" : "B"}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {h.text}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "var(--text-4)",
                                    marginTop: 3,
                                  }}
                                >
                                  {h.emoji} {h.type}
                                </div>
                              </div>
                            ) : null,
                          )}
                        </div>
                      </div>
                    )}
                    {displayHooks.map((h, i) => (
                      <div
                        key={i}
                        className={`hook-card ${appliedHook === i ? "applied" : ""}`}
                        onClick={() => {
                          setAppliedHook(i);
                          editorDispatch({ type: "SET_HOOK", val: h.text });
                          toast.success(`Hook: "${h.text}"`);
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{h.emoji}</span>
                          <span style={{ fontSize: 13, fontWeight: 800 }}>
                            {h.text}
                          </span>
                          <span
                            className="badge badge-gray"
                            style={{ marginLeft: "auto", fontSize: 10 }}
                          >
                            {h.type}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                          {h.subtext}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {rpTab === "captions" && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <div className="slabel">
                        CAPTIONS ({transcript.length})
                      </div>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={transcribeWithWhisper}
                        disabled={transcribing}
                        title="Load YouTube captions or Whisper AI"
                      >
                        {transcribing ? (
                          <>
                            <div className="spin spin-sm" />
                            ...
                          </>
                        ) : (
                          "🎤 Load Captions"
                        )}
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 5,
                        flexWrap: "wrap",
                        marginBottom: 12,
                      }}
                    >
                      {CAP_STYLES.map((cs) => (
                        <button
                          key={cs.id}
                          className={`btn btn-xs ${capStyle === cs.id ? "btn-primary" : "btn-ghost"}`}
                          onClick={() =>
                            editorDispatch({ type: "SET_CAP", val: cs.id })
                          }
                        >
                          {cs.name}
                        </button>
                      ))}
                    </div>
                    {!transcript.length && (
                      <div
                        style={{
                          padding: "10px 12px",
                          background: "var(--orange-lt)",
                          border: "1px solid rgba(255,140,66,0.2)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 12,
                          color: "var(--orange)",
                          marginBottom: 10,
                          lineHeight: 1.6,
                        }}
                      >
                        No captions loaded yet.
                        <br />
                        Click <strong>🎤 Load Captions</strong> to fetch YouTube
                        auto-captions or run Whisper AI transcription.
                      </div>
                    )}
                    {transcript.map((seg, i) => (
                      <div
                        key={i}
                        className={`cap-seg ${activeCapSeg === i ? "active" : ""}`}
                        onClick={() => {
                          setActiveCapSeg(i);
                          const p = seg.start / (activeShort?.duration || 65);
                          setProgress(p);
                          redraw(p);
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: 10,
                            color: "var(--text-4)",
                            marginRight: 6,
                          }}
                        >
                          {fmtTime(seg.start)}
                        </span>
                        {seg.text}
                      </div>
                    ))}
                  </div>
                )}

                {rpTab === "voice" && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>
                          AI Voiceover
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                          {process.env.NEXT_PUBLIC_APP_URL
                            ? "ElevenLabs → StreamElements → Google TTS"
                            : "StreamElements → Google TTS → Browser"}
                        </div>
                      </div>
                      <button
                        className={`toggle ${voiceOn ? "on" : ""}`}
                        onClick={() => setVoiceOn((v) => !v)}
                      />
                    </div>
                    <div
                      style={{
                        marginBottom: 12,
                        padding: "8px 10px",
                        background: "var(--bg-2)",
                        borderRadius: "var(--radius-xs)",
                        fontSize: 11,
                        color: "var(--text-3)",
                        lineHeight: 1.5,
                      }}
                    >
                      💡 Free TTS works without any API key. Add
                      ELEVENLABS_API_KEY in Settings for premium voices.
                    </div>
                    {VOICES.map((v) => (
                      <div
                        key={v.id}
                        className={`voice-card ${selectedVoice === v.id ? "active" : ""}`}
                        onClick={() => setSelectedVoice(v.id)}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "rgba(108,92,231,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 17,
                            flexShrink: 0,
                          }}
                        >
                          {v.emoji}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {v.name}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                            {v.desc}
                          </div>
                        </div>
                        {selectedVoice === v.id && (
                          <span style={{ color: "var(--brand)", fontSize: 16 }}>
                            ✓
                          </span>
                        )}
                      </div>
                    ))}
                    <button
                      className="btn btn-primary"
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        marginTop: 14,
                      }}
                      onClick={generateVoice}
                      disabled={!voiceOn || voiceLoading}
                    >
                      {voiceLoading ? (
                        <>
                          <div
                            className="spin"
                            style={{ borderTopColor: "#fff" }}
                          />
                          Generating...
                        </>
                      ) : (
                        "🎙️ Generate Voiceover"
                      )}
                    </button>
                    {voiceAudio && (
                      <div style={{ marginTop: 12 }}>
                        <audio
                          src={voiceAudio}
                          controls
                          style={{ width: "100%" }}
                        />
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--text-4)",
                            marginTop: 4,
                            textAlign: "center",
                          }}
                        >
                          Audio will be included in canvas export if you
                          re-export after generating
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {rpTab === "music" && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <div className="slabel">BACKGROUND MUSIC</div>
                      {musicPlaying && (
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => {
                            audioRef.current?.pause();
                            setMusicPlaying(false);
                          }}
                        >
                          ⏹ Stop
                        </button>
                      )}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label>Volume</label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={musicVol}
                          onChange={(e) => {
                            setMusicVol(+e.target.value);
                            if (audioRef.current)
                              audioRef.current.volume = +e.target.value / 100;
                          }}
                          style={{ flex: 1, accentColor: "var(--green)" }}
                        />
                        <span
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: 11,
                            color: "var(--green)",
                            minWidth: 30,
                          }}
                        >
                          {musicVol}%
                        </span>
                      </div>
                    </div>
                    {musicLibrary.map((m) => (
                      <div
                        key={m.id}
                        onClick={() =>
                          selectedMusic === m.id && musicPlaying
                            ? (() => {
                                audioRef.current?.pause();
                                setMusicPlaying(false);
                              })()
                            : playMusic(m)
                        }
                        style={{
                          padding: "9px 11px",
                          borderRadius: "var(--radius-sm)",
                          marginBottom: 6,
                          border: `1px solid ${selectedMusic === m.id ? "var(--green)" : "var(--border)"}`,
                          background:
                            selectedMusic === m.id
                              ? "var(--green-lt)"
                              : "transparent",
                          cursor: "pointer",
                          transition: "all 0.13s",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 16 }}>
                            {selectedMusic === m.id && musicPlaying ? "⏸" : "▶"}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>
                              {m.name}
                            </div>
                            <div
                              style={{ fontSize: 10, color: "var(--text-4)" }}
                            >
                              {m.mood} · {m.bpm} BPM
                            </div>
                          </div>
                          {selectedMusic === m.id && (
                            <span
                              className="badge badge-green"
                              style={{ fontSize: 9 }}
                            >
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        marginTop: 10,
                        padding: "9px 11px",
                        background: "var(--orange-lt)",
                        border: "1px solid rgba(255,140,66,0.2)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 11,
                        color: "var(--orange)",
                        lineHeight: 1.6,
                      }}
                    >
                      🎵 Music plays in browser for preview. Use Video Editor
                      for full timeline mixing with export.
                    </div>
                  </div>
                )}

                {rpTab === "titles" && activeShort && (
                  <div>
                    <div style={{ marginBottom: 14 }}>
                      <label>Custom Title</label>
                      <input defaultValue={activeShort.title} />
                    </div>
                    <div className="slabel" style={{ marginBottom: 8 }}>
                      AI SUGGESTED
                    </div>
                    <div
                      style={{
                        background: "var(--bg-2)",
                        border: "1px solid var(--border-2)",
                        borderRadius: "var(--radius-sm)",
                        padding: "11px 13px",
                        marginBottom: 14,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        navigator.clipboard
                          .writeText(activeShort.suggestedTitle || "")
                          .catch(() => {});
                        toast.success("Copied!");
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 5,
                        }}
                      >
                        {activeShort.suggestedTitle ||
                          activeShort.title + " #shorts"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--brand)" }}>
                        Click to copy
                      </div>
                    </div>
                    <div className="slabel" style={{ marginBottom: 8 }}>
                      HASHTAGS
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 7,
                        marginBottom: 14,
                      }}
                    >
                      {(activeShort.suggestedTags || []).map((tag, i) => (
                        <span
                          key={i}
                          className="badge badge-brand"
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            navigator.clipboard
                              .writeText(`#${tag}`)
                              .catch(() => {});
                            toast.success(`#${tag} copied!`);
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => router.push(`/calendar`)}
                      >
                        📅 Schedule
                      </button>
                      <a
                        href={`https://youtube.com/watch?v=${currentVideoIdRef.current}&t=${activeShort.startTime}s`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm"
                        style={{ textDecoration: "none" }}
                      >
                        Source ↗
                      </a>
                    </div>
                  </div>
                )}

                {rpTab === "video" && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <div className="slabel" style={{ margin: 0 }}>
                        VIDEO BACKGROUND
                      </div>
                      <button
                        className={`toggle ${useVideoBackground ? "on" : ""}`}
                        onClick={() => setUseVideoBackground((v) => !v)}
                      />
                    </div>
                    {clipInfo && (
                      <div
                        style={{ display: "flex", gap: 6, marginBottom: 10 }}
                      >
                        <button
                          className={`btn btn-xs ${!showEmbedPlayer ? "btn-primary" : "btn-ghost"}`}
                          onClick={() => setShowEmbedPlayer(false)}
                        >
                          🎨 Canvas
                        </button>
                        <button
                          className={`btn btn-xs ${showEmbedPlayer ? "btn-primary" : "btn-ghost"}`}
                          onClick={() => setShowEmbedPlayer(true)}
                        >
                          📺 Embed
                        </button>
                        {!videoLoaded && !videoLoading && (
                          <button
                            className="btn btn-xs btn-outline"
                            onClick={() => {
                              if (activeShort) loadVideoForShort(activeShort);
                            }}
                          >
                            ↺ Retry
                          </button>
                        )}
                      </div>
                    )}
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        marginBottom: 12,
                        border: "1px solid",
                        ...(videoLoaded
                          ? {
                              background: "rgba(0,229,160,0.07)",
                              borderColor: "rgba(0,229,160,0.25)",
                            }
                          : showEmbedPlayer
                            ? {
                                background: "rgba(0,212,255,0.07)",
                                borderColor: "rgba(0,212,255,0.25)",
                              }
                            : videoLoading
                              ? {
                                  background: "rgba(108,92,231,0.07)",
                                  borderColor: "rgba(108,92,231,0.2)",
                                }
                              : {
                                  background: "rgba(255,140,66,0.07)",
                                  borderColor: "rgba(255,140,66,0.2)",
                                }),
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: videoLoaded
                            ? "var(--green)"
                            : showEmbedPlayer
                              ? "var(--cyan)"
                              : videoLoading
                                ? "var(--brand)"
                                : "var(--orange)",
                          marginBottom: 4,
                        }}
                      >
                        {videoLoaded
                          ? "✅ Real video active"
                          : showEmbedPlayer
                            ? "📺 Embed player active"
                            : videoLoading
                              ? "⏳ Loading..."
                              : "⚠️ Template background"}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-3)",
                          lineHeight: 1.5,
                        }}
                      >
                        {videoError ||
                          (videoLoaded
                            ? `Source: ${clipInfo?.sources[videoSourceIdx]?.source}`
                            : showEmbedPlayer
                              ? "YT embed for preview — use canvas export for styled output"
                              : "Video loads after analysis")}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        marginBottom: 14,
                      }}
                    >
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ justifyContent: "center" }}
                        onClick={exportWebm}
                        disabled={exporting}
                      >
                        {exporting
                          ? `Exporting ${exportProgress}%`
                          : "📤 Export Canvas (.webm)"}
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        style={{ justifyContent: "center" }}
                        onClick={downloadServerClip}
                        disabled={downloading}
                      >
                        {downloading
                          ? "⏳ Clipping..."
                          : "⬇️ Server Clip (yt-dlp)"}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ justifyContent: "center" }}
                        onClick={batchExport}
                        disabled={batchExporting}
                      >
                        {batchExporting
                          ? "⏳..."
                          : "📦 Batch Export All Shorts"}
                      </button>
                    </div>
                    {clipInfo && (
                      <>
                        <div className="slabel" style={{ marginBottom: 8 }}>
                          VIDEO SOURCES ({clipInfo.sources.length})
                        </div>
                        {clipInfo.sources.slice(0, 5).map((src, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "7px 10px",
                              border: `1px solid ${i === videoSourceIdx && videoLoaded ? "rgba(0,229,160,0.3)" : "var(--border)"}`,
                              borderRadius: "var(--radius-sm)",
                              background:
                                i === videoSourceIdx && videoLoaded
                                  ? "var(--green-lt)"
                                  : "transparent",
                              fontSize: 11,
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--mono)",
                                fontSize: 9,
                                color: "var(--text-4)",
                              }}
                            >
                              #{i + 1}
                            </span>
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: "var(--text-2)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {src.source}
                              </div>
                              <div style={{ color: "var(--text-4)" }}>
                                {src.quality}
                              </div>
                            </div>
                            {i === videoSourceIdx && videoLoaded ? (
                              <span
                                className="badge badge-green"
                                style={{ fontSize: 9 }}
                              >
                                Active
                              </span>
                            ) : (
                              <button
                                className="btn btn-ghost btn-xs"
                                style={{ fontSize: 10, padding: "2px 7px" }}
                                onClick={() =>
                                  tryLoadVideoSource(
                                    clipInfo.sources,
                                    i,
                                    activeShort?.startTime || 0,
                                  )
                                }
                              >
                                Try
                              </button>
                            )}
                          </div>
                        ))}
                        {videoError && !videoLoaded && (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{
                              width: "100%",
                              justifyContent: "center",
                              marginTop: 10,
                            }}
                            onClick={retryNextVideoSource}
                          >
                            ↺ Try Next Source
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

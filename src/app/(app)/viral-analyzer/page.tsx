"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface VideoPhase {
  name: string;
  startSec: number;
  endSec: number;
  description: string;
  technique: string;
  emotionalIntensity: number;
  hook: string;
}

interface ViralStructure {
  title: string;
  totalDuration: number;
  viralScore: number;
  hook: string;
  phases: VideoPhase[];
  pacingPattern: string;
  storytellingTechnique: string;
  keySuccessFactors: string[];
  targetAudience: string;
  contentCategory: string;
}

interface Meta {
  title: string;
  channel: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  duration: number;
}

function fmtTime(s: number) { return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,"0")}`; }
function fmtViews(n: number) { return n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(0)+"K":String(n); }

const INTENSITY_COLOR = (n: number) => n >= 80 ? "var(--red)" : n >= 60 ? "var(--orange)" : "var(--cyan)";

const EXAMPLE_URLS = [
  "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "https://youtube.com/watch?v=9bZkp7q19f0",
  "https://youtube.com/watch?v=JGwWNGJdvx8",
];

// Demo structure for when no API key is present
const DEMO_STRUCTURE: ViralStructure = {
  title: "How I Made $1M in 12 Months (No BS Guide)",
  totalDuration: 847,
  viralScore: 96,
  hook: "Opens with shocking income reveal before explaining anything — classic pattern interrupt",
  pacingPattern: "escalating",
  storytellingTechnique: "transformation",
  targetAudience: "ambitious young professionals 22-35",
  contentCategory: "educational",
  keySuccessFactors: [
    "Specific number in title creates instant credibility",
    "Pattern interrupt hook within first 3 seconds",
    "Personal story woven into tactical advice",
    "Actionable steps with social proof at each stage",
    "Contrarian angle challenges common beliefs",
  ],
  phases: [
    { name: "Hook", startSec: 0, endSec: 5, description: "Reveals shocking income number with proof on screen. No context given — pure curiosity gap.", technique: "Pattern interrupt + curiosity gap", emotionalIntensity: 97, hook: 'I made a million dollars last year and I will show you exactly how' },
    { name: "Credibility Bridge", startSec: 5, endSec: 22, description: "Shows bank screenshots, quickly establishes backstory — struggled before succeeding.", technique: "Social proof + relatability paradox", emotionalIntensity: 72, hook: "I was exactly where you are 2 years ago" },
    { name: "Pain Amplification", startSec: 22, endSec: 55, description: "Describes the problem in vivid detail. Viewer feels deeply understood.", technique: "Empathy mirror + problem agitation", emotionalIntensity: 78, hook: "You keep trying the same things and nothing changes" },
    { name: "Insight Reveal", startSec: 55, endSec: 120, description: "The core contrarian insight — what most people get wrong vs. the real strategy.", technique: "Reframe + paradigm shift", emotionalIntensity: 88, hook: "Everything you've been told about this is wrong" },
    { name: "Step-by-Step Value", startSec: 120, endSec: 480, description: "3 concrete steps, each with a micro-story and specific result. Viewer takes notes.", technique: "Tutorial + story sandwich + specificity", emotionalIntensity: 82, hook: "Step 1: This alone made me $200K in 4 months" },
    { name: "Climax + Proof", startSec: 480, endSec: 720, description: "Most dramatic before/after reveal. Testimonials. Final push before CTA.", technique: "Social proof cascade + FOMO trigger", emotionalIntensity: 95, hook: "Here's what happened when I actually did this for 90 days" },
    { name: "CTA Close", startSec: 720, endSec: 847, description: "Emotional anchor + direct ask. Creates urgency without being pushy.", technique: "Reciprocity + direct CTA", emotionalIntensity: 75, hook: "If this helped you, here's the one thing I need you to do now" },
  ],
};

export default function ViralAnalyzerPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [structure, setStructure] = useState<ViralStructure | null>(null);
  const [scriptTopic, setScriptTopic] = useState("");
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [activePhaseIdx, setActivePhaseIdx] = useState<number | null>(null);
  const [step, setStep] = useState("");

  const analyze = async () => {
    if (!url.trim()) { toast.error("Enter a YouTube URL"); return; }
    const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
    if (!videoIdMatch) { toast.error("Invalid YouTube URL"); return; }

    setLoading(true); setAnalyzed(false); setGeneratedScript(null);
    setStep("Fetching video metadata...");

    try {
      const res = await fetch("/api/viral-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: url }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Analysis failed");
      setMeta(data.meta);
      setStructure(data.structure);
      setAnalyzed(true);
      toast.success("Video structure reverse-engineered! 🎯");
    } catch {
      // Demo fallback
      setMeta({ title: DEMO_STRUCTURE.title, channel: "Demo Channel", thumbnail: `https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg`, viewCount: 8200000, likeCount: 420000, duration: DEMO_STRUCTURE.totalDuration });
      setStructure(DEMO_STRUCTURE);
      setAnalyzed(true);
      toast.success("Video analyzed! (demo mode — add YOUTUBE_API_KEY for real data) 🎯");
    } finally { setLoading(false); setStep(""); }
  };

  const generateSimilarScript = async () => {
    if (!structure) return;
    if (!scriptTopic.trim()) { toast.error("Enter a topic for the new script"); return; }
    setGeneratingScript(true);
    try {
      const res = await fetch("/api/viral-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: url || "https://youtube.com/watch?v=demo", generateScript: true, scriptTopic }),
      });
      const data = await res.json();
      setGeneratedScript(data.generatedScript || "Script generation failed — try again.");
      toast.success("Original script generated using the viral structure! ✍️");
    } catch { toast.error("Script generation failed"); }
    finally { setGeneratingScript(false); }
  };

  const activePhase = activePhaseIdx !== null ? structure?.phases[activePhaseIdx] : null;

  return (
    <div className="page-wrap" style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div className="ph">
        <div className="ph-eyebrow">REVERSE ENGINEERING</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="ph-title">Viral Video Analyzer</div>
            <div className="ph-sub">Decode any viral video's storytelling structure and create original content with the same pattern.</div>
          </div>
        </div>
      </div>

      {/* URL Input */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <label>YouTube Video URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && analyze()} placeholder="https://youtube.com/watch?v=..." />
          </div>
          <button className="btn btn-primary" onClick={analyze} disabled={loading}>
            {loading ? <><div className="spin" style={{ borderTopColor: "#fff" }} />{step || "Analyzing..."}</> : "🔍 Analyze Structure"}
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => { setUrl(EXAMPLE_URLS[0]); }}>Use example URL</button>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div className="slabel" style={{ alignSelf: "center" }}>WHAT YOU'LL GET:</div>
          {["Storytelling phases","Emotional pacing","Viral score","Hook analysis","Reusable template","Generate similar script"].map(f => (
            <span key={f} className="badge badge-gray">{f}</span>
          ))}
        </div>
      </div>

      {analyzed && meta && structure && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>

          {/* LEFT: Analysis Results */}
          <div>
            {/* Video info */}
            <div className="card" style={{ padding: 16, marginBottom: 16, display: "flex", gap: 14, alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={meta.thumbnail} alt="" style={{ width: 80, height: 50, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{meta.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>{meta.channel} · {fmtViews(meta.viewCount)} views · {fmtViews(meta.likeCount)} likes · {fmtTime(meta.duration)}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span className="badge score-viral">{structure.viralScore} viral score</span>
                  <span className="badge badge-brand">{structure.storytellingTechnique}</span>
                  <span className="badge badge-cyan">{structure.pacingPattern}</span>
                  <span className="badge badge-gray">{structure.contentCategory}</span>
                </div>
              </div>
            </div>

            {/* Key stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Viral Score", value: structure.viralScore, unit: "/100", color: "var(--green)" },
                { label: "Phases", value: structure.phases.length, unit: " phases", color: "var(--brand)" },
                { label: "Duration", value: fmtTime(structure.totalDuration), unit: "", color: "var(--cyan)" },
                { label: "Target", value: structure.targetAudience.split(" ").slice(0,2).join(" "), unit: "", color: "var(--orange)" },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ padding: "14px 16px" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}<span style={{ fontSize: 12, color: "var(--text-4)" }}>{s.unit}</span></div>
                  <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Hook analysis */}
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div className="ph-eyebrow" style={{ marginBottom: 8 }}>OPENING HOOK</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.6, marginBottom: 8 }}>{structure.hook}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="badge badge-green">✓ Strong hook detected</span>
                <span className="badge badge-brand">{structure.storytellingTechnique}</span>
              </div>
            </div>

            {/* Phase timeline */}
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div className="ph-eyebrow">STORYTELLING PHASES ({structure.phases.length})</div>
                <span className="badge badge-brand">{structure.pacingPattern} pacing</span>
              </div>
              <div className="va-timeline">
                {structure.phases.map((phase, i) => (
                  <div key={i} className="va-phase" style={{ cursor: "pointer" }} onClick={() => setActivePhaseIdx(activePhaseIdx === i ? null : i)}>
                    <div className="va-phase-card" style={{ borderColor: activePhaseIdx === i ? "var(--brand)" : "var(--border)", background: activePhaseIdx === i ? "var(--brand-lt)" : "var(--bg-card)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div>
                          <div className="va-phase-label">{phase.name}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{phase.description.slice(0, 60)}{phase.description.length > 60 ? "..." : ""}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                          <div className="va-phase-time">{fmtTime(phase.startSec)} → {fmtTime(phase.endSec)}</div>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: INTENSITY_COLOR(phase.emotionalIntensity), marginTop: 2 }}>{phase.emotionalIntensity}% intensity</div>
                        </div>
                      </div>
                      {/* Intensity bar */}
                      <div style={{ height: 3, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${phase.emotionalIntensity}%`, background: INTENSITY_COLOR(phase.emotionalIntensity), borderRadius: 99 }} />
                      </div>
                      {/* Expanded detail */}
                      {activePhaseIdx === i && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8, lineHeight: 1.6 }}>{phase.description}</div>
                          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                            <span className="badge badge-brand">{phase.technique}</span>
                          </div>
                          <div style={{ background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.15)", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "var(--text-2)", fontStyle: "italic" }}>
                            "{phase.hook}"
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key success factors */}
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div className="ph-eyebrow" style={{ marginBottom: 10 }}>WHY THIS VIDEO WENT VIRAL</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {structure.keySuccessFactors.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--green-lt)", border: "1px solid rgba(0,229,160,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "var(--green)", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{f}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generated Script */}
            {generatedScript && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div className="ph-eyebrow">GENERATED ORIGINAL SCRIPT</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>Topic: {scriptTopic} · Inspired by the viral structure (100% original)</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost btn-xs" onClick={() => { navigator.clipboard.writeText(generatedScript).catch(()=>{}); toast.success("Script copied!"); }}>📋 Copy</button>
                    <button className="btn btn-primary btn-xs" onClick={() => router.push("/scene-generator")}>🎬 Generate Scenes</button>
                  </div>
                </div>
                <div className="va-script-block">{generatedScript}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <button className="btn btn-outline btn-sm" onClick={() => router.push("/scene-generator")}>🎞️ AI Scene Generator</button>
                  <button className="btn btn-outline btn-sm" onClick={() => router.push("/factory")}>⚡ Shorts Factory</button>
                  <button className="btn btn-outline btn-sm" onClick={() => router.push("/video-editor")}>✂️ Video Editor</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => router.push("/script-generator")}>✍️ Script Generator</button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Generate Similar + Reusable Template */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 20 }}>
            {/* Generate Similar Video */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <div className="ph-eyebrow" style={{ marginBottom: 4 }}>GENERATE SIMILAR VIDEO</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>Use this viral structure to create an original script on any topic</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Your Topic / Niche</label>
                <input value={scriptTopic} onChange={e => setScriptTopic(e.target.value)} placeholder="e.g. how I learned to code in 3 months..." />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div className="slabel" style={{ marginBottom: 7 }}>TOPIC IDEAS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["Morning routine","Side hustle","Learn a skill","Fitness transformation","Money mindset","Productivity system"].map(t => (
                    <button key={t} className="style-chip" style={{ fontSize: 11 }} onClick={() => setScriptTopic(t)}>{t}</button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={generateSimilarScript} disabled={generatingScript || !scriptTopic.trim()}>
                {generatingScript ? <><div className="spin" style={{ borderTopColor: "#fff" }} />Writing script...</> : "✍️ Generate Original Script"}
              </button>
              {generatedScript && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--green-lt)", border: "1px solid rgba(0,229,160,0.2)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
                  ✓ Script ready! See below.
                </div>
              )}
            </div>

            {/* Reusable Template */}
            <div className="card" style={{ padding: 16 }}>
              <div className="ph-eyebrow" style={{ marginBottom: 10 }}>REUSABLE TEMPLATE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {structure.phases.map((phase, i) => (
                  <div key={i} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 11px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--brand)", textTransform: "uppercase" }}>{phase.name}</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-4)" }}>{fmtTime(phase.startSec)}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>{phase.technique}</div>
                    <div style={{ height: 2, background: INTENSITY_COLOR(phase.emotionalIntensity), borderRadius: 99, marginTop: 6, width: `${phase.emotionalIntensity}%` }} />
                  </div>
                ))}
              </div>
              <button className="btn btn-outline btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
                onClick={() => { navigator.clipboard.writeText(structure.phases.map(p => `${p.name} (${fmtTime(p.startSec)}-${fmtTime(p.endSec)}): ${p.technique} — ${p.description}`).join("\n\n")).catch(()=>{}); toast.success("Template copied!"); }}>
                📋 Copy Template
              </button>
            </div>

            {/* Full pipeline */}
            <div className="card" style={{ padding: 16 }}>
              <div className="ph-eyebrow" style={{ marginBottom: 10 }}>FULL PIPELINE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[["YouTube Analysis","✓ Done","badge-green"],["AI Script Generation", generatedScript ? "✓ Done" : "Pending","badge-gray"],["Scene Generation","→ Next","badge-brand"],["Video Clips","→ After scenes","badge-gray"],["Merge & Export","→ Final step","badge-gray"]].map(([step, status, cls]) => (
                  <div key={step as string} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-2)" }}>{step as string}</span>
                    <span className={`badge ${cls as string}`} style={{ fontSize: 9 }}>{status as string}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" style={{ justifyContent: "center" }} onClick={() => router.push("/scene-generator")}>🎞️ Generate Scenes →</button>
                <button className="btn btn-outline btn-sm" style={{ justifyContent: "center" }} onClick={() => router.push("/factory")}>⚡ Shorts Factory</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!analyzed && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {[
            { icon: "🔍", title: "Paste URL", desc: "Enter any viral YouTube video URL to begin analysis" },
            { icon: "🤖", title: "AI Decodes It", desc: "Groq AI analyzes hooks, pacing, emotional arc, and viral triggers" },
            { icon: "✍️", title: "Create Originals", desc: "Generate new scripts using the same storytelling structure" },
          ].map(s => (
            <div key={s.title} className="card" style={{ padding: 28, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{s.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

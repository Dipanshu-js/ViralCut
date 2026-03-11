"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { VIDEO_STYLES, VIDEO_PLATFORMS } from "@/lib/constants";

type GenMode = "prompt"|"script"|"youtube-to-shorts"|"long-video"|"viral-short";

interface Scene {
  index: number; narration: string; visual_prompt: string;
  style: string; duration: number; mood: string; camera: string;
}

interface GenResult {
  title?: string; hook?: string; script?: string;
  scenes?: Scene[]; jobId?: string; sceneCount?: number;
  estimatedTime?: number; message?: string;
  // youtube-to-shorts fields
  shorts?: Array<{ id: string; title: string; hook: string; startTime: number; endTime: number; viralScore: number; hookOverlay: string }>;
  meta?: { title: string; channel: string; thumbnail: string };
}

const MODE_INFO = {
  "prompt":            { icon:"✍️",  label:"Prompt → Video",        desc:"Type a topic, AI writes script + scenes" },
  "script":            { icon:"📄",  label:"Script → Scenes",       desc:"Paste your script, AI plans the visuals" },
  "youtube-to-shorts": { icon:"▶️",  label:"YouTube → Shorts",      desc:"Paste a YT link, AI clips viral moments" },
  "long-video":        { icon:"🎥",  label:"Long Video",            desc:"Multi-scene video up to 5 minutes" },
  "viral-short":       { icon:"🔥",  label:"Viral Short",           desc:"Optimized 9:16 for Shorts/Reels/TikTok" },
};

export default function VideoStudioPage() {
  const router = useRouter();
  const [mode, setMode]             = useState<GenMode>("prompt");
  const [topic, setTopic]           = useState("");
  const [script, setScript]         = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [style, setStyle]           = useState("motivational");
  const [platform, setPlatform]     = useState("shorts");
  const [duration, setDuration]     = useState(60);
  const [sceneCount, setSceneCount] = useState(6);
  const [generating, setGenerating] = useState(false);
  const [result, setResult]         = useState<GenResult|null>(null);
  const [activeScene, setActiveScene] = useState<number|null>(null);

  const generate = async () => {
    const body: Record<string, unknown> = { mode, style, platform, duration, sceneCount };
    if (mode === "prompt" || mode === "long-video" || mode === "viral-short") {
      if (!topic.trim()) { toast.error("Enter a topic"); return; }
      body.topic = topic;
    } else if (mode === "script") {
      if (!script.trim()) { toast.error("Paste a script"); return; }
      body.script = script;
    } else if (mode === "youtube-to-shorts") {
      if (!youtubeUrl.trim()) { toast.error("Paste a YouTube URL"); return; }
      body.youtubeUrl = youtubeUrl;
    }

    setGenerating(true); setResult(null);
    try {
      const res = await fetch("/api/ai-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data);
        if (data.scenes?.length) setActiveScene(0);
        toast.success(data.message || "Generated successfully! 🎬");
      } else throw new Error(data.error);
    } catch (e) { toast.error(String(e)); }
    finally { setGenerating(false); }
  };

  const openInFactory = (short: NonNullable<GenResult["shorts"]>[0]) => {
    router.push(`/factory?url=${encodeURIComponent(youtubeUrl)}`);
  };

  const sendToSceneGenerator = () => {
    if (!result?.scenes?.length) return;
    toast.success("Sending scenes to generator...");
    router.push("/scene-generator");
  };

  const STYLE_GRADIENTS: Record<string, string> = {
    motivational: "linear-gradient(135deg,#1c0a00,#431407)",
    educational:  "linear-gradient(135deg,#0c1445,#0a2a4a)",
    storytelling: "linear-gradient(135deg,#200a0a,#4c0519)",
    cartoon:      "linear-gradient(135deg,#052e16,#14532d)",
    cinematic:    "linear-gradient(135deg,#0d0f18,#1a0a2e)",
    anime:        "linear-gradient(135deg,#1a0a1e,#2e0047)",
  };

  return (
    <div className="page-wrap" style={{ maxWidth:1400 }}>
      <div className="ph">
        <div className="ph-eyebrow">AI VIDEO GENERATION ENGINE</div>
        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap" }}>
          <div>
            <div className="ph-title">Video Studio</div>
            <div className="ph-sub">Generate videos from prompts, scripts, or YouTube clips. AI-powered scene planning + multi-style output.</div>
          </div>
          <div style={{ display:"flex",gap:8 }}>
            <button className="btn btn-ghost btn-sm" onClick={()=>router.push("/factory")}>🎬 Shorts Factory</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>router.push("/scene-generator")}>🎞 Scene Generator</button>
          </div>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"340px 1fr",gap:20,alignItems:"start" }}>

        {/* ── LEFT: Controls ─────────────────────────────────────────── */}
        <div>
          {/* Mode selector */}
          <div style={{ background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:16,marginBottom:16 }}>
            <div className="slabel" style={{ marginBottom:10 }}>GENERATION MODE</div>
            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              {(Object.entries(MODE_INFO) as [GenMode, typeof MODE_INFO[GenMode]][]).map(([id, info])=>(
                <button key={id}
                  style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",border:`1.5px solid ${mode===id?"var(--brand)":"var(--border)"}`,borderRadius:"var(--radius-sm)",background:mode===id?"var(--brand-lt)":"transparent",cursor:"pointer",textAlign:"left",transition:"all 0.14s" }}
                  onClick={()=>setMode(id)}>
                  <span style={{ fontSize:20,flexShrink:0 }}>{info.icon}</span>
                  <div>
                    <div style={{ fontSize:12,fontWeight:700,color:mode===id?"var(--brand)":"var(--text-2)" }}>{info.label}</div>
                    <div style={{ fontSize:11,color:"var(--text-4)",marginTop:1 }}>{info.desc}</div>
                  </div>
                  {mode===id && <span style={{ marginLeft:"auto",color:"var(--brand)",flexShrink:0 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div style={{ background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:16,marginBottom:16 }}>
            {(mode==="prompt"||mode==="viral-short"||mode==="long-video") && (
              <div style={{ marginBottom:12 }}>
                <label>{mode==="viral-short"?"Viral Topic":"Topic"}</label>
                <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder={
                  mode==="viral-short"?"e.g. 5 habits that made me rich..." :
                  mode==="long-video"?"e.g. Complete guide to morning routines..." :
                  "e.g. How to wake up at 5AM and stay productive..."
                } onKeyDown={e=>e.key==="Enter"&&generate()} />
              </div>
            )}
            {mode==="script" && (
              <div style={{ marginBottom:12 }}>
                <label>Your Script</label>
                <textarea value={script} onChange={e=>setScript(e.target.value)} placeholder={"Paste your full video script here...\n\nThe AI will break it into visual scenes, suggest camera angles, and generate prompts for each segment."} style={{ minHeight:140,resize:"vertical" }} />
              </div>
            )}
            {mode==="youtube-to-shorts" && (
              <div style={{ marginBottom:12 }}>
                <label>YouTube URL</label>
                <input value={youtubeUrl} onChange={e=>setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                <div style={{ fontSize:11,color:"var(--text-4)",marginTop:5 }}>AI analyzes transcript → finds viral moments → generates Shorts plan</div>
              </div>
            )}

            {/* Style */}
            {mode!=="youtube-to-shorts" && (
              <div style={{ marginBottom:12 }}>
                <label>Video Style</label>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6 }}>
                  {VIDEO_STYLES.map(s=>(
                    <button key={s.id}
                      style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 4px",border:`1.5px solid ${style===s.id?"var(--brand)":"var(--border)"}`,borderRadius:"var(--radius-sm)",background:style===s.id?"var(--brand-lt)":"transparent",cursor:"pointer",fontSize:10,fontWeight:style===s.id?700:500,color:style===s.id?"var(--brand)":"var(--text-3)" }}
                      onClick={()=>setStyle(s.id)}>
                      <span style={{ fontSize:18 }}>{s.emoji}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Platform */}
            {mode!=="youtube-to-shorts" && (
              <div style={{ marginBottom:12 }}>
                <label>Platform</label>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6 }}>
                  {VIDEO_PLATFORMS.map(p=>(
                    <button key={p.id}
                      style={{ padding:"7px",border:`1.5px solid ${platform===p.id?"var(--brand)":"var(--border)"}`,borderRadius:"var(--radius-sm)",background:platform===p.id?"var(--brand-lt)":"transparent",cursor:"pointer",fontSize:11,fontWeight:600,color:platform===p.id?"var(--brand)":"var(--text-3)" }}
                      onClick={()=>setPlatform(p.id)}>
                      {p.label} <span style={{ opacity:0.6,fontWeight:400 }}>{p.ratio}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Duration + Scenes */}
            {mode!=="youtube-to-shorts" && (
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12 }}>
                <div>
                  <label>Duration (s)</label>
                  <select value={duration} onChange={e=>setDuration(+e.target.value)}>
                    {[15,30,45,60,90,120,180,240,300].map(d=><option key={d} value={d}>{d}s</option>)}
                  </select>
                </div>
                <div>
                  <label>Scenes</label>
                  <select value={sceneCount} onChange={e=>setSceneCount(+e.target.value)}>
                    {[2,3,4,5,6,7,8,10,12].map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            )}

            <button className="btn btn-primary" onClick={generate} disabled={generating} style={{ width:"100%",justifyContent:"center" }}>
              {generating
                ? <><div className="spin" style={{ borderTopColor:"#fff" }} />Generating with Groq AI...</>
                : `${MODE_INFO[mode].icon} Generate ${MODE_INFO[mode].label}`}
            </button>
          </div>

          {/* Groq key info */}
          <div style={{ background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:14 }}>
            <div className="slabel" style={{ marginBottom:8 }}>AI ENGINE STATUS</div>
            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,fontSize:12 }}>
                <div style={{ width:8,height:8,borderRadius:"50%",background:"var(--green)" }} />
                <span style={{ color:"var(--text-2)" }}>Groq AI (Llama 3.3 70b)</span>
                <span className="badge badge-green" style={{ marginLeft:"auto",fontSize:9 }}>Fast</span>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:8,fontSize:12 }}>
                <div style={{ width:8,height:8,borderRadius:"50%",background:"var(--text-4)" }} />
                <span style={{ color:"var(--text-3)" }}>Gemini (fallback)</span>
                <span className="badge badge-gray" style={{ marginLeft:"auto",fontSize:9 }}>Optional</span>
              </div>
              <div style={{ fontSize:10,color:"var(--text-4)",marginTop:4,lineHeight:1.5 }}>
                Multi-key rotation active. Add GROQ_API_KEY_2/3 for higher limits.
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Results ──────────────────────────────────────────── */}
        <div>
          {!result ? (
            <div style={{ background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:48,textAlign:"center" }}>
              <div style={{ fontSize:48,marginBottom:16 }}>🎬</div>
              <div style={{ fontSize:18,fontWeight:700,marginBottom:8 }}>AI Video Generation Engine</div>
              <div style={{ fontSize:14,color:"var(--text-3)",maxWidth:400,margin:"0 auto",lineHeight:1.6 }}>
                Choose a mode on the left and click Generate. The AI will plan your video, write scenes, and prepare it for rendering.
              </div>
              <div style={{ marginTop:24,display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap" }}>
                {[
                  "5 habits that changed my life",
                  "Morning routine for success",
                  "How to make $1000 online",
                  "The truth about social media",
                  "Best productivity hacks 2025",
                ].map(ex=>(
                  <button key={ex} className="style-chip" onClick={()=>{setTopic(ex);setMode("viral-short");}}>{ex}</button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {/* YouTube Shorts results */}
              {result.shorts && (
                <div>
                  {result.meta && (
                    <div style={{ display:"flex",gap:12,alignItems:"center",background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:14,marginBottom:16 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={result.meta.thumbnail} alt="" style={{ width:80,height:50,borderRadius:6,objectFit:"cover",flexShrink:0 }} />
                      <div>
                        <div style={{ fontWeight:700,fontSize:14 }}>{result.meta.title}</div>
                        <div style={{ fontSize:12,color:"var(--text-3)",marginTop:2 }}>{result.meta.channel} · {result.shorts.length} viral moments found</div>
                      </div>
                      <button className="btn btn-primary btn-sm" style={{ marginLeft:"auto",flexShrink:0 }} onClick={()=>router.push(`/factory?url=${encodeURIComponent(youtubeUrl)}`)}>
                        Open in Factory →
                      </button>
                    </div>
                  )}
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12 }}>
                    {result.shorts.map(s=>(
                      <div key={s.id} style={{ background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:14,cursor:"pointer",transition:"all 0.2s" }}
                        onClick={()=>openInFactory(s)}
                        onMouseEnter={e=>(e.currentTarget.style.borderColor="var(--brand)")}
                        onMouseLeave={e=>(e.currentTarget.style.borderColor="var(--border)")}>
                        <div style={{ display:"flex",gap:6,marginBottom:8 }}>
                          <span className={s.viralScore>=85?"badge score-viral":s.viralScore>=70?"badge score-hot":"badge score-rising"}>{s.viralScore}</span>
                          <span className="badge badge-gray" style={{ fontFamily:"var(--mono)",fontSize:9 }}>
                            {Math.floor(s.startTime/60)}:{(s.startTime%60).toString().padStart(2,"0")} → {Math.floor(s.endTime/60)}:{(s.endTime%60).toString().padStart(2,"0")}
                          </span>
                        </div>
                        <div style={{ fontWeight:700,fontSize:13,marginBottom:4 }}>{s.title}</div>
                        <div style={{ fontSize:11,color:"var(--text-3)",fontStyle:"italic",marginBottom:8 }}>{s.hook}</div>
                        <div style={{ background:"var(--bg-2)",borderRadius:4,padding:"4px 8px",fontSize:10,fontWeight:700,fontFamily:"var(--mono)",color:"var(--brand)" }}>{s.hookOverlay}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Script/Scene results */}
              {result.scenes && result.scenes.length > 0 && (
                <div>
                  {/* Header card */}
                  <div style={{ background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:16,marginBottom:16 }}>
                    <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10 }}>
                      <div>
                        <div style={{ fontSize:16,fontWeight:800,marginBottom:4 }}>{result.title}</div>
                        {result.hook && <div style={{ fontSize:13,color:"var(--brand)",fontStyle:"italic" }}>🎯 {result.hook}</div>}
                      </div>
                      <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                        <span className="badge badge-brand">{result.sceneCount} scenes</span>
                        {result.estimatedTime && <span className="badge badge-gray">~{result.estimatedTime}s generate</span>}
                      </div>
                    </div>
                    {result.script && (
                      <div>
                        <div className="slabel" style={{ marginBottom:6 }}>FULL SCRIPT</div>
                        <div style={{ background:"var(--bg-2)",borderRadius:"var(--radius-sm)",padding:12,fontSize:12,color:"var(--text-2)",lineHeight:1.7,maxHeight:160,overflowY:"auto",whiteSpace:"pre-wrap",fontFamily:"var(--mono)" }}>
                          {result.script}
                        </div>
                      </div>
                    )}
                    <div style={{ marginTop:12,display:"flex",gap:8 }}>
                      <button className="btn btn-primary btn-sm" onClick={sendToSceneGenerator}>
                        🎞 Generate in Scene Studio
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={()=>{ if(result.script) navigator.clipboard.writeText(result.script).catch(()=>{}); toast.success("Script copied!"); }}>
                        📋 Copy Script
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={()=>router.push("/script-generator")}>
                        ✏️ Script Editor
                      </button>
                    </div>
                  </div>

                  {/* Scene cards */}
                  <div style={{ marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <div className="slabel">SCENE PLAN ({result.scenes.length} scenes)</div>
                    <div style={{ fontSize:11,color:"var(--text-4)" }}>Click scene to preview</div>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12 }}>
                    {result.scenes.map((scene, i)=>(
                      <div key={i}
                        style={{ background:activeScene===i?"var(--brand-lt)":STYLE_GRADIENTS[style]||"var(--bg-card)",border:`1.5px solid ${activeScene===i?"var(--brand)":"var(--border)"}`,borderRadius:"var(--radius)",padding:14,cursor:"pointer",transition:"all 0.18s",overflow:"hidden" }}
                        onClick={()=>setActiveScene(activeScene===i?null:i)}>
                        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                          <div style={{ width:28,height:28,borderRadius:"50%",background:"rgba(108,92,231,0.15)",border:"1.5px solid rgba(108,92,231,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--mono)",fontSize:11,fontWeight:700,color:"var(--brand)",flexShrink:0 }}>
                            {scene.index}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                              <span className="badge badge-gray" style={{ fontSize:9 }}>{scene.mood}</span>
                              <span className="badge badge-gray" style={{ fontSize:9 }}>{scene.camera}</span>
                              <span className="badge badge-gray" style={{ fontSize:9 }}>{scene.duration}s</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize:12,color:"rgba(255,255,255,0.85)",lineHeight:1.5,marginBottom:8,fontStyle:"italic" }}>
                          "{scene.narration}"
                        </div>
                        {activeScene===i && (
                          <div style={{ marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.1)" }}>
                            <div style={{ fontSize:10,fontFamily:"var(--mono)",color:"var(--brand)",marginBottom:4 }}>VISUAL PROMPT:</div>
                            <div style={{ fontSize:11,color:"rgba(255,255,255,0.6)",lineHeight:1.5 }}>{scene.visual_prompt}</div>
                            <button className="btn btn-outline btn-sm" style={{ marginTop:8,fontSize:10 }}
                              onClick={e=>{ e.stopPropagation(); navigator.clipboard.writeText(scene.visual_prompt).catch(()=>{}); toast.success("Prompt copied!"); }}>
                              📋 Copy Prompt
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Bottom actions */}
                  <div style={{ marginTop:16,background:"var(--bg-card)",border:"1px solid var(--brand)",borderRadius:"var(--radius)",padding:16 }}>
                    <div style={{ fontWeight:700,fontSize:13,marginBottom:8 }}>🚀 Next Steps</div>
                    <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                      <button className="btn btn-primary" onClick={sendToSceneGenerator}>
                        🎞 Generate Videos in Scene Studio
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={()=>router.push("/script-generator")}>
                        ✏️ Refine Script
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={()=>router.push("/factory")}>
                        🎬 Shorts Factory
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const STYLES = ["educational","motivational","storytelling","listicle","how-to","documentary"];
const PLATFORMS = ["youtube","tiktok","instagram","shorts"];
const TONES = ["engaging","professional","casual","energetic","calm","humorous"];
const DURATIONS = [30,60,90,120,180,300,600];
const NICHES = ["general","finance","fitness","tech","mindset","cooking","travel","gaming","crypto","health"];

const NICHE_STARTERS: Record<string, string[]> = {
  finance:  ["Why 99% of People Stay Broke","The Money Hack Banks Don't Want You to Know","I Invested $100/Week for 1 Year — Here's What Happened"],
  fitness:  ["This 10-Minute Workout Burns More Fat Than 1 Hour of Cardio","The Exercise Scientists Say Everyone's Doing Wrong","I Tried Working Out Fasted for 30 Days"],
  tech:     ["The AI Tool That Replaced My Entire Workflow","5 Chrome Extensions That Save Me 3 Hours Daily","I Automated My Business With ChatGPT — Here's How"],
  mindset:  ["The Psychology Trick That Top 1% Use Daily","Why Discipline Beats Motivation Every Time","I Did ONE Thing Differently and My Life Changed"],
  general:  [],
};

export default function ScriptGeneratorPage() {
  const router = useRouter();
  const [topic, setTopic]       = useState("");
  const [style, setStyle]       = useState("educational");
  const [platform, setPlatform] = useState("youtube");
  const [tone, setTone]         = useState("engaging");
  const [duration, setDuration] = useState(60);
  const [niche, setNiche]       = useState("general");
  const [outline, setOutline]   = useState("");
  const [script, setScript]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [seriesMode, setSeriesMode] = useState(false);
  const [seriesHistory, setSeriesHistory] = useState<string[]>([]);
  const [tab, setTab]           = useState<"script"|"series"|"ab">("script");
  const [abVariants, setAbVariants] = useState<string[]>([]);

  const generate = async (overrideTopic?: string, isAb = false) => {
    const finalTopic = overrideTopic || topic;
    if (!finalTopic.trim()) { toast.error("Enter a topic"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/script-generator", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: finalTopic, style, platform, tone, duration, outline, niche, seriesMode, previousTopics: seriesHistory }),
      });
      const data = await res.json();
      if (isAb) {
        setAbVariants(prev => [...prev.slice(-1), data.script || ""]);
      } else {
        setScript(data.script || "");
        setWordCount(data.wordCount || 0);
        if (seriesMode && finalTopic) setSeriesHistory(h => [...h, finalTopic].slice(-5));
        toast.success("Script generated! ✍️");
        setTab("script");
      }
    } catch { toast.error("Generation failed"); }
    finally { setLoading(false); }
  };

  const generateAb = async () => {
    if (!topic.trim()) { toast.error("Enter a topic"); return; }
    setLoading(true);
    setTab("ab");
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/script-generator", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ topic, style, platform, tone, duration, niche }) }),
        fetch("/api/script-generator", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ topic, style: style==="educational"?"storytelling":"educational", platform, tone, duration, niche }) }),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      setAbVariants([d1.script || "", d2.script || ""]);
      toast.success("2 variants generated! Compare them 🆚");
    } catch { toast.error("A/B generation failed"); }
    finally { setLoading(false); }
  };

  const copyScript = (text = script) => {
    navigator.clipboard.writeText(text).catch(()=>{});
    toast.success("Copied to clipboard!");
  };

  const starterTopics = (NICHE_STARTERS[niche] || NICHE_STARTERS.general || []);

  return (
    <div className="page-wrap" style={{ maxWidth:1200 }}>
      <div className="ph">
        <div className="ph-eyebrow">AI POWERED</div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
          <div>
            <div className="ph-title">Script Generator</div>
            <div className="ph-sub">Generate viral scripts optimized for any platform and niche</div>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            {script && <button className="btn btn-ghost btn-sm" onClick={() => router.push("/scene-generator")}>🎞️ Generate Scenes</button>}
            {script && <button className="btn btn-primary btn-sm" onClick={() => router.push("/factory")}>⚡ Make Shorts</button>}
          </div>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"380px 1fr",gap:20,alignItems:"start" }}>
        {/* Controls */}
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div className="card" style={{ padding:18 }}>
            <div style={{ marginBottom:14 }}>
              <label>Topic / Title</label>
              <textarea value={topic} onChange={e=>setTopic(e.target.value)} placeholder="What's your video about?" rows={2} style={{ resize:"vertical" }} />
            </div>

            {/* Starter topics for niche */}
            {starterTopics.length > 0 && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10,color:"var(--text-4)",fontFamily:"var(--mono)",fontWeight:700,marginBottom:6 }}>QUICK STARTS</div>
                <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                  {starterTopics.map((t,i) => (
                    <button key={i} className="btn btn-ghost btn-xs" style={{ justifyContent:"flex-start",textAlign:"left",fontSize:11 }}
                      onClick={() => setTopic(t)}>{t}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <div>
                <label>Niche</label>
                <select value={niche} onChange={e=>setNiche(e.target.value)}>
                  {NICHES.map(n=><option key={n} value={n}>{n.charAt(0).toUpperCase()+n.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label>Platform</label>
                <select value={platform} onChange={e=>setPlatform(e.target.value)}>
                  {PLATFORMS.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label>Style</label>
                <select value={style} onChange={e=>setStyle(e.target.value)}>
                  {STYLES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label>Tone</label>
                <select value={tone} onChange={e=>setTone(e.target.value)}>
                  {TONES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop:10 }}>
              <label>Duration</label>
              <select value={duration} onChange={e=>setDuration(+e.target.value)}>
                {DURATIONS.map(d=><option key={d} value={d}>{d}s {d<60?"(Short)":d<120?"(1 min)":d<300?"("+Math.floor(d/60)+" min)":"(Long)"}</option>)}
              </select>
            </div>

            <div style={{ marginTop:10 }}>
              <label>Outline (optional)</label>
              <textarea value={outline} onChange={e=>setOutline(e.target.value)} placeholder="Point 1, Point 2..." rows={2} style={{ resize:"vertical",fontSize:12 }} />
            </div>

            {/* Series mode */}
            <div style={{ marginTop:14,padding:"12px 14px",background:"var(--bg-2)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:seriesMode?10:0 }}>
                <div>
                  <div style={{ fontSize:13,fontWeight:600 }}>📺 Series Mode</div>
                  <div style={{ fontSize:11,color:"var(--text-3)" }}>AI remembers previous episodes</div>
                </div>
                <button className={`toggle ${seriesMode?"on":""}`} onClick={() => setSeriesMode(v=>!v)} />
              </div>
              {seriesMode && (
                <div>
                  <div style={{ fontSize:10,color:"var(--text-4)",fontFamily:"var(--mono)",marginBottom:6 }}>SERIES HISTORY ({seriesHistory.length})</div>
                  {seriesHistory.length ? seriesHistory.map((t,i) => (
                    <div key={i} style={{ display:"flex",alignItems:"center",gap:8,fontSize:11,color:"var(--text-3)",marginBottom:3 }}>
                      <span style={{ fontFamily:"var(--mono)",fontSize:9,color:"var(--text-4)" }}>EP{i+1}</span> {t}
                    </div>
                  )) : <div style={{ fontSize:11,color:"var(--text-4)" }}>Generate your first script to start the series</div>}
                  {seriesHistory.length > 0 && (
                    <button className="btn btn-ghost btn-xs" style={{ marginTop:6 }} onClick={() => setSeriesHistory([])}>Clear history</button>
                  )}
                </div>
              )}
            </div>

            <div style={{ display:"flex",gap:8,marginTop:14 }}>
              <button className="btn btn-primary" style={{ flex:1,justifyContent:"center" }} onClick={() => generate()} disabled={loading || !topic.trim()}>
                {loading?<><div className="spin" style={{ borderTopColor:"#fff" }} />Generating...</>:"✍️ Generate Script"}
              </button>
              <button className="btn btn-outline" style={{ padding:"10px 14px" }} onClick={generateAb} disabled={loading || !topic.trim()} title="A/B test 2 versions">
                🆚
              </button>
            </div>
          </div>
        </div>

        {/* Output */}
        <div>
          {/* Tab bar */}
          <div style={{ display:"flex",gap:4,background:"var(--bg-2)",padding:4,borderRadius:"var(--radius-sm)",marginBottom:14,width:"fit-content" }}>
            {([{id:"script",label:"📄 Script"},{id:"ab",label:"🆚 A/B Compare"},{id:"series",label:"📺 Series"}] as {id:"script"|"ab"|"series",label:string}[]).map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ padding:"7px 14px",borderRadius:5,border:"none",background:tab===t.id?"var(--bg-card)":"transparent",color:tab===t.id?"var(--text)":"var(--text-3)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--font)",boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,0.3)":"none" }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "script" && (
            <div className="card">
              {script ? (
                <>
                  <div style={{ padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                      <span className="badge badge-green" style={{ fontSize:10 }}>Ready</span>
                      <span style={{ fontFamily:"var(--mono)",fontSize:11,color:"var(--text-4)" }}>{wordCount} words · ~{Math.round(wordCount/2.3)}s</span>
                    </div>
                    <div style={{ display:"flex",gap:8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => copyScript()}>📋 Copy</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => generate()} disabled={loading}>↺ Regen</button>
                    </div>
                  </div>
                  <textarea
                    value={script} onChange={e=>setScript(e.target.value)}
                    style={{ width:"100%",minHeight:440,padding:18,background:"transparent",border:"none",color:"var(--text)",fontFamily:"var(--mono)",fontSize:12.5,lineHeight:1.8,resize:"vertical",outline:"none" }}
                  />
                </>
              ) : (
                <div className="empty" style={{ padding:60 }}>
                  <div className="empty-icon">✍️</div>
                  <div className="empty-title">No script yet</div>
                  <div className="empty-desc">Fill in the settings and click Generate Script</div>
                </div>
              )}
            </div>
          )}

          {tab === "ab" && (
            <div>
              {abVariants.length === 2 ? (
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
                  {abVariants.map((v,i) => (
                    <div key={i} className="card">
                      <div style={{ padding:"10px 14px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10 }}>
                        <span style={{ fontFamily:"var(--mono)",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:i===0?"rgba(0,212,255,0.15)":"rgba(255,140,66,0.15)",color:i===0?"var(--cyan)":"var(--orange)" }}>
                          VARIANT {i===0?"A":"B"}
                        </span>
                        <span style={{ fontSize:11,color:"var(--text-4)" }}>{i===0?style:"storytelling"} style</span>
                        <button className="btn btn-ghost btn-xs" style={{ marginLeft:"auto" }} onClick={() => copyScript(v)}>📋 Copy</button>
                      </div>
                      <textarea value={v} onChange={e=>setAbVariants(prev=>[...prev.slice(0,i),e.target.value,...prev.slice(i+1)])}
                        style={{ width:"100%",minHeight:360,padding:14,background:"transparent",border:"none",color:"var(--text)",fontFamily:"var(--mono)",fontSize:11.5,lineHeight:1.75,resize:"vertical",outline:"none" }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty card" style={{ padding:60 }}>
                  <div className="empty-icon">🆚</div>
                  <div className="empty-title">A/B Compare</div>
                  <div className="empty-desc">Click the 🆚 button to generate 2 script variants side by side and pick the best one.</div>
                </div>
              )}
            </div>
          )}

          {tab === "series" && (
            <div className="card" style={{ padding:24 }}>
              <div style={{ fontWeight:700,marginBottom:8 }}>📺 Content Series Builder</div>
              <div style={{ fontSize:13,color:"var(--text-3)",marginBottom:20,lineHeight:1.6 }}>
                Build a cohesive video series where each episode references previous ones. Enable Series Mode in settings, then generate scripts in sequence.
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {seriesHistory.length ? seriesHistory.map((t,i) => (
                  <div key={i} style={{ display:"flex",gap:12,padding:"10px 14px",background:"var(--bg-2)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",alignItems:"center" }}>
                    <div style={{ width:24,height:24,borderRadius:"50%",background:"var(--brand-lt)",border:"1.5px solid var(--brand)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"var(--brand)",flexShrink:0 }}>{i+1}</div>
                    <span style={{ fontSize:13,fontWeight:500 }}>{t}</span>
                    <span className="badge badge-green" style={{ marginLeft:"auto",fontSize:9 }}>done</span>
                  </div>
                )) : (
                  <div className="empty">
                    <div className="empty-icon">📺</div>
                    <div className="empty-desc">Enable Series Mode and generate scripts to build your series here.</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

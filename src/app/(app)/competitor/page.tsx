"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Analysis {
  channelFormula: string; titlePatterns: string[]; hookStyles: string[];
  contentPillars: string[]; avgViralScore: number; bestPerformingStyle: string;
  targetAudience: string; weaknesses: string[]; opportunities: string[];
  scriptTemplate: { hookFormula: string; structure: string[]; ctaStyle: string };
  topicIdeas: Array<{ title: string; angle: string }>;
}

const EXAMPLE_CHANNELS = [
  { name:"MrBeast",      niche:"entertainment" },
  { name:"Alex Hormozi", niche:"business" },
  { name:"Andrew Huberman", niche:"health" },
  { name:"Ali Abdaal",   niche:"productivity" },
  { name:"Graham Stephan",  niche:"finance" },
  { name:"Iman Gadzhi",  niche:"business" },
];

export default function CompetitorPage() {
  const router = useRouter();
  const [channel, setChannel] = useState("");
  const [niche, setNiche] = useState("business");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis|null>(null);
  const [channelName, setChannelName] = useState("");

  const analyze = async (ch = channel) => {
    if (!ch.trim()) { toast.error("Enter a channel name"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/competitor", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ channelName: ch, niche }),
      });
      const d = await res.json();
      if (d.ok) { setAnalysis(d.analysis); setChannelName(d.channelName); toast.success("Analysis complete! 🕵️"); }
      else toast.error(d.error || "Analysis failed");
    } catch { toast.error("Request failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="page-wrap" style={{ maxWidth:1100 }}>
      <div className="ph">
        <div className="ph-eyebrow">STRATEGY INTEL</div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
          <div>
            <div className="ph-title">Competitor Intelligence</div>
            <div className="ph-sub">Decode any channel's viral formula and generate topics in their style</div>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="card" style={{ padding:20,marginBottom:24 }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 160px 140px auto",gap:10,alignItems:"flex-end",flexWrap:"wrap" }}>
          <div>
            <label>Channel Name or URL</label>
            <input value={channel} onChange={e=>setChannel(e.target.value)}
              placeholder="e.g. Ali Abdaal, MrBeast, @channelname..."
              onKeyDown={e=>e.key==="Enter"&&analyze()} />
          </div>
          <div>
            <label>Niche</label>
            <select value={niche} onChange={e=>setNiche(e.target.value)}>
              {["business","finance","health","fitness","tech","education","entertainment","cooking","travel","productivity","mindset","gaming"].map(n=><option key={n} value={n}>{n.charAt(0).toUpperCase()+n.slice(1)}</option>)}
            </select>
          </div>
          <div />
          <button className="btn btn-primary" onClick={() => analyze()} disabled={loading || !channel.trim()}>
            {loading ? <><div className="spin" style={{ borderTopColor:"#fff" }} />Analyzing...</> : "🕵️ Analyze"}
          </button>
        </div>
        <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginTop:14 }}>
          {EXAMPLE_CHANNELS.map(c => (
            <button key={c.name} className="niche-pill" onClick={() => { setChannel(c.name); setNiche(c.niche); analyze(c.name); }}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign:"center",padding:40 }}>
          <div className="spin spin-lg" style={{ borderTopColor:"var(--brand)",margin:"0 auto 16px" }} />
          <div style={{ fontWeight:700 }}>Decoding viral formula...</div>
          <div style={{ fontSize:12,color:"var(--text-3)",marginTop:4 }}>Analyzing title patterns, hook styles, and content structure</div>
        </div>
      )}

      {analysis && (
        <div className="anim-up">
          {/* Header */}
          <div style={{ display:"flex",alignItems:"center",gap:16,padding:"16px 20px",background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius)",marginBottom:20 }}>
            <div style={{ width:48,height:48,borderRadius:12,background:"var(--brand-lt)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontFamily:"var(--font-display)",fontWeight:800,color:"var(--brand)" }}>
              {channelName[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800,fontSize:16 }}>{channelName}</div>
              <div style={{ fontSize:13,color:"var(--text-3)",marginTop:2 }}>{analysis.channelFormula}</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"var(--font-display)",fontSize:32,fontWeight:800,color:"var(--green)" }}>{analysis.avgViralScore}</div>
              <div style={{ fontSize:10,color:"var(--text-4)",fontFamily:"var(--mono)" }}>AVG VIRAL SCORE</div>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <span className="badge badge-brand">{analysis.bestPerformingStyle}</span>
              <span className="badge badge-gray">{analysis.targetAudience.split(" ").slice(0,3).join(" ")}</span>
            </div>
          </div>

          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18 }}>
            {/* Title patterns */}
            <div className="card" style={{ padding:18 }}>
              <div style={{ fontWeight:700,marginBottom:12 }}>📝 Title Patterns</div>
              {analysis.titlePatterns.map((p,i) => (
                <div key={i} style={{ display:"flex",gap:10,padding:"8px 10px",borderRadius:"var(--radius-sm)",background:"var(--bg-2)",marginBottom:6,fontSize:12,alignItems:"flex-start" }}>
                  <span style={{ fontFamily:"var(--mono)",fontSize:10,color:"var(--brand)",flexShrink:0,marginTop:1 }}>#{i+1}</span>
                  <span style={{ color:"var(--text-2)",lineHeight:1.5 }}>{p}</span>
                </div>
              ))}
            </div>

            {/* Content pillars */}
            <div className="card" style={{ padding:18 }}>
              <div style={{ fontWeight:700,marginBottom:12 }}>🏛️ Content Pillars</div>
              {analysis.contentPillars.map((p,i) => (
                <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:"var(--radius-sm)",background:"var(--bg-2)",marginBottom:6 }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:"var(--cyan)",flexShrink:0 }} />
                  <span style={{ fontSize:12,color:"var(--text-2)" }}>{p}</span>
                </div>
              ))}
              <div className="divider" />
              <div style={{ fontWeight:600,fontSize:12,marginBottom:8 }}>Hook Styles</div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                {analysis.hookStyles.map((h,i) => <span key={i} className="badge badge-orange">{h}</span>)}
              </div>
            </div>

            {/* Weaknesses + Opportunities */}
            <div className="card" style={{ padding:18 }}>
              <div style={{ fontWeight:700,marginBottom:12 }}>⚠️ Their Weaknesses</div>
              {analysis.weaknesses.map((w,i) => (
                <div key={i} style={{ display:"flex",gap:10,padding:"8px 10px",borderRadius:"var(--radius-sm)",background:"var(--red-lt)",marginBottom:6,border:"1px solid rgba(255,71,87,0.12)" }}>
                  <span style={{ color:"var(--red)",fontSize:12 }}>✕</span>
                  <span style={{ fontSize:12,color:"var(--text-2)" }}>{w}</span>
                </div>
              ))}
              <div style={{ fontWeight:700,marginTop:14,marginBottom:8 }}>🟢 Your Opportunities</div>
              {analysis.opportunities.map((o,i) => (
                <div key={i} style={{ display:"flex",gap:10,padding:"8px 10px",borderRadius:"var(--radius-sm)",background:"var(--green-lt)",marginBottom:6,border:"1px solid rgba(0,229,160,0.12)" }}>
                  <span style={{ color:"var(--green)",fontSize:12 }}>→</span>
                  <span style={{ fontSize:12,color:"var(--text-2)" }}>{o}</span>
                </div>
              ))}
            </div>

            {/* Script template */}
            <div className="card" style={{ padding:18 }}>
              <div style={{ fontWeight:700,marginBottom:12 }}>🎬 Their Script Template</div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11,fontWeight:600,color:"var(--brand)",marginBottom:5 }}>HOOK FORMULA</div>
                <div style={{ padding:"10px 12px",background:"var(--bg-2)",borderRadius:"var(--radius-sm)",fontSize:12,color:"var(--text-2)",lineHeight:1.6,fontStyle:"italic" }}>
                  {analysis.scriptTemplate.hookFormula}
                </div>
              </div>
              <div style={{ fontSize:11,fontWeight:600,color:"var(--brand)",marginBottom:8 }}>3-ACT STRUCTURE</div>
              {analysis.scriptTemplate.structure.map((s,i) => (
                <div key={i} style={{ display:"flex",gap:10,marginBottom:8,alignItems:"flex-start" }}>
                  <div style={{ width:22,height:22,borderRadius:"50%",background:"var(--brand-lt)",border:"1.5px solid var(--brand)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"var(--brand)",flexShrink:0 }}>{i+1}</div>
                  <span style={{ fontSize:12,color:"var(--text-2)",lineHeight:1.5,paddingTop:2 }}>{s}</span>
                </div>
              ))}
              <div style={{ marginTop:12,padding:"8px 12px",background:"rgba(0,229,160,0.07)",borderRadius:"var(--radius-sm)",fontSize:11,color:"var(--green)" }}>
                CTA: {analysis.scriptTemplate.ctaStyle}
              </div>
            </div>
          </div>

          {/* Topic ideas */}
          <div className="card" style={{ padding:20 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
              <div style={{ fontWeight:700,fontSize:15 }}>💡 Topic Ideas in Their Style (With Your Angle)</div>
              <button className="btn btn-primary btn-sm" onClick={() => analyze()}>↺ Regenerate Ideas</button>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
              {analysis.topicIdeas.map((idea,i) => (
                <div key={i} style={{ padding:"14px 16px",background:"var(--bg-2)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)" }}>
                  <div style={{ fontSize:13,fontWeight:700,lineHeight:1.4,marginBottom:8 }}>{idea.title}</div>
                  <div style={{ fontSize:11,color:"var(--brand)",marginBottom:10,lineHeight:1.5 }}>
                    <strong>Your angle:</strong> {idea.angle}
                  </div>
                  <div style={{ display:"flex",gap:6 }}>
                    <button className="btn btn-ghost btn-xs" onClick={() => router.push(`/script-generator?topic=${encodeURIComponent(idea.title)}`)}>✍️ Write Script</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => router.push(`/factory`)}>⚡ Make Short</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && !analysis && (
        <div className="empty card" style={{ padding:48 }}>
          <div className="empty-icon">🕵️</div>
          <div className="empty-title">Competitor Intel</div>
          <div className="empty-desc">Enter any YouTube channel name to decode their viral formula — title patterns, hooks, content structure, weaknesses, and 3 ready-to-make topic ideas.</div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Video {
  id: string; title: string; channel: string; thumbnail: string;
  viewCount: number; likeCount: number; commentCount?: number; viralScore: number;
  style: string; publishedAt: string;
}

function fmtViews(n: number) { return n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(0)+"K":String(n); }
function scoreClass(n: number) { return n>=90?"badge score-viral":n>=75?"badge score-hot":n>=60?"badge score-rising":"badge score-normal"; }

const NICHES = ["AI","finance","fitness","gaming","cooking","crypto","productivity","dating","travel","coding","health","mindset","business","motivation"];
const REGIONS = ["US","GB","CA","AU","IN","DE","FR","JP","BR","MX"];

export default function ResearchPage() {
  const router = useRouter();
  const [mode, setMode]       = useState<"trending"|"niche">("trending");
  const [region, setRegion]   = useState("US");
  const [niche, setNiche]     = useState("");
  const [videos, setVideos]   = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded]   = useState(false);
  const [sort, setSort]       = useState<"viral"|"views"|"engagement">("viral");

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const params = mode==="trending" ? `type=trending&region=${region}` : `type=niche&niche=${encodeURIComponent(niche||"AI")}`;
      const res = await fetch(`/api/trending?${params}`);
      const data = await res.json();
      setVideos(data.videos || []);
      setLoaded(true);
      toast.success(`Found ${data.videos?.length || 0} videos${data.mock?" (demo)":""}`);
    } catch { toast.error("Failed to fetch videos"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVideos(); }, []); // eslint-disable-line

  const sortedVideos = [...videos].sort((a,b) => {
    if (sort === "viral") return b.viralScore - a.viralScore;
    if (sort === "views") return b.viewCount - a.viewCount;
    return (b.likeCount / Math.max(b.viewCount,1)) - (a.likeCount / Math.max(a.viewCount,1));
  });

  const viral = videos.filter(v=>v.viralScore>=90).length;
  const hot   = videos.filter(v=>v.viralScore>=75&&v.viralScore<90).length;

  const openInFactory = (v: Video) => {
    router.push(`/factory?url=https://youtube.com/watch?v=${v.id}`);
    toast.success("Opening in Shorts Factory...");
  };

  return (
    <div className="page-wrap" style={{ maxWidth:1100 }}>
      <div className="ph">
        <div className="ph-eyebrow">DISCOVERY</div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
          <div>
            <div className="ph-title">Trend Research</div>
            <div className="ph-sub">Find trending videos with viral potential — one click to turn them into Shorts</div>
          </div>
          {loaded && (
            <div style={{ display:"flex",gap:8,alignItems:"center" }}>
              <span className="badge score-viral">{viral} 🔥 viral</span>
              <span className="badge score-hot">{hot} hot</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",marginBottom:20 }}>
        <div style={{ background:"var(--bg-2)",padding:3,borderRadius:"var(--radius-sm)",display:"flex",gap:3 }}>
          {(["trending","niche"] as const).map(m => (
            <button key={m} style={{ padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",border:"none",fontFamily:"var(--font)",transition:"all 0.15s",background:mode===m?"var(--bg-card)":"transparent",color:mode===m?"var(--text)":"var(--text-3)" }}
              onClick={() => setMode(m)}>
              {m==="trending"?"🔥 Trending":"🎯 Niche"}
            </button>
          ))}
        </div>

        {mode==="trending" ? (
          <select value={region} onChange={e=>setRegion(e.target.value)} style={{ width:80 }}>
            {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        ) : (
          <input value={niche} onChange={e=>setNiche(e.target.value)} placeholder="Enter niche..." onKeyDown={e=>e.key==="Enter"&&fetchVideos()} style={{ width:200 }} />
        )}

        <button className="btn btn-primary btn-sm" onClick={fetchVideos} disabled={loading}>
          {loading?<><div className="spin spin-sm" style={{ borderTopColor:"#fff" }} />Searching...</>:"🔍 Search"}
        </button>

        <div style={{ marginLeft:"auto",display:"flex",gap:4,background:"var(--bg-2)",padding:3,borderRadius:"var(--radius-sm)" }}>
          {(["viral","views","engagement"] as const).map(s => (
            <button key={s} onClick={()=>setSort(s)} style={{ padding:"5px 10px",borderRadius:5,border:"none",background:sort===s?"var(--bg-card)":"transparent",color:sort===s?"var(--text)":"var(--text-3)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"var(--font)" }}>
              {s==="viral"?"🔥 Viral":s==="views"?"👁 Views":"💬 Engage"}
            </button>
          ))}
        </div>
      </div>

      {/* Niche pills */}
      {mode==="niche" && (
        <div style={{ display:"flex",flexWrap:"wrap",gap:7,marginBottom:20 }}>
          {NICHES.map(n => (
            <button key={n} className={`niche-pill ${niche===n?"active":""}`} onClick={() => { setNiche(n); }}>
              {n}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="research-grid">
          {Array.from({length:9}).map((_,i) => <div key={i} className="skel" style={{ height:280,borderRadius:"var(--radius)" }} />)}
        </div>
      ) : (
        <div className="research-grid">
          {sortedVideos.map(v => (
            <div key={v.id+v.title} className="research-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div style={{ aspectRatio:"16/9",overflow:"hidden",position:"relative",background:"var(--bg-2)" }}>
                <img src={v.thumbnail} alt={v.title} style={{ width:"100%",height:"100%",objectFit:"cover" }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
                <div style={{ position:"absolute",top:8,left:8 }}><span className={scoreClass(v.viralScore)}>{v.viralScore}</span></div>
                <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0)",transition:"background 0.2s",display:"flex",alignItems:"center",justifyContent:"center" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="rgba(0,0,0,0.5)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="rgba(0,0,0,0)")}>
                  <button className="btn btn-primary btn-sm" style={{ opacity:0,transition:"opacity 0.2s" }}
                    onMouseEnter={e=>(e.currentTarget.style.opacity="1")}
                    onMouseLeave={e=>(e.currentTarget.style.opacity="0")}
                    onClick={() => openInFactory(v)}>
                    ⚡ Make Shorts →
                  </button>
                </div>
              </div>
              <div style={{ padding:"12px 14px" }}>
                <div style={{ fontSize:13,fontWeight:700,lineHeight:1.4,marginBottom:6,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{v.title}</div>
                <div style={{ fontSize:11,color:"var(--text-3)",marginBottom:8 }}>{v.channel}</div>
                <div style={{ display:"flex",gap:10,fontSize:11,color:"var(--text-4)",marginBottom:10,fontFamily:"var(--mono)" }}>
                  <span>👁 {fmtViews(v.viewCount)}</span>
                  <span>👍 {fmtViews(v.likeCount)}</span>
                  {v.commentCount && <span>💬 {fmtViews(v.commentCount)}</span>}
                </div>
                <div style={{ display:"flex",gap:6 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex:1,justifyContent:"center" }} onClick={() => openInFactory(v)}>⚡ Open in Factory</button>
                  <a href={`https://youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ textDecoration:"none" }}>↗</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

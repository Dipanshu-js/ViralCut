"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

interface Short { id: string; viralScore: number; title: string; }
interface Project {
  id: string; title: string; channel: string; thumbnail: string;
  duration: number; viewCount: number; createdAt: string;
  _count: { shorts: number }; shorts: Short[];
}

function fmtTime(s: number) { return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,"0")}`; }
function fmtViews(n: number) { return n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(0)+"K":String(n); }
function timeAgo(d: string) { const days=Math.floor((Date.now()-new Date(d).getTime())/86400000); return days===0?"today":days===1?"1d ago":`${days}d ago`; }
function scoreClass(n: number) { return n>=90?"badge score-viral":n>=75?"badge score-hot":n>=60?"badge score-rising":"badge score-normal"; }

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(d => {
        if (d.projects?.length) {
          setProjects(d.projects);
        } else {
          // Show real empty state — don't inject fake data
          setProjects([]);
        }
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const loadDemo = () => {
    setUseMock(true);
    setProjects([
      { id:"p1",title:"10 Habits That Genuinely Changed My Life",channel:"Ali Abdaal",thumbnail:"https://picsum.photos/seed/proj1/400/225",duration:1842,viewCount:2400000,createdAt:"2026-02-28",_count:{shorts:3},shorts:[{id:"s1",viralScore:92,title:"Habit 1"},{id:"s2",viralScore:78,title:"Habit 2"},{id:"s3",viralScore:65,title:"Habit 3"}] },
      { id:"p2",title:"The REAL Reason You're Broke",channel:"Graham Stephan",thumbnail:"https://picsum.photos/seed/proj2/400/225",duration:1254,viewCount:5800000,createdAt:"2026-03-01",_count:{shorts:3},shorts:[{id:"s4",viralScore:97,title:"s"},{id:"s5",viralScore:88,title:"s"},{id:"s6",viralScore:71,title:"s"}] },
      { id:"p3",title:"I Tried Every AI Tool For 30 Days",channel:"TechWithTim",thumbnail:"https://picsum.photos/seed/proj3/400/225",duration:2140,viewCount:890000,createdAt:"2026-03-04",_count:{shorts:2},shorts:[{id:"s7",viralScore:84,title:"s"},{id:"s8",viralScore:76,title:"s"}] },
    ]);
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/projects", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id}) });
    setProjects(p => p.filter(x => x.id !== id));
    setDeleteId(null);
    toast.success("Project deleted");
  };

  const allShorts = projects.flatMap(p => p.shorts);
  const avgScore  = allShorts.length ? Math.round(allShorts.reduce((a,s)=>a+s.viralScore,0)/allShorts.length) : 0;
  const stats = [
    { icon:"📂", value:projects.length,  label:"Total Projects",  change:projects.length>0?"+"+projects.length+" total":"Start creating" },
    { icon:"✂️", value:allShorts.length, label:"Total Shorts",     change:allShorts.length>0?"ready to post":"Analyze a video" },
    { icon:"🔥", value:avgScore||"—",    label:"Avg Viral Score",  change:avgScore>=80?"🔥 High potential":avgScore>0?"↑ trending":"No data yet" },
    { icon:"👁️", value:fmtViews(projects.reduce((a,p)=>a+p.viewCount,0)), label:"Source Views", change:"all projects" },
  ];

  return (
    <div className="page-wrap">
      <div className="ph">
        <div className="ph-eyebrow">OVERVIEW</div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
          <div>
            <div className="ph-title">Dashboard</div>
            <div className="ph-sub">Your viral Shorts production hub</div>
          </div>
          <div style={{ display:"flex",gap:8 }}>
            {!useMock && !projects.length && <button className="btn btn-ghost btn-sm" onClick={loadDemo}>📋 Load Demo</button>}
            <button className="btn btn-primary btn-sm" onClick={() => router.push("/factory")}>+ New Project</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row stagger">
        {stats.map(s => (
          <div key={s.label} className="stat-card anim-up">
            <div style={{ fontSize:24,marginBottom:10 }}>{s.icon}</div>
            <div style={{ fontFamily:"var(--font-display)",fontSize:30,fontWeight:800,letterSpacing:-1 }}>{loading?"—":s.value}</div>
            <div style={{ fontSize:12,color:"var(--text-3)",marginTop:3 }}>{s.label}</div>
            <div style={{ fontSize:11,fontWeight:600,color:"var(--green)",marginTop:5,fontFamily:"var(--mono)" }}>{s.change}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10,marginBottom:28 }}>
        {[
          { icon:"⚡",label:"Shorts Factory",  desc:"Analyze & clip",   href:"/factory" },
          { icon:"🎬",label:"Video Editor",    desc:"Timeline editing", href:"/video-editor" },
          { icon:"🔍",label:"Trend Research",  desc:"Find viral videos",href:"/research" },
          { icon:"🕵️",label:"Competitor Intel",desc:"Decode formulas",  href:"/competitor" },
          { icon:"📅",label:"Content Calendar",desc:"Schedule posts",   href:"/calendar" },
          { icon:"✍️",label:"Script Generator",desc:"AI scripts",       href:"/script-generator" },
        ].map(a => (
          <div key={a.href} className="card card-hover" style={{ padding:"14px 16px",cursor:"pointer" }} onClick={() => router.push(a.href)}>
            <div style={{ fontSize:24,marginBottom:7 }}>{a.icon}</div>
            <div style={{ fontSize:13,fontWeight:700 }}>{a.label}</div>
            <div style={{ fontSize:11,color:"var(--text-4)",marginTop:2 }}>{a.desc}</div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
        <div className="slabel">PROJECTS ({projects.length})</div>
        {useMock && <span className="badge badge-orange" style={{ fontSize:9 }}>DEMO DATA</span>}
      </div>

      {loading ? (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:18 }}>
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height:280,borderRadius:"var(--radius)" }} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="empty card" style={{ padding:48 }}>
          <div className="empty-icon">📂</div>
          <div className="empty-title">No projects yet</div>
          <div className="empty-desc">Analyze a YouTube video in the Shorts Factory to create your first project and start generating viral Shorts.</div>
          <div style={{ display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginTop:8 }}>
            <button className="btn btn-primary" onClick={() => router.push("/factory")}>Open Shorts Factory ⚡</button>
            <button className="btn btn-ghost btn-sm" onClick={loadDemo}>View Demo Data</button>
          </div>
        </div>
      ) : (
        <div className="projects-grid stagger">
          {projects.map(p => (
            <div key={p.id} className="project-card anim-up">
              <div style={{ aspectRatio:"16/9",position:"relative",overflow:"hidden",background:"var(--bg-2)" }}>
                <Image src={p.thumbnail} alt={p.title} fill style={{ objectFit:"cover",transition:"transform 0.35s" }} onError={() => {}} sizes="(max-width:768px) 100vw, 33vw" />
                <div style={{ position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.75)",borderRadius:6,padding:"3px 8px",fontFamily:"var(--mono)",fontSize:11,color:"#fff" }}>{fmtTime(p.duration)}</div>
                <div style={{ position:"absolute",bottom:8,left:8 }}><span className="badge badge-brand">{p._count.shorts} shorts</span></div>
              </div>
              <div style={{ padding:"14px 16px" }}>
                <div style={{ fontSize:14,fontWeight:700,lineHeight:1.35,marginBottom:4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{p.title}</div>
                <div style={{ fontSize:11,color:"var(--text-3)",marginBottom:10 }}>{p.channel} · {timeAgo(p.createdAt)}</div>
                <div style={{ display:"flex",gap:5,marginBottom:12 }}>
                  {p.shorts.slice(0,3).map(s => <span key={s.id} className={scoreClass(s.viralScore)}>{s.viralScore}</span>)}
                </div>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <span style={{ fontSize:11,color:"var(--text-4)" }}>👁 {fmtViews(p.viewCount)} views</span>
                  <div style={{ display:"flex",gap:6 }}>
                    <button className="btn btn-ghost btn-xs" onClick={() => router.push("/factory")}>Open</button>
                    <button className="btn btn-danger btn-xs" onClick={() => setDeleteId(p.id)}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 }}>
          <div style={{ background:"var(--bg-card)",border:"1px solid var(--border-2)",borderRadius:"var(--radius)",padding:28,width:380,boxShadow:"0 40px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ fontSize:17,fontWeight:700,marginBottom:8 }}>Delete project?</div>
            <div style={{ fontSize:13,color:"var(--text-3)",marginBottom:22,lineHeight:1.6 }}>This will permanently delete the project and all its Shorts.</div>
            <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

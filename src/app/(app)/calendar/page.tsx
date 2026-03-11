"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Post {
  id: string;
  title: string;
  platform: string;
  scheduledFor: string;
  status: "scheduled"|"published"|"draft"|"failed";
  tags: string[];
  thumbnailUrl?: string;
}

const PLATFORMS = [
  { id:"youtube", label:"YouTube Shorts", color:"#ff4757", icon:"▶" },
  { id:"tiktok",  label:"TikTok",         color:"#00e5a0", icon:"♪" },
  { id:"instagram",label:"Instagram Reels",color:"#a855f7", icon:"◈" },
  { id:"twitter", label:"Twitter/X",       color:"#00d4ff", icon:"𝕏" },
];

const STATUS_COLORS: Record<string,string> = {
  scheduled:"var(--brand)", published:"var(--green)", draft:"var(--text-4)", failed:"var(--red)"
};

function getDaysInMonth(year: number, month: number) { return new Date(year, month+1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }

const DEMO_POSTS: Post[] = [
  { id:"p1", title:"Morning Habit That Changed My Life", platform:"youtube", scheduledFor:`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-05T10:00:00`, status:"published", tags:["productivity","habits"] },
  { id:"p2", title:"Why You're Always Broke (Fix This)", platform:"tiktok",  scheduledFor:`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-08T14:00:00`, status:"scheduled", tags:["finance"] },
  { id:"p3", title:"AI Tool That Replaced My Team",      platform:"instagram",scheduledFor:`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-12T09:00:00`, status:"scheduled", tags:["ai","tech"] },
  { id:"p4", title:"30 Day Fitness Challenge Results",   platform:"youtube", scheduledFor:`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-15T11:00:00`, status:"draft",     tags:["fitness"] },
  { id:"p5", title:"Passive Income Secrets Revealed",    platform:"tiktok",  scheduledFor:`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-20T16:00:00`, status:"scheduled", tags:["money"] },
  { id:"p6", title:"The Psychology of Success",          platform:"youtube", scheduledFor:`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-22T10:00:00`, status:"scheduled", tags:["mindset"] },
  { id:"p7", title:"Travel Hack Nobody Knows About",     platform:"instagram",scheduledFor:`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-25T14:00:00`, status:"draft",     tags:["travel"] },
];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [posts, setPosts]     = useState<Post[]>(DEMO_POSTS);
  const [view, setView]   = useState<"month"|"week"|"list">("month");
  const [selectedDay, setSelectedDay] = useState<number|null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newPost, setNewPost] = useState({ title:"", platform:"youtube", day:1, hour:10, tags:"" });

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);

  const getPostsOnDay = (day: number) => {
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return posts.filter(p => p.scheduledFor.startsWith(dateStr));
  };

  const addPost = () => {
    if (!newPost.title.trim()) { toast.error("Enter a title"); return; }
    const post: Post = {
      id: Date.now().toString(),
      title: newPost.title,
      platform: newPost.platform,
      scheduledFor: `${year}-${String(month+1).padStart(2,"0")}-${String(newPost.day).padStart(2,"0")}T${String(newPost.hour).padStart(2,"0")}:00:00`,
      status: "scheduled",
      tags: newPost.tags.split(",").map(t=>t.trim()).filter(Boolean),
    };
    setPosts(p => [...p, post]);
    setShowNew(false);
    setNewPost({ title:"", platform:"youtube", day:1, hour:10, tags:"" });
    toast.success("Post scheduled! 📅");
  };

  const deletePost = (id: string) => {
    setPosts(p => p.filter(x => x.id !== id));
    toast.success("Removed from calendar");
  };

  const statsScheduled = posts.filter(p=>p.status==="scheduled").length;
  const statsPublished = posts.filter(p=>p.status==="published").length;
  const statsDraft     = posts.filter(p=>p.status==="draft").length;

  const platformColor = (pid: string) => PLATFORMS.find(p=>p.id===pid)?.color || "var(--brand)";
  const platformIcon  = (pid: string) => PLATFORMS.find(p=>p.id===pid)?.icon || "▶";

  const selectedDayPosts = selectedDay ? getPostsOnDay(selectedDay) : [];

  return (
    <div className="page-wrap" style={{ maxWidth:1100 }}>
      <div className="ph">
        <div className="ph-eyebrow">PUBLISHING</div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
          <div>
            <div className="ph-title">Content Calendar</div>
            <div className="ph-sub">Plan, schedule, and track your Shorts publishing</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ Schedule Post</button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24 }}>
        {[
          { label:"Total Posts", value:posts.length,     icon:"📋", color:"var(--brand)" },
          { label:"Scheduled",   value:statsScheduled,   icon:"📅", color:"var(--cyan)"  },
          { label:"Published",   value:statsPublished,   icon:"✅", color:"var(--green)" },
          { label:"Drafts",      value:statsDraft,       icon:"📝", color:"var(--orange)"},
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize:22,marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontFamily:"var(--font-display)",fontSize:28,fontWeight:800,color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12,color:"var(--text-3)",marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }}>‹</button>
        <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:16,minWidth:120,textAlign:"center" }}>{MONTHS[month]} {year}</div>
        <button className="btn btn-ghost btn-sm" onClick={() => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }}>›</button>
        <button className="btn btn-ghost btn-xs" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>Today</button>
        <div style={{ marginLeft:"auto",display:"flex",gap:4,background:"var(--bg-2)",padding:3,borderRadius:"var(--radius-sm)" }}>
          {(["month","week","list"] as const).map(v => (
            <button key={v} onClick={()=>setView(v)} style={{ padding:"5px 12px",borderRadius:5,border:"none",background:view===v?"var(--bg-card)":"transparent",color:view===v?"var(--text)":"var(--text-3)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--font)" }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
          ))}
        </div>
      </div>

      {view === "month" && (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2 }}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} style={{ textAlign:"center",padding:"8px 0",fontSize:11,fontFamily:"var(--mono)",fontWeight:700,color:"var(--text-4)" }}>{d}</div>
          ))}
          {Array.from({length:firstDay}).map((_,i) => <div key={`e${i}`} />)}
          {Array.from({length:daysInMonth},(_, i) => {
            const day = i+1;
            const dayPosts = getPostsOnDay(day);
            const isToday = day===today.getDate() && month===today.getMonth() && year===today.getFullYear();
            const isSelected = selectedDay === day;
            return (
              <div key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                style={{ minHeight:90,border:`1px solid ${isSelected?"var(--brand)":"var(--border)"}`,borderRadius:"var(--radius-sm)",padding:"6px 7px",cursor:"pointer",transition:"all 0.14s",background:isSelected?"var(--brand-lt)":isToday?"rgba(108,92,231,0.05)":"transparent" }}>
                <div style={{ fontSize:12,fontWeight:isToday?800:500,color:isToday?"var(--brand)":"var(--text-3)",marginBottom:4 }}>{day}</div>
                {dayPosts.slice(0,3).map(p => (
                  <div key={p.id} style={{ fontSize:9,fontWeight:600,padding:"2px 5px",borderRadius:3,background:platformColor(p.platform)+"22",color:platformColor(p.platform),marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.4 }}>
                    {platformIcon(p.platform)} {p.title.slice(0,18)}{p.title.length>18?"…":""}
                  </div>
                ))}
                {dayPosts.length > 3 && <div style={{ fontSize:9,color:"var(--text-4)",marginTop:2 }}>+{dayPosts.length-3} more</div>}
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && (
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {posts.sort((a,b) => new Date(a.scheduledFor).getTime()-new Date(b.scheduledFor).getTime()).map(p => {
            const dt = new Date(p.scheduledFor);
            return (
              <div key={p.id} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",transition:"all 0.15s" }}>
                <div style={{ width:10,height:10,borderRadius:"50%",background:STATUS_COLORS[p.status],flexShrink:0 }} />
                <div style={{ width:100,flexShrink:0 }}>
                  <div style={{ fontFamily:"var(--mono)",fontSize:11,color:"var(--text-3)" }}>{dt.toLocaleDateString()}</div>
                  <div style={{ fontFamily:"var(--mono)",fontSize:10,color:"var(--text-4)" }}>{dt.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</div>
                </div>
                <div style={{ flex:1,overflow:"hidden" }}>
                  <div style={{ fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.title}</div>
                  <div style={{ display:"flex",gap:5,marginTop:4,flexWrap:"wrap" }}>
                    {p.tags.map((t,i)=><span key={i} className="badge badge-gray" style={{ fontSize:9 }}>#{t}</span>)}
                  </div>
                </div>
                <span style={{ fontSize:12,fontWeight:600,color:platformColor(p.platform) }}>{platformIcon(p.platform)} {PLATFORMS.find(pl=>pl.id===p.platform)?.label}</span>
                <span className="badge" style={{ background:STATUS_COLORS[p.status]+"22",color:STATUS_COLORS[p.status],border:"none",fontSize:10 }}>{p.status}</span>
                <button className="btn btn-danger btn-xs" onClick={() => deletePost(p.id)}>✕</button>
              </div>
            );
          })}
          {!posts.length && <div className="empty card"><div className="empty-icon">📅</div><div className="empty-title">No posts scheduled</div><div className="empty-desc">Click "Schedule Post" to add content to your calendar.</div></div>}
        </div>
      )}

      {/* Selected day panel */}
      {selectedDay && selectedDayPosts.length > 0 && (
        <div style={{ marginTop:20,padding:18,background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius)" }}>
          <div style={{ fontWeight:700,marginBottom:12 }}>📅 {MONTHS[month]} {selectedDay} — {selectedDayPosts.length} post{selectedDayPosts.length>1?"s":""}</div>
          {selectedDayPosts.map(p => (
            <div key={p.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"var(--bg-2)",borderRadius:"var(--radius-sm)",marginBottom:8,border:"1px solid var(--border)" }}>
              <span style={{ fontSize:18 }}>{platformIcon(p.platform)}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:600 }}>{p.title}</div>
                <div style={{ fontSize:11,color:"var(--text-3)",marginTop:2 }}>{new Date(p.scheduledFor).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
              </div>
              <span className="badge" style={{ background:STATUS_COLORS[p.status]+"22",color:STATUS_COLORS[p.status],border:"none",fontSize:10 }}>{p.status}</span>
              <button className="btn btn-danger btn-xs" onClick={() => deletePost(p.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* New post modal */}
      {showNew && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 }}>
          <div style={{ background:"var(--bg-card)",border:"1px solid var(--border-2)",borderRadius:"var(--radius)",padding:28,width:440,boxShadow:"0 40px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ fontWeight:800,fontSize:16,marginBottom:18 }}>📅 Schedule New Post</div>
            <div style={{ marginBottom:12 }}>
              <label>Title</label>
              <input value={newPost.title} onChange={e=>setNewPost(p=>({...p,title:e.target.value}))} placeholder="Short title or hook..." />
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12 }}>
              <div>
                <label>Platform</label>
                <select value={newPost.platform} onChange={e=>setNewPost(p=>({...p,platform:e.target.value}))}>
                  {PLATFORMS.map(pl=><option key={pl.id} value={pl.id}>{pl.label}</option>)}
                </select>
              </div>
              <div>
                <label>Day ({MONTHS[month]})</label>
                <select value={newPost.day} onChange={e=>setNewPost(p=>({...p,day:+e.target.value}))}>
                  {Array.from({length:daysInMonth},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label>Hour</label>
              <select value={newPost.hour} onChange={e=>setNewPost(p=>({...p,hour:+e.target.value}))}>
                {Array.from({length:24},(_,i)=><option key={i} value={i}>{i.toString().padStart(2,"0")}:00</option>)}
              </select>
            </div>
            <div style={{ marginBottom:18 }}>
              <label>Tags (comma separated)</label>
              <input value={newPost.tags} onChange={e=>setNewPost(p=>({...p,tags:e.target.value}))} placeholder="finance, money, shorts" />
            </div>
            <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={addPost}>Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

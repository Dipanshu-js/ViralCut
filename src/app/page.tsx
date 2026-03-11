"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

// ── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon:"🤖", color:"rgba(108,92,231,0.15)", acc:"#5b5bd6", title:"Groq AI Analysis", desc:"LLaMA 3.3 70b scores every moment — virality, hook strength, emotional trigger, retention signal.", tag:"AI Powered" },
  { icon:"📊", color:"rgba(0,229,160,0.12)", acc:"#00e5a0", title:"Viral Score Engine", desc:"0–99 scores from view velocity, engagement rate, hook density, and emotional intensity signals.", tag:"0–99 Score" },
  { icon:"🎨", color:"rgba(0,212,255,0.12)", acc:"#00d4ff", title:"8 Canvas Templates", desc:"Dark, Ocean, Forest, Fire, Gold, Cherry, Cosmic, Steel — animated 9:16 with glow effects.", tag:"9:16 Ready" },
  { icon:"📝", color:"rgba(253,121,168,0.12)", acc:"#fd79a8", title:"Auto Captions", desc:"YouTube captions fetched server-side (bypasses CORS). 5 styles rendered frame-perfect on Canvas.", tag:"5 Styles" },
  { icon:"🎙️", color:"rgba(255,140,66,0.14)", acc:"#ff8c42", title:"AI Voiceover", desc:"ElevenLabs → Google TTS → Browser TTS cascade. 5 voice models. No key needed for free tier.", tag:"5 Voices" },
  { icon:"📥", color:"rgba(108,92,231,0.12)", acc:"#5b5bd6", title:"Video Proxy + Embed", desc:"8 Invidious failover nodes for CORS-safe canvas drawing. YouTube embed fallback. yt-dlp server clip.", tag:"No API Key" },
  { icon:"🔥", color:"rgba(255,71,87,0.12)", acc:"#ff4757", title:"Trend Research", desc:"Trending videos by region (10 countries) or niche. Real-time view velocity and viral score dashboard.", tag:"Real-time" },
  { icon:"💡", color:"rgba(255,212,59,0.12)", acc:"#ffd43b", title:"Hook Generator", desc:"AI writes 8 hook overlay variations per Short. One-click apply to canvas. A/B test two hooks.", tag:"8 Hooks" },
  { icon:"📤", color:"rgba(0,229,160,0.12)", acc:"#00e5a0", title:"Browser Export", desc:"Canvas API + MediaRecorder exports .webm at 30FPS, 6Mbps. Entirely in-browser. Zero upload.", tag:".webm VP9" },
  { icon:"🎬", color:"rgba(0,212,255,0.12)", acc:"#00d4ff", title:"Scene Generator", desc:"AI video from text prompts. Free: Pexels/Pixabay/Canvas. Premium: Runway, Pika, Luma.", tag:"AI Video" },
  { icon:"✍️", color:"rgba(108,92,231,0.12)", acc:"#5b5bd6", title:"Script Generator", desc:"AI scripts for 6 platforms. Series mode, A/B variants, niche-specific tone tuning.", tag:"6 Platforms" },
  { icon:"🕵️", color:"rgba(255,140,66,0.14)", acc:"#ff8c42", title:"Competitor Intel", desc:"Decode any channel's content formula — title patterns, hooks, topic themes, audience psychology.", tag:"Formula Decode" },
];

const STEPS = [
  { emoji:"🔗", n:"01", title:"Paste any YouTube URL", desc:"Drop a URL. AI fetches transcript, metadata, and language. Takes 2 seconds. No download." },
  { emoji:"🤖", n:"02", title:"AI finds viral moments", desc:"Groq LLaMA 3.3 70b scores every moment — hook strength, emotional trigger, retention. 0–99 ranked." },
  { emoji:"🎨", n:"03", title:"Style with templates", desc:"8 animated templates, 5 caption styles, AI hooks, voiceover, background music. Real-time canvas." },
  { emoji:"📤", n:"04", title:"Export in browser", desc:"Canvas .webm at 30FPS directly in browser. Or server clip with yt-dlp for raw MP4. Zero server cost." },
];

const STATS = [
  { value:92, suffix:"%", label:"Viral score accuracy", icon:"🎯" },
  { value:8, suffix:"+", label:"Free canvas templates", icon:"🎨" },
  { value:5, suffix:"×", label:"Faster than manual edit", icon:"⚡" },
  { value:14400, suffix:"", label:"Free AI calls/day", icon:"🤖" },
];

const PRICING = [
  {
    name:"Starter", price:"$0", sub:"free forever", desc:"Everything you need to start",
    features:["Groq AI analysis (14,400/day)","Invidious video proxy","Canvas export .webm","8 templates + 5 caption styles","Google TTS voiceover","Script + Hook generators","Canvas Slideshow video"],
    cta:"Get started free", href:"/login", primary:false, badge:null,
  },
  {
    name:"Pro", price:"$19", sub:"per month", desc:"For serious creators",
    features:["Everything in Starter","ElevenLabs AI voiceover (5 voices)","Pexels & Pixabay stock video","YouTube API real-time trends","Competitor Intel deep analysis","Scene Generator (Runway/Pika/Luma)","AI Video Studio + timeline editor","Priority support + early features"],
    cta:"Start free trial", href:"/login", primary:true, badge:"MOST POPULAR",
  },
  {
    name:"Team", price:"$49", sub:"per month", desc:"For agencies & teams",
    features:["Everything in Pro","Up to 5 team members","Shared content calendar","Bulk export (all shorts at once)","White-label export (no watermark)","API access for integrations","Custom AI persona & tone","Dedicated Slack support"],
    cta:"Contact us", href:"/login", primary:false, badge:"COMING SOON",
  },
];

const FAQS = [
  ["Do I need a YouTube API key?", "No. ViralCut uses Invidious instances (8 failover nodes) for video proxy downloads. A YouTube API key is optional — only needed for the Trend Research page to fetch real trending data."],
  ["What AI powers the analysis?", "Groq's LLaMA 3.3 70b — the fastest LLM available. Free tier: 14,400 requests/day. Add up to 4 Groq keys for rotation under heavy load. Gemini supported as fallback."],
  ["How does video export work?", "100% browser-native. Canvas API draws each frame (template + captions + hooks), MediaRecorder captures as .webm at 30FPS, 6Mbps. No server upload needed."],
  ["Why can't I see the video in the canvas?", "YouTube blocks direct CORS requests. ViralCut uses a server-side proxy (ytproxy) to stream video. If proxy fails, an embedded YouTube player shows automatically as fallback for preview."],
  ["What voiceover options are available?", "Three tiers: ElevenLabs (premium, 5 voices — add API key), Google Translate TTS (free, no key), and Browser speechSynthesis (always works). All cascade automatically."],
  ["Is it free to self-host?", "Yes. Groq AI is free (14,400/day), Invidious is open-source, canvas export is browser-native. Only premium features (ElevenLabs, Pexels) need paid API keys."],
  ["How is it deployed?", "One-click Vercel deploy. Connect Neon PostgreSQL (free tier), add env vars, deploy. Full setup under 5 minutes."],
  ["Can I use my own API keys?", "Yes. Settings → API Keys. Groq, ElevenLabs, Pexels, Pixabay — stored encrypted per-user. Your keys, your quota."],
];

const TESTIMONIALS = [
  { avatar:"🎥", name:"Marcus R.", role:"Content Creator — 240K subs", text:"Went from 2 hours per Short to 12 minutes. The viral scoring actually works — my first batch hit 800K views.", accent:"#5b5bd6" },
  { avatar:"📱", name:"Priya S.", role:"Social Media Manager", text:"Schedules a whole week of content in one session. The competitor intel feature alone is worth the entire tool.", accent:"#00d4ff" },
  { avatar:"🚀", name:"Jake W.", role:"Faceless YouTube Channel", text:"Fully automated my shorts pipeline. AI analysis + canvas export + schedule = zero manual editing time.", accent:"#00e5a0" },
];

// ── Hooks ───────────────────────────────────────────────────────────────────

function useCountUp(target: number, started: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = Math.max(1, target / 50);
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(start));
    }, 25);
    return () => clearInterval(t);
  }, [started, target]);
  return val;
}

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Stat component ──────────────────────────────────────────────────────────

function Stat({ value, suffix, label, icon, started }: { value:number; suffix:string; label:string; icon:string; started:boolean }) {
  const v = useCountUp(value, started);
  return (
    <div style={{ textAlign:"center", padding:"24px 16px" }}>
      <div style={{ fontSize:28, marginBottom:8 }}>{icon}</div>
      <div style={{ fontWeight:900, fontSize:"clamp(28px,4vw,46px)", letterSpacing:-2, color:"var(--text)", lineHeight:1 }}>
        {v.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize:13, color:"var(--text-3)", marginTop:9 }}>{label}</div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [theme, setTheme] = useState<"dark"|"light">("dark");
  const [faqOpen, setFaqOpen] = useState<number|null>(null);
  const statsInView = useInView(0.3);
  const heroInView = useInView(0.05);

  useEffect(() => {
    const saved = localStorage.getItem("vc-theme") as "dark"|"light" | null;
    const current = document.documentElement.getAttribute("data-theme") as "dark"|"light" | null;
    setTheme(saved || current || "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("vc-theme", next);
  };

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });

  const isDark = theme === "dark";
  const brand = "#5b5bd6";
  // Generous horizontal padding for professional look
  const hPad = "clamp(24px,5vw,80px)";

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", overflowX:"hidden" }}>

      {/* Ambient glow */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"-10%", left:"-5%", width:700, height:700, borderRadius:"50%", background:`radial-gradient(circle, ${brand}15 0%, transparent 70%)`, filter:"blur(50px)" }} />
        <div style={{ position:"absolute", top:"35%", right:"-8%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, #00d4ff10 0%, transparent 70%)", filter:"blur(40px)" }} />
        <div style={{ position:"absolute", bottom:"-5%", left:"25%", width:600, height:400, borderRadius:"50%", background:"radial-gradient(circle, #00e5a008 0%, transparent 70%)", filter:"blur(40px)" }} />
      </div>

      {/* ─── NAV ─── */}
      <nav style={{ position:"sticky", top:0, zIndex:100, backdropFilter:"blur(20px)", background:isDark?"rgba(10,10,18,0.9)":"rgba(255,255,255,0.9)", borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.08)"}` }}>
        <div style={{ maxWidth:1400, margin:"0 auto", padding:`0 ${hPad}`, display:"flex", alignItems:"center", justifyContent:"space-between", height:64 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:`linear-gradient(135deg,${brand},#00d4ff)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>⚡</div>
            <span style={{ fontWeight:800, fontSize:19, letterSpacing:-0.5 }}>ViralCut</span>
            <span style={{ fontSize:10, color:brand, fontWeight:700, background:`${brand}15`, border:`1px solid ${brand}35`, borderRadius:4, padding:"1px 7px", marginLeft:2 }}>BETA</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:2, marginLeft:"auto", marginRight:20 }}>
            {["Features","How it works","Pricing","FAQ"].map(item=>(
              <button key={item} onClick={()=>scrollTo(item.toLowerCase().replace(/ /g,"-"))}
                style={{ background:"none", borderTop:"none", borderLeft:"none", borderRight:"none", borderBottom:"2px solid transparent", cursor:"pointer", color:"var(--text-3)", fontSize:14, fontWeight:500, padding:"6px 14px", transition:"color 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.color="var(--text)"}
                onMouseLeave={e=>e.currentTarget.style.color="var(--text-3)"}>
                {item}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={toggleTheme} style={{ width:36, height:36, borderRadius:9, border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`, background:"none", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-2)" }}>
              {isDark?"☀️":"🌙"}
            </button>
            <Link href="/login" style={{ fontSize:13, fontWeight:600, color:"var(--text-2)", textDecoration:"none", padding:"8px 16px", borderRadius:9, border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`, transition:"all 0.15s" }}>
              Log in
            </Link>
            <Link href="/login" style={{ fontSize:13, fontWeight:700, color:"#fff", textDecoration:"none", padding:"8px 18px", borderRadius:9, background:`linear-gradient(135deg,${brand},#7c6cdf)`, boxShadow:`0 2px 16px ${brand}40` }}>
              Get started →
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section ref={heroInView.ref} style={{ position:"relative", zIndex:1, padding:`clamp(70px,10vw,120px) ${hPad} clamp(56px,8vw,96px)`, textAlign:"center", maxWidth:1400, margin:"0 auto" }}>

        <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:26, padding:"6px 16px", borderRadius:20, border:`1px solid ${brand}35`, background:`${brand}10`, fontSize:12, fontWeight:600, color:brand, letterSpacing:0.3, opacity:heroInView.visible?1:0, transition:"opacity 0.7s 0.1s" }}>
          ⚡ Powered by Groq LLaMA 3.3 70b — 14,400 free AI calls/day
        </div>

        <h1 style={{ fontSize:"clamp(38px,7vw,86px)", fontWeight:900, letterSpacing:-3, lineHeight:1.04, marginBottom:24, opacity:heroInView.visible?1:0, transform:heroInView.visible?"translateY(0)":"translateY(32px)", transition:"all 0.75s ease 0.2s" }}>
          Turn any YouTube video<br/>
          <span style={{ background:`linear-gradient(135deg,${brand} 0%,#00d4ff 55%,#00e5a0 100%)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
            into viral Shorts
          </span>
        </h1>

        <p style={{ fontSize:"clamp(16px,2.2vw,20px)", color:"var(--text-3)", lineHeight:1.65, marginBottom:36, maxWidth:640, margin:"0 auto 36px", opacity:heroInView.visible?1:0, transform:heroInView.visible?"translateY(0)":"translateY(20px)", transition:"all 0.75s ease 0.35s" }}>
          AI finds the best moments, auto-captions them, adds hooks and voiceover, then exports a styled 9:16 Short — directly in your browser. Free forever.
        </p>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:14, flexWrap:"wrap", marginBottom:40, opacity:heroInView.visible?1:0, transform:heroInView.visible?"translateY(0)":"translateY(20px)", transition:"all 0.75s ease 0.45s" }}>
          <Link href="/login" style={{ display:"inline-flex", alignItems:"center", gap:9, padding:"14px 28px", borderRadius:12, background:`linear-gradient(135deg,${brand},#7c6cdf)`, color:"#fff", textDecoration:"none", fontWeight:700, fontSize:16, boxShadow:`0 4px 24px ${brand}50` }}>
            🚀 Start for free
          </Link>
          <button onClick={()=>scrollTo("how-it-works")} style={{ padding:"14px 24px", borderRadius:12, border:`1px solid ${isDark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"}`, background:"none", color:"var(--text-2)", fontWeight:600, fontSize:15, cursor:"pointer" }}>
            ▶ How it works
          </button>
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:20, flexWrap:"wrap", opacity:heroInView.visible?1:0, transition:"opacity 0.7s ease 0.55s" }}>
          {["✓ No credit card","✓ Free Groq AI","✓ Download clips","✓ Browser export","✓ Dark mode","✓ Self-hostable"].map(b=>(
            <span key={b} style={{ fontSize:12.5, color:"var(--text-4)", fontWeight:500 }}>{b}</span>
          ))}
        </div>

        {/* ── App mockup ── */}
        <div style={{ marginTop:60, opacity:heroInView.visible?1:0, transform:heroInView.visible?"translateY(0) scale(1)":"translateY(48px) scale(0.95)", transition:"all 0.9s ease 0.65s", position:"relative", maxWidth:960, margin:"60px auto 0" }}>
          <div style={{ background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)", border:`1px solid ${isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"}`, borderRadius:22, padding:16, backdropFilter:"blur(12px)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12, padding:"0 4px" }}>
              {["#ff5f56","#ffbd2e","#27c93f"].map(c=><div key={c} style={{ width:11, height:11, borderRadius:"50%", background:c }} />)}
              <div style={{ flex:1, marginLeft:10, height:22, borderRadius:6, background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)", display:"flex", alignItems:"center", paddingLeft:12, fontSize:11, color:"var(--text-4)" }}>
                app.viralcut.ai/factory
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"210px 1fr 200px", gap:10, borderRadius:14, overflow:"hidden", minHeight:340 }}>
              {/* Shorts list */}
              <div style={{ background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)", borderRadius:12, padding:12 }}>
                <div style={{ fontSize:9, color:"var(--text-4)", fontWeight:700, letterSpacing:1.2, marginBottom:10 }}>5 SHORTS FOUND</div>
                {[{s:92,t:"The ONE habit that 10x'd my productivity",c:"#5b5bd6"},{s:87,t:"Why most people fail at this",c:"#00d4ff"},{s:78,t:"I tried this for 30 days — results",c:"#00e5a0"},{s:65,t:"Stop doing this immediately",c:"#f97316"},{s:61,t:"Science behind high performers",c:"#f43f5e"}].map((item,i)=>(
                  <div key={i} style={{ padding:"8px 10px", borderRadius:8, marginBottom:5, background:i===0?`${item.c}18`:"transparent", border:`1px solid ${i===0?`${item.c}40`:"transparent"}` }}>
                    <div style={{ display:"flex", gap:5, marginBottom:3 }}><span style={{ fontSize:9, fontWeight:800, color:item.c, background:`${item.c}20`, borderRadius:3, padding:"1px 5px" }}>{item.s}</span></div>
                    <div style={{ fontSize:10, fontWeight:600, color:"var(--text-2)", lineHeight:1.3 }}>{item.t}</div>
                  </div>
                ))}
              </div>
              {/* Canvas preview */}
              <div style={{ background:isDark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ width:112, height:200, borderRadius:12, background:"linear-gradient(180deg,#0d0f18,#1a0a2e)", position:"relative", overflow:"hidden", boxShadow:`0 0 32px ${brand}45` }}>
                  <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at 50% 40%,${brand}28 0%,transparent 65%)` }} />
                  <div style={{ position:"absolute", top:18, left:7, right:7, textAlign:"center" }}>
                    <div style={{ fontSize:7, fontWeight:800, color:"#fff", letterSpacing:0.5, lineHeight:1.3, textShadow:`0 0 10px ${brand}` }}>THIS CHANGED EVERYTHING</div>
                  </div>
                  <div style={{ position:"absolute", bottom:28, left:7, right:7, background:"rgba(108,92,231,0.88)", borderRadius:4, padding:"3px 5px" }}>
                    <div style={{ fontSize:6, fontWeight:700, color:"#fff", lineHeight:1.4 }}>I added just ONE thing to my morning routine and productivity tripled</div>
                  </div>
                  <div style={{ position:"absolute", bottom:11, left:7, right:7, height:2, background:"rgba(255,255,255,0.1)", borderRadius:1 }}>
                    <div style={{ width:"42%", height:"100%", background:brand, borderRadius:1 }} />
                  </div>
                  <div style={{ position:"absolute", top:8, right:7 }}><span style={{ fontSize:6, background:"rgba(255,255,255,0.9)", color:"#000", borderRadius:3, padding:"1px 3px", fontWeight:800 }}>9:16</span></div>
                </div>
              </div>
              {/* Settings panel */}
              <div style={{ background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)", borderRadius:12, padding:12 }}>
                <div style={{ display:"flex", gap:3, marginBottom:12 }}>
                  {["Style","Hooks","Caps","Voice","Video"].map((t,i)=>(
                    <div key={t} style={{ flex:1, padding:"3px 1px", borderRadius:4, background:i===0?brand:"transparent", fontSize:7, fontWeight:700, color:i===0?"#fff":"var(--text-4)", textAlign:"center" }}>{t}</div>
                  ))}
                </div>
                <div style={{ fontSize:8, color:"var(--text-4)", fontWeight:700, marginBottom:7, letterSpacing:0.5 }}>TEMPLATE</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:3, marginBottom:12 }}>
                  {["#0d0f18","#0c1445","#052e16","#1c0a00","#1c1004","#200a0a","#0a0a1f","#0f172a"].map((bg,i)=>(
                    <div key={i} style={{ aspectRatio:"2/3", borderRadius:4, background:bg, border:`1.5px solid ${i===0?brand:"transparent"}` }} />
                  ))}
                </div>
                <div style={{ fontSize:8, color:"var(--text-4)", fontWeight:700, marginBottom:6, letterSpacing:0.5 }}>CAPTIONS</div>
                <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                  {["Bold","Neon","Boxed","Yellow","Word"].map((s,i)=>(
                    <div key={s} style={{ padding:"2px 6px", borderRadius:3, background:i===0?`${brand}25`:"var(--bg-2)", border:`1px solid ${i===0?brand:"var(--border)"}`, fontSize:7, color:i===0?brand:"var(--text-4)", fontWeight:600 }}>{s}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div style={{ position:"absolute", top:-16, right:"14%", background:`linear-gradient(135deg,${brand},#7c6cdf)`, borderRadius:12, padding:"8px 14px", boxShadow:`0 4px 20px ${brand}60` }}>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.75)", fontWeight:600 }}>Viral Score</div>
            <div style={{ fontSize:24, fontWeight:900, color:"#fff", lineHeight:1 }}>92</div>
          </div>
          <div style={{ position:"absolute", bottom:-14, left:"11%", background:"rgba(0,229,160,0.92)", borderRadius:10, padding:"6px 14px", boxShadow:"0 4px 16px rgba(0,229,160,0.45)" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#000" }}>🎬 5 viral moments found!</div>
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section style={{ padding:`40px ${hPad}`, position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:1400, margin:"0 auto", background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)", border:`1px solid ${isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"}`, borderRadius:22 }}>
          <div ref={statsInView.ref} style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))" }}>
            {STATS.map((s,i)=>(
              <div key={i} style={{ borderRight:i<STATS.length-1?`1px solid ${isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}`:undefined }}>
                <Stat {...s} started={statsInView.visible} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" style={{ padding:`clamp(70px,8vw,110px) ${hPad}`, position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <div style={{ fontSize:11, fontWeight:700, color:brand, letterSpacing:2.5, marginBottom:14 }}>HOW IT WORKS</div>
            <h2 style={{ fontSize:"clamp(28px,4vw,50px)", fontWeight:900, letterSpacing:-2, marginBottom:16 }}>From URL to Short in 4 steps</h2>
            <p style={{ fontSize:16, color:"var(--text-3)", maxWidth:500, margin:"0 auto" }}>No manual editing. No software. Runs entirely in your browser.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:24 }}>
            {STEPS.map((step,i)=>(
              <div key={i}
                style={{ padding:"30px 26px", borderRadius:18, background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)", border:`1px solid ${isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"}`, transition:"all 0.22s", cursor:"default" }}
                onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-5px)"; e.currentTarget.style.boxShadow=`0 10px 28px ${brand}20`; e.currentTarget.style.borderColor=`${brand}45`; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; e.currentTarget.style.borderColor=""; }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                  <span style={{ fontSize:30 }}>{step.emoji}</span>
                  <span style={{ fontFamily:"monospace", fontSize:12, color:brand, fontWeight:800, letterSpacing:1 }}>{step.n}</span>
                </div>
                <h3 style={{ fontSize:17, fontWeight:800, marginBottom:10, letterSpacing:-0.4 }}>{step.title}</h3>
                <p style={{ fontSize:14, color:"var(--text-3)", lineHeight:1.68 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES — horizontal scroll ─── */}
      <section id="features" style={{ padding:`clamp(70px,8vw,110px) 0`, position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:1400, margin:"0 auto", paddingLeft:hPad, paddingRight:hPad }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div style={{ fontSize:11, fontWeight:700, color:brand, letterSpacing:2.5, marginBottom:14 }}>FEATURES</div>
            <h2 style={{ fontSize:"clamp(28px,4vw,50px)", fontWeight:900, letterSpacing:-2, marginBottom:16 }}>Everything you need. Nothing you don&apos;t.</h2>
            <p style={{ fontSize:16, color:"var(--text-3)", maxWidth:520, margin:"0 auto" }}>12 tools in one platform. Every feature is free or has a free tier.</p>
          </div>
        </div>
        {/* Scrollable feature row */}
        <div style={{ overflowX:"auto", paddingBottom:16, cursor:"grab" }}
          onMouseDown={e => {
            const el = e.currentTarget;
            el.style.cursor = "grabbing";
            const startX = e.pageX - el.offsetLeft;
            const scrollLeft = el.scrollLeft;
            const onMove = (ev: MouseEvent) => { el.scrollLeft = scrollLeft - (ev.pageX - el.offsetLeft - startX); };
            const onUp = () => { el.style.cursor = "grab"; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
          }}>
          <div style={{ display:"flex", gap:16, padding:`0 ${hPad}`, width:"max-content" }}>
            {FEATURES.map((f,i)=>(
              <div key={i}
                style={{ width:270, flexShrink:0, padding:"22px 22px", borderRadius:16, background:f.color, border:`1px solid ${f.acc}25`, transition:"all 0.2s", userSelect:"none" }}
                onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`0 8px 24px ${f.acc}25`; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                  <span style={{ fontSize:28 }}>{f.icon}</span>
                  <span style={{ fontSize:9.5, fontWeight:700, color:f.acc, background:`${f.acc}18`, border:`1px solid ${f.acc}35`, borderRadius:5, padding:"2px 7px", flexShrink:0 }}>{f.tag}</span>
                </div>
                <h3 style={{ fontSize:15, fontWeight:800, marginBottom:9, letterSpacing:-0.3 }}>{f.title}</h3>
                <p style={{ fontSize:12.5, color:"var(--text-3)", lineHeight:1.68 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"center", marginTop:18, gap:8, opacity:0.5 }}>
          <span style={{ fontSize:12, color:"var(--text-4)" }}>← drag to scroll →</span>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section style={{ padding:`clamp(70px,8vw,110px) ${hPad}`, position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:50 }}>
            <div style={{ fontSize:11, fontWeight:700, color:brand, letterSpacing:2.5, marginBottom:14 }}>RESULTS</div>
            <h2 style={{ fontSize:"clamp(26px,3.5vw,44px)", fontWeight:900, letterSpacing:-1.5 }}>Creators shipping faster with ViralCut</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:20 }}>
            {TESTIMONIALS.map((t,i)=>(
              <div key={i} style={{ padding:"26px 26px", borderRadius:18, background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)", border:`1px solid ${t.accent}28` }}>
                <div style={{ display:"flex", alignItems:"center", gap:13, marginBottom:16 }}>
                  <div style={{ width:46, height:46, borderRadius:"50%", background:`${t.accent}18`, border:`2px solid ${t.accent}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:800 }}>{t.name}</div>
                    <div style={{ fontSize:12, color:"var(--text-4)", marginTop:2 }}>{t.role}</div>
                  </div>
                </div>
                <p style={{ fontSize:14, color:"var(--text-2)", lineHeight:1.72, fontStyle:"italic" }}>&ldquo;{t.text}&rdquo;</p>
                <div style={{ marginTop:14, display:"flex", gap:2 }}>
                  {[0,1,2,3,4].map(j=><span key={j} style={{ color:t.accent, fontSize:13 }}>★</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING — 3 cards ─── */}
      <section id="pricing" style={{ padding:`clamp(70px,8vw,110px) ${hPad}`, position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <div style={{ fontSize:11, fontWeight:700, color:brand, letterSpacing:2.5, marginBottom:14 }}>PRICING</div>
            <h2 style={{ fontSize:"clamp(28px,4vw,50px)", fontWeight:900, letterSpacing:-2, marginBottom:16 }}>Simple, transparent pricing</h2>
            <p style={{ fontSize:16, color:"var(--text-3)" }}>Start free. Upgrade when you&apos;re ready. Cancel any time.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))", gap:20, alignItems:"start" }}>
            {PRICING.map((plan,i)=>(
              <div key={i} style={{ padding:"30px 28px", borderRadius:20, background:plan.primary?`${brand}10`:isDark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)", border:`2px solid ${plan.primary?brand:isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"}`, position:"relative", boxShadow:plan.primary?`0 4px 32px ${brand}22`:"none" }}>
                {plan.badge && (
                  <div style={{ position:"absolute", top:-13, left:"50%", transform:"translateX(-50%)", background:plan.primary?brand:"rgba(255,212,59,0.9)", borderRadius:8, padding:"3px 14px", fontSize:10, fontWeight:800, color:plan.primary?"#fff":"#000", whiteSpace:"nowrap" }}>
                    {plan.badge}
                  </div>
                )}
                <div style={{ marginBottom:22 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"var(--text-3)", marginBottom:6 }}>{plan.name}</div>
                  <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:6 }}>
                    <span style={{ fontSize:48, fontWeight:900, letterSpacing:-2.5, lineHeight:1, color:"var(--text)" }}>{plan.price}</span>
                    {plan.price !== "$0" && <span style={{ fontSize:13, color:"var(--text-4)" }}>/{plan.sub}</span>}
                    {plan.price === "$0" && <span style={{ fontSize:13, color:"var(--green)", fontWeight:700 }}>{plan.sub}</span>}
                  </div>
                  <p style={{ fontSize:13, color:"var(--text-3)", marginTop:4 }}>{plan.desc}</p>
                </div>
                <div style={{ marginBottom:26, display:"flex", flexDirection:"column", gap:9 }}>
                  {plan.features.map((f,j)=>(
                    <div key={j} style={{ display:"flex", gap:9, fontSize:13, color:"var(--text-2)", alignItems:"flex-start" }}>
                      <span style={{ color:plan.primary?brand:"var(--green)", fontWeight:700, flexShrink:0, marginTop:1 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
                <Link href={plan.href} style={{ display:"block", textAlign:"center", padding:"13px", borderRadius:11, background:plan.primary?`linear-gradient(135deg,${brand},#7c6cdf)`:"transparent", border:plan.primary?"none":`1px solid ${isDark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"}`, color:plan.primary?"#fff":"var(--text-2)", textDecoration:"none", fontWeight:700, fontSize:14, transition:"all 0.15s" }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p style={{ textAlign:"center", marginTop:24, fontSize:13, color:"var(--text-4)" }}>
            * Pro and Team plans are coming soon. Early access users get full features free during beta.
          </p>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" style={{ padding:`clamp(70px,8vw,110px) ${hPad}`, position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:760, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:50 }}>
            <div style={{ fontSize:11, fontWeight:700, color:brand, letterSpacing:2.5, marginBottom:14 }}>FAQ</div>
            <h2 style={{ fontSize:"clamp(28px,4vw,48px)", fontWeight:900, letterSpacing:-2 }}>Common questions</h2>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {FAQS.map(([q,a],i)=>(
              <div key={i} style={{ borderRadius:14, border:`1px solid ${faqOpen===i?`${brand}40`:isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"}`, background:faqOpen===i?`${brand}06`:"transparent", overflow:"hidden", transition:"border-color 0.2s" }}>
                <button style={{ width:"100%", padding:"17px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"none", borderTop:"none", borderLeft:"none", borderRight:"none", borderBottom:"none", cursor:"pointer", color:"var(--text)", fontSize:15, fontWeight:600, textAlign:"left", gap:12 }} onClick={()=>setFaqOpen(faqOpen===i?null:i)}>
                  <span>{q}</span>
                  <span style={{ fontSize:20, color:brand, transform:faqOpen===i?"rotate(45deg)":"rotate(0)", transition:"transform 0.2s", flexShrink:0 }}>+</span>
                </button>
                {faqOpen===i && <div style={{ padding:"0 22px 18px", fontSize:14, color:"var(--text-3)", lineHeight:1.72 }}>{a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section style={{ padding:`clamp(70px,8vw,110px) ${hPad}`, position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div style={{ textAlign:"center", padding:"clamp(50px,7vw,80px) 40px", borderRadius:28, background:`linear-gradient(135deg,${brand}16,#00d4ff0d)`, border:`1px solid ${brand}30`, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:"-20%", right:"-5%", width:400, height:400, borderRadius:"50%", background:`radial-gradient(circle,${brand}10 0%,transparent 70%)`, filter:"blur(30px)", pointerEvents:"none" }} />
            <div style={{ fontSize:52, marginBottom:20 }}>🚀</div>
            <h2 style={{ fontSize:"clamp(28px,4vw,50px)", fontWeight:900, letterSpacing:-2, marginBottom:18 }}>Start creating viral Shorts today</h2>
            <p style={{ fontSize:16, color:"var(--text-3)", marginBottom:34, lineHeight:1.68, maxWidth:560, margin:"0 auto 34px" }}>
              Free forever during early access. No credit card. No download.<br/>Just paste a URL and let AI do the work.
            </p>
            <Link href="/login" style={{ display:"inline-flex", alignItems:"center", gap:9, padding:"15px 32px", borderRadius:14, background:`linear-gradient(135deg,${brand},#7c6cdf)`, color:"#fff", textDecoration:"none", fontWeight:700, fontSize:16, boxShadow:`0 4px 26px ${brand}55` }}>
              🎬 Start for free — no card needed
            </Link>
            <div style={{ marginTop:22, display:"flex", alignItems:"center", justifyContent:"center", gap:22, flexWrap:"wrap" }}>
              {["✓ Groq AI free tier","✓ Export in browser","✓ Self-hostable","✓ Open source"].map(t=>(
                <span key={t} style={{ fontSize:13, color:"var(--text-4)", fontWeight:500 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ padding:`48px ${hPad} 32px`, borderTop:`1px solid ${isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.07)"}`, position:"relative", zIndex:1 }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:36, marginBottom:44 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:16 }}>
                <div style={{ width:30, height:30, borderRadius:8, background:`linear-gradient(135deg,${brand},#00d4ff)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>⚡</div>
                <span style={{ fontWeight:800, fontSize:17 }}>ViralCut</span>
              </div>
              <p style={{ fontSize:13, color:"var(--text-4)", lineHeight:1.68, maxWidth:220, marginBottom:16 }}>AI-powered YouTube Shorts factory. Free, open-source, self-hostable.</p>
              <button onClick={toggleTheme} style={{ padding:"6px 13px", borderRadius:8, border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`, background:"none", cursor:"pointer", fontSize:12, color:"var(--text-3)" }}>
                {isDark?"☀️ Light mode":"🌙 Dark mode"}
              </button>
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"var(--text-4)", letterSpacing:1.5, marginBottom:14 }}>PRODUCT</div>
              {["Factory","Viral Analyzer","Trend Research","Script Generator","Scene Generator","Video Studio","Competitor Intel","Content Calendar"].map(l=>(
                <Link key={l} href="/login" style={{ display:"block", fontSize:13, color:"var(--text-3)", textDecoration:"none", marginBottom:9, transition:"color 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.color="var(--text)"}
                  onMouseLeave={e=>e.currentTarget.style.color="var(--text-3)"}>{l}</Link>
              ))}
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"var(--text-4)", letterSpacing:1.5, marginBottom:14 }}>TECH STACK</div>
              {[["Next.js 15","App Router"],["Groq AI","LLaMA 3.3 70b"],["PostgreSQL","Neon serverless"],["Canvas API","Browser export"],["Invidious","Video proxy"],["ElevenLabs","TTS (optional)"],["Prisma ORM","Type-safe DB"],["JWT Auth","HttpOnly cookies"]].map(([n,d])=>(
                <div key={n} style={{ display:"flex", justifyContent:"space-between", marginBottom:9, fontSize:12.5 }}>
                  <span style={{ color:"var(--text-3)" }}>{n}</span>
                  <span style={{ color:"var(--text-4)" }}>{d}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"var(--text-4)", letterSpacing:1.5, marginBottom:14 }}>FREE TIER</div>
              {[["Groq AI","14,400/day"],["Invidious","Video proxy"],["Canvas Export","Browser-native"],["Google TTS","No key needed"],["Captions","Auto-fetched"],["Templates","8 built-in"],["Script Gen","Unlimited"],["Hook Gen","8 per short"]].map(([n,d])=>(
                <div key={n} style={{ display:"flex", justifyContent:"space-between", marginBottom:9, fontSize:12.5 }}>
                  <span style={{ color:"var(--green)", fontWeight:600 }}>✓ {n}</span>
                  <span style={{ color:"var(--text-4)" }}>{d}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop:`1px solid ${isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"}`, paddingTop:24, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <span style={{ fontSize:13, color:"var(--text-4)" }}>© 2025 ViralCut — Built with Next.js, Groq AI &amp; ❤️</span>
            <div style={{ display:"flex", gap:20 }}>
              <Link href="/login" style={{ fontSize:13, color:"var(--text-4)", textDecoration:"none" }}>Get started free →</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");
  const [theme, setTheme]       = useState<"dark"|"light">("dark");

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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) { setErr("Please fill in all fields."); return; }
    setLoading(true); setErr("");
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { email, password, name };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Failed"); setLoading(false); return; }
      toast.success(mode === "login" ? "Welcome back! 👋" : "Account created! 🎉");
      router.push("/dashboard");
    } catch {
      setErr("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <button
        onClick={toggleTheme}
        style={{ position:"fixed",top:16,right:16,zIndex:100,width:36,height:36,borderRadius:"50%",border:"1px solid var(--border-2)",background:"var(--bg-2)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s" }}
        title="Toggle theme"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
      {/* Left */}
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:48,position:"relative" }}>
        <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse at 30% 50%,rgba(108,92,231,0.08),transparent 60%)" }} />
        <div style={{ width:"100%",maxWidth:380,position:"relative",zIndex:1 }}>
          <Link href="/" style={{ fontSize:13,color:"var(--text-3)",cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginBottom:32,textDecoration:"none",transition:"color 0.15s" }}>
            ← Back to home
          </Link>
          <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:28 }}>
            <div className="logo-mark">✂️</div>
            <span style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:17 }}>ViralCut</span>
          </div>

          {/* Mode Tabs */}
          <div style={{ display:"flex",background:"var(--bg-2)",padding:3,borderRadius:"var(--radius-sm)",marginBottom:24,gap:3 }}>
            {(["login","register"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }}
                style={{ flex:1,padding:"8px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",border:"none",fontFamily:"var(--font)",transition:"all 0.15s",background:mode===m?"var(--bg-card)":"transparent",color:mode===m?"var(--text)":"var(--text-3)" }}>
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <h1 style={{ fontSize:26,fontWeight:800,letterSpacing:-0.8,marginBottom:6 }}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p style={{ fontSize:14,color:"var(--text-3)",marginBottom:24 }}>
            {mode === "login" ? "Sign in to access your Shorts factory." : "Join ViralCut and start creating viral content."}
          </p>
          {err && (
            <div style={{ background:"var(--red-lt)",border:"1px solid rgba(255,71,87,0.2)",borderRadius:"var(--radius-sm)",padding:"10px 13px",fontSize:13,color:"var(--red)",marginBottom:14 }}>{err}</div>
          )}
          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <div style={{ marginBottom:14 }}>
                <label>Name (optional)</label>
                <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" />
              </div>
            )}
            <div style={{ marginBottom:14 }}>
              <label>Email address</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div style={{ marginBottom:20 }}>
              <label>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width:"100%",justifyContent:"center",fontSize:15 }} disabled={loading}>
              {loading ? <><div className="spin" style={{ borderTopColor:"#fff" }} />{mode === "login" ? "Signing in..." : "Creating account..."}</> : (mode === "login" ? "Sign in →" : "Create account →")}
            </button>
          </form>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width:440,background:"var(--bg-1)",borderLeft:"1px solid var(--border)",padding:48,display:"flex",flexDirection:"column",justifyContent:"center",gap:24,position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-100,right:-100,width:400,height:400,background:"radial-gradient(circle,rgba(108,92,231,0.12),transparent 70%)",pointerEvents:"none" }} />
        <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:22,lineHeight:1.3,color:"var(--text)" }}>
          Turn any YouTube video into viral Shorts in minutes
        </div>
        {[
          { icon:"⚡", text:"AI finds the most viral moments automatically" },
          { icon:"🎨", text:"8 beautiful canvas templates for 9:16 format" },
          { icon:"📝", text:"Auto captions in 5 styles synced to audio" },
          { icon:"🎙️", text:"ElevenLabs voiceover with 5 AI voice models" },
          { icon:"📤", text:"Export real .webm video directly from browser" },
          { icon:"🎬", text:"Free canvas slideshow — zero setup required" },
          { icon:"🔥", text:"Viral score algorithm powered by Groq AI" },
        ].map((f, i) => (
          <div key={i} style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:36,height:36,borderRadius:"var(--radius-sm)",background:"var(--brand-lt)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0 }}>{f.icon}</div>
            <span style={{ fontSize:13,color:"var(--text-2)",lineHeight:1.5 }}>{f.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

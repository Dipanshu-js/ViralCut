"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Settings {
  defaultTemplate: string;
  defaultCapStyle: string;
  defaultVoice: string;
  defaultPlatform: string;
  defaultStyle: string;
  groqKeys: string[];
  elevenLabsKey: string;
  youtubeApiKey: string;
  geminiKey: string;
  xaiKey: string;
  runwayKey: string;
  pikaKey: string;
  lumaKey: string;
  pexelsKey: string;
  pixabayKey: string;
}

const DEFAULTS: Settings = {
  defaultTemplate: "dark", defaultCapStyle: "bold", defaultVoice: "adam",
  defaultPlatform: "shorts", defaultStyle: "motivational",
  groqKeys: [], elevenLabsKey: "", youtubeApiKey: "", geminiKey: "",
  xaiKey: "", runwayKey: "", pikaKey: "", lumaKey: "", pexelsKey: "", pixabayKey: "",
};

type Tab = "preferences" | "api" | "account" | "appearance";

function maskKey(k: string) {
  if (!k || k.length < 10) return k;
  return k.slice(0, 6) + "•".repeat(Math.max(0, k.length - 10)) + k.slice(-4);
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: ok ? "var(--green)" : "var(--border-3)",
      boxShadow: ok ? "0 0 6px var(--green)" : "none",
      flexShrink: 0,
    }} />
  );
}

interface ApiFieldProps {
  label: string;
  description: string;
  link?: string;
  linkText?: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  badge?: string;
  badgeClass?: string;
}

function ApiField({ label, description, link, linkText, value, placeholder, onChange, badge, badgeClass }: ApiFieldProps) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const save = () => {
    onChange(draft.trim());
    setEditing(false);
    if (draft.trim()) toast.success(`${label} saved`);
  };
  const clear = () => {
    onChange("");
    setDraft("");
    setEditing(false);
    toast.success(`${label} cleared`);
  };

  return (
    <div style={{ marginBottom: 18, padding: "16px 18px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", border: `1px solid ${value ? "rgba(0,229,160,0.2)" : "var(--border)"}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <StatusDot ok={!!value} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-2)" }}>{label}</span>
            {badge && <span className={`badge ${badgeClass || "badge-gray"}`} style={{ fontSize: 9 }}>{badge}</span>}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-4)", lineHeight: 1.5, marginBottom: 4 }}>{description}</p>
          {link && <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--brand)", textDecoration: "none" }}>↗ {linkText || "Get API key"}</a>}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {value && !editing && (
            <button className="btn btn-ghost btn-xs" onClick={() => setShow(s => !s)}>{show ? "Hide" : "Show"}</button>
          )}
          {!editing ? (
            <button className="btn btn-primary btn-xs" onClick={() => { setEditing(true); setDraft(value); }}>
              {value ? "Edit" : "Add"}
            </button>
          ) : (
            <>
              <button className="btn btn-ghost btn-xs" onClick={() => setEditing(false)}>Cancel</button>
              {value && <button className="btn btn-danger btn-xs" onClick={clear}>Clear</button>}
              <button className="btn btn-success btn-xs" onClick={save}>Save</button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={e => e.key === "Enter" && save()}
          autoFocus
          style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 12 }}
        />
      ) : value ? (
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)", padding: "6px 10px", background: "var(--bg-card)", borderRadius: 6, border: "1px solid var(--border)", marginTop: 6 }}>
          {show ? value : maskKey(value)}
        </div>
      ) : null}
    </div>
  );
}

export default function SettingsPage() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("preferences");
  const [newGroqKey, setNewGroqKey] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [userEmail, setUserEmail] = useState("");
  const [changePw, setChangePw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    const t = (localStorage.getItem("vc-theme") as "dark" | "light") || "dark";
    setTheme(t);
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.settings) setS({ ...DEFAULTS, ...d.settings });
    }).finally(() => setLoading(false));
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user?.email) setUserEmail(d.user.email);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const d = await res.json();
      if (d.ok) toast.success("Settings saved! ✅");
      else toast.error("Save failed");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const saveField = async (key: string, value: unknown) => {
    const updated = { ...s, [key]: value };
    setS(updated as Settings);
    await fetch("/api/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  };

  const addGroqKey = () => {
    const k = newGroqKey.trim();
    if (!k) return;
    if (!k.startsWith("gsk_")) { toast.error("Invalid Groq key — must start with gsk_"); return; }
    const updated = [...(s.groqKeys || []), k];
    saveField("groqKeys", updated);
    setNewGroqKey("");
    toast.success("Groq key added ✅");
  };

  const removeGroqKey = (i: number) => {
    const updated = s.groqKeys.filter((_, idx) => idx !== i);
    saveField("groqKeys", updated);
    toast.success("Key removed");
  };

  const applyTheme = (t: "dark" | "light") => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("vc-theme", t);
    toast.success(`${t === "dark" ? "🌙 Dark" : "☀️ Light"} mode active`);
  };

  const changePassword = async () => {
    if (!changePw.current || !changePw.next) { toast.error("Fill all fields"); return; }
    if (changePw.next !== changePw.confirm) { toast.error("Passwords don't match"); return; }
    if (changePw.next.length < 6) { toast.error("Password must be 6+ characters"); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: changePw.current, newPassword: changePw.next }),
      });
      const d = await res.json();
      if (d.ok) { toast.success("Password changed! ✅"); setChangePw({ current: "", next: "", confirm: "" }); }
      else toast.error(d.error || "Failed to change password");
    } catch { toast.error("Failed"); }
    finally { setPwSaving(false); }
  };

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "preferences", label: "Preferences", icon: "🎨" },
    { id: "appearance",  label: "Appearance",  icon: "✨" },
    { id: "api",         label: "API Keys",     icon: "🔑" },
    { id: "account",     label: "Account",      icon: "👤" },
  ];

  const SelRow = ({ label, k, opts }: { label: string; k: keyof Settings; opts: string[] }) => (
    <div style={{ marginBottom: 16 }}>
      <label>{label}</label>
      <select value={String(s[k] || "")} onChange={e => setS(p => ({ ...p, [k]: e.target.value }))}>
        {opts.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
      </select>
    </div>
  );

  return (
    <div className="page-wrap" style={{ maxWidth: 860 }}>
      <div className="ph">
        <div className="ph-eyebrow">CONFIGURATION</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="ph-title">Settings</div>
            <div className="ph-sub">Manage your API keys, preferences, and account</div>
          </div>
          {(tab === "preferences") && (
            <button className="btn btn-primary" onClick={save} disabled={saving || loading}>
              {saving ? <><div className="spin" style={{ borderTopColor: "#fff" }} />Saving...</> : "💾 Save Changes"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--bg-2)", padding: 4, borderRadius: "var(--radius-sm)", marginBottom: 28, width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "8px 18px", borderRadius: 6, border: "none", fontFamily: "var(--font)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: tab === t.id ? "var(--bg-card)" : "transparent", color: tab === t.id ? "var(--text)" : "var(--text-3)", boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.3)" : "none" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 80, borderRadius: "var(--radius-sm)" }} />)}
        </div>
      ) : (
        <>
          {/* ── PREFERENCES ── */}
          {tab === "preferences" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
              <div className="card" style={{ padding: 22 }}>
                <div style={{ fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🎨</span> Default Appearance
                </div>
                <SelRow label="Default Template" k="defaultTemplate" opts={["dark","ocean","forest","fire","gold","cherry","cosmic","steel"]} />
                <SelRow label="Default Caption Style" k="defaultCapStyle" opts={["bold","neon","boxed","yellow","word"]} />
                <SelRow label="Default Voice" k="defaultVoice" opts={["adam","rachel","drew","bella","josh"]} />
              </div>
              <div className="card" style={{ padding: 22 }}>
                <div style={{ fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>📱</span> Platform & Content Style
                </div>
                <SelRow label="Default Platform" k="defaultPlatform" opts={["shorts","reels","tiktok","youtube"]} />
                <SelRow label="Default Content Style" k="defaultStyle" opts={["motivational","educational","storytelling","listicle","how-to","documentary"]} />
                <div style={{ marginTop: 18, padding: "12px 14px", background: "var(--brand-lt)", border: "1px solid rgba(108,92,231,0.2)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--brand)", lineHeight: 1.6 }}>
                  💡 These defaults auto-fill when you open the Shorts Factory, Script Generator, and Video Studio.
                </div>
              </div>

              {/* Keyboard shortcuts reference */}
              <div className="card" style={{ padding: 22, gridColumn: "1/-1" }}>
                <div style={{ fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}><span>⌨️</span> Keyboard Shortcuts</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 8 }}>
                  {[
                    ["Space", "Play / Pause canvas"], ["E", "Export current short"],
                    ["←", "Previous short"], ["→", "Next short"],
                    ["1–8", "Switch templates"], ["Ctrl+Z", "Undo last change"],
                    ["Ctrl+S", "Save project"], ["Esc", "Close panels"],
                  ].map(([key, desc]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--bg-2)", borderRadius: "var(--radius-xs)", border: "1px solid var(--border)" }}>
                      <kbd style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", borderRadius: 5, padding: "2px 8px", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "var(--text-2)", flexShrink: 0 }}>{key}</kbd>
                      <span style={{ fontSize: 12, color: "var(--text-3)" }}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── APPEARANCE ── */}
          {tab === "appearance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 16 }}>🌓 Color Theme</div>
                <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 22 }}>Choose your preferred interface appearance. Changes apply instantly.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {(["dark", "light"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => applyTheme(t)}
                      style={{
                        padding: "20px 24px", borderRadius: "var(--radius)", border: `2px solid ${theme === t ? "var(--brand)" : "var(--border-2)"}`,
                        background: t === "dark" ? "#04050a" : "#f5f6fa",
                        cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden",
                        boxShadow: theme === t ? "0 0 0 3px var(--brand-glow)" : "none",
                      }}
                    >
                      {theme === t && (
                        <div style={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>✓</div>
                      )}
                      <div style={{ fontSize: 28, marginBottom: 10 }}>{t === "dark" ? "🌙" : "☀️"}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: t === "dark" ? "#f0f4ff" : "#0d1117", marginBottom: 4 }}>
                        {t === "dark" ? "Dark Mode" : "Light Mode"}
                      </div>
                      <div style={{ fontSize: 12, color: t === "dark" ? "#5a6b85" : "#6b7a9a" }}>
                        {t === "dark" ? "Easy on the eyes in low light" : "Clear and bright for daylight use"}
                      </div>
                      {/* Preview dots */}
                      <div style={{ marginTop: 14, display: "flex", gap: 6, justifyContent: "center" }}>
                        {[t === "dark" ? "#1a1f30" : "#e8ecf5", t === "dark" ? "#0f1623" : "#ffffff", t === "dark" ? "#6c5ce7" : "#5b4fd6"].map((c, i) => (
                          <div key={i} style={{ width: 24, height: 24, borderRadius: 6, background: c, border: "1px solid rgba(128,128,128,0.15)" }} />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 16 }}>🎨 Interface Density</div>
                <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 16 }}>More options coming soon — font size, sidebar width, and animation speed.</p>
                <div style={{ padding: "14px 16px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, color: "var(--text-3)" }}>
                  ⚙️ Density controls, custom accent colors, and layout preferences are on the roadmap.
                </div>
              </div>
            </div>
          )}

          {/* ── API KEYS ── */}
          {tab === "api" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {/* Groq — special multi-key */}
              <div className="card" style={{ padding: 22, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                      🤖 Groq API Keys
                      <span className="badge badge-green" style={{ fontSize: 9 }}>PRIMARY AI</span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-4)", lineHeight: 1.5 }}>
                      Add multiple keys for automatic rotation. Free tier: 14,400 requests/day per key. Powers all AI analysis, scripts, and hooks.
                    </p>
                    <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--brand)", textDecoration: "none" }}>↗ Get free Groq API key</a>
                  </div>
                  <span className="badge badge-brand" style={{ fontSize: 9, flexShrink: 0 }}>{s.groqKeys?.length || 0} key{s.groqKeys?.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ marginBottom: 10, marginTop: 14 }}>
                  {(s.groqKeys || []).map((k, i) => (
                    <div key={i} className="api-key-row active">
                      <StatusDot ok />
                      <span className="api-key-value">{maskKey(k)}</span>
                      <span style={{ fontSize: 10, color: "var(--green)", fontFamily: "var(--mono)", fontWeight: 700 }}>Active</span>
                      <button className="btn btn-danger btn-xs" onClick={() => removeGroqKey(i)}>Remove</button>
                    </div>
                  ))}
                  {!s.groqKeys?.length && (
                    <div style={{ fontSize: 12, color: "var(--text-4)", textAlign: "center", padding: "14px 0" }}>No Groq keys configured — add one to unlock AI features</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={newGroqKey}
                    onChange={e => setNewGroqKey(e.target.value)}
                    placeholder="gsk_..."
                    style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 12 }}
                    onKeyDown={e => e.key === "Enter" && addGroqKey()}
                  />
                  <button className="btn btn-primary btn-sm" onClick={addGroqKey}>+ Add Key</button>
                </div>
              </div>

              {/* Individual API keys */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <ApiField
                    label="ElevenLabs" description="AI voiceover for Shorts hooks. 5 premium voices — Adam, Rachel, Drew, Bella, Josh."
                    link="https://elevenlabs.io/app/speech-synthesis" linkText="Get ElevenLabs key"
                    badge="Voice TTS" badgeClass="badge-orange"
                    value={s.elevenLabsKey || ""} placeholder="sk_..."
                    onChange={v => saveField("elevenLabsKey", v)}
                  />
                  <ApiField
                    label="YouTube Data API" description="Required for Trend Research, video metadata, and viral scoring."
                    link="https://console.cloud.google.com/apis/library/youtube.googleapis.com" linkText="Enable YouTube API"
                    badge="Trending" badgeClass="badge-red"
                    value={s.youtubeApiKey || ""} placeholder="AIza..."
                    onChange={v => saveField("youtubeApiKey", v)}
                  />
                  <ApiField
                    label="Pexels" description="Free stock video library. High-quality footage for Scene Generator. 200 req/hr."
                    link="https://www.pexels.com/api/" linkText="Get free Pexels key"
                    badge="Free Video" badgeClass="badge-green"
                    value={s.pexelsKey || ""} placeholder="..."
                    onChange={v => saveField("pexelsKey", v)}
                  />
                  <ApiField
                    label="Pixabay" description="Additional free stock video & image library. Great for b-roll generation."
                    link="https://pixabay.com/api/docs/" linkText="Get free Pixabay key"
                    badge="Free Video" badgeClass="badge-green"
                    value={s.pixabayKey || ""} placeholder="..."
                    onChange={v => saveField("pixabayKey", v)}
                  />
                </div>
                <div>
                  <ApiField
                    label="Google Gemini" description="Optional fallback AI when Groq is at rate limit. Powers script generation backup."
                    link="https://aistudio.google.com/app/apikey" linkText="Get Gemini key"
                    badge="AI Fallback" badgeClass="badge-cyan"
                    value={s.geminiKey || ""} placeholder="AIza..."
                    onChange={v => saveField("geminiKey", v)}
                  />
                  <ApiField
                    label="xAI / Grok" description="Premium AI video generation. Generates high-quality clips from text prompts."
                    link="https://console.x.ai/" linkText="Get xAI key"
                    badge="Premium Video" badgeClass="badge-brand"
                    value={s.xaiKey || ""} placeholder="xai-..."
                    onChange={v => saveField("xaiKey", v)}
                  />
                  <ApiField
                    label="Runway ML" description="State-of-the-art AI video generation (Gen-3). Cinematic quality output."
                    link="https://app.runwayml.com/account/team/billing" linkText="Get Runway key"
                    badge="Premium Video" badgeClass="badge-brand"
                    value={s.runwayKey || ""} placeholder="key_..."
                    onChange={v => saveField("runwayKey", v)}
                  />
                  <ApiField
                    label="Luma Dream Machine" description="High-quality AI video generation with realistic motion and physics."
                    link="https://lumalabs.ai/dream-machine/api" linkText="Get Luma key"
                    badge="Premium Video" badgeClass="badge-brand"
                    value={s.lumaKey || ""} placeholder="..."
                    onChange={v => saveField("lumaKey", v)}
                  />
                </div>
              </div>

              <div style={{ marginTop: 16, padding: "14px 16px", background: "rgba(255,140,66,0.07)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--orange)", lineHeight: 1.7 }}>
                🔒 <strong>Security:</strong> API keys are encrypted in your database. For maximum security, use environment variables in <code style={{ fontFamily: "var(--mono)" }}>.env.local</code> instead — env vars always take priority over database keys.
              </div>
            </div>
          )}

          {/* ── ACCOUNT ── */}
          {tab === "account" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Profile */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontWeight: 700, marginBottom: 18, fontSize: 15 }}>👤 Profile</div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--brand-lt)", border: "2px solid var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "var(--brand)" }}>
                    {userEmail?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{userEmail}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, color: "var(--brand)", marginTop: 3 }}>PRO PLAN</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Email", value: userEmail },
                    { label: "Plan", value: "Pro (Self-hosted)", color: "var(--brand)" },
                    { label: "Storage", value: "Neon PostgreSQL" },
                    { label: "Status", value: "Active", color: "var(--green)" },
                  ].map(f => (
                    <div key={f.label} style={{ padding: "12px 14px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "var(--mono)", fontWeight: 700, marginBottom: 4 }}>{f.label.toUpperCase()}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: f.color || "var(--text-2)" }}>{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Change password */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>🔐 Change Password</div>
                <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 18 }}>Choose a strong password with at least 6 characters.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label>Current Password</label>
                    <input type="password" value={changePw.current} onChange={e => setChangePw(p => ({ ...p, current: e.target.value }))} placeholder="••••••••" />
                  </div>
                  <div>
                    <label>New Password</label>
                    <input type="password" value={changePw.next} onChange={e => setChangePw(p => ({ ...p, next: e.target.value }))} placeholder="••••••••" />
                  </div>
                  <div>
                    <label>Confirm New</label>
                    <input type="password" value={changePw.confirm} onChange={e => setChangePw(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" />
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={changePassword} disabled={pwSaving}>
                  {pwSaving ? <><div className="spin" style={{ borderTopColor: "#fff" }} />Saving...</> : "🔐 Change Password"}
                </button>
              </div>

              {/* Data */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>🗄️ Data & Storage</div>
                <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 16 }}>Your data is stored in your own database. Videos are streamed via proxy — nothing stored on server.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { icon: "🎞️", label: "Generated clips", desc: "Stored as URLs in database" },
                    { icon: "📋", label: "Projects & shorts", desc: "Full metadata + scores" },
                    { icon: "🔑", label: "API keys", desc: "Encrypted, never logged" },
                    { icon: "⚙️", label: "Settings", desc: "Per-user preferences" },
                  ].map(d => (
                    <div key={d.label} style={{ padding: "12px 14px", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 18 }}>{d.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{d.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>{d.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

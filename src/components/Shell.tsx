"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  email: string;
  isAdmin: boolean;
  children: React.ReactNode;
}

const NAV = [
  { href: "/dashboard",        icon: "◫",  label: "Dashboard" },
  { href: "/factory",          icon: "⚡",  label: "Shorts Factory" },
  { href: "/video-editor",     icon: "🎬", label: "Video Editor" },
  { href: "/video-studio",     icon: "🎥", label: "AI Video Studio" },
  { href: "/scene-generator",  icon: "🎞️", label: "Scene Generator" },
  { href: "/research",         icon: "🔍", label: "Trend Research" },
  { href: "/script-generator", icon: "✍️", label: "Script Generator" },
  { href: "/viral-analyzer",   icon: "📊", label: "Viral Analyzer" },
  { href: "/competitor",       icon: "🕵️", label: "Competitor Intel" },
  { href: "/calendar",         icon: "📅", label: "Content Calendar" },
];

export default function Shell({ email, isAdmin, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Read saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("vc-theme") as "dark" | "light" | null;
    const current = document.documentElement.getAttribute("data-theme") as "dark" | "light";
    setTheme(saved || current || "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("vc-theme", next);
  };

  const logout = async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    toast.success("Signed out");
    router.push("/");
  };

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile header */}
      <div className="mobile-header">
        <button
          style={{ border: "none", background: "none", color: "var(--text)", fontSize: 20, cursor: "pointer", padding: 4 }}
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Menu"
        >☰</button>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div className="logo-mark" style={{ width: 26, height: 26, fontSize: 13 }}>✂️</div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>ViralCut</span>
        </div>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${mobileOpen ? "open" : ""}`}>
        {/* Logo */}
        <div
          style={{ padding: "4px 8px 20px", display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}
          onClick={() => { router.push("/"); setMobileOpen(false); }}
        >
          <div className="logo-mark">✂️</div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17 }}>ViralCut</span>
        </div>

        {/* Create */}
        <div className="nav-section-label">Create</div>
        {NAV.slice(0, 4).map(n => (
          <Link key={n.href} href={n.href} className={`nav-item ${pathname === n.href ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
            <span style={{ width: 20, textAlign: "center", fontSize: 15 }}>{n.icon}</span>
            {n.label}
          </Link>
        ))}

        {/* Discover */}
        <div className="nav-section-label" style={{ marginTop: 8 }}>Discover</div>
        {NAV.slice(4, 8).map(n => (
          <Link key={n.href} href={n.href} className={`nav-item ${pathname === n.href ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
            <span style={{ width: 20, textAlign: "center", fontSize: 15 }}>{n.icon}</span>
            {n.label}
          </Link>
        ))}

        {/* Strategy */}
        <div className="nav-section-label" style={{ marginTop: 8 }}>Strategy</div>
        {NAV.slice(8).map(n => (
          <Link key={n.href} href={n.href} className={`nav-item ${pathname === n.href ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
            <span style={{ width: 20, textAlign: "center", fontSize: 15 }}>{n.icon}</span>
            {n.label}
          </Link>
        ))}

        {/* Account */}
        <div className="nav-section-label" style={{ marginTop: 8 }}>Account</div>
        <Link href="/settings" className={`nav-item ${pathname === "/settings" ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
          <span style={{ width: 20, textAlign: "center", fontSize: 15 }}>⚙️</span> Settings
        </Link>

        {/* Bottom: user + theme */}
        <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          {/* Theme toggle row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 10px" }}>
            <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>
              {theme === "dark" ? "🌙 Dark mode" : "☀️ Light mode"}
            </span>
            <button
              onClick={toggleTheme}
              className={`toggle ${theme === "light" ? "on" : ""}`}
              aria-label="Toggle light/dark mode"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            />
          </div>

          {/* User info */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", marginBottom: 6 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--brand-lt)", border: "1.5px solid var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--brand)", flexShrink: 0 }}>
              {email[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--brand)" }}>{isAdmin ? "ADMIN" : "PRO PLAN"}</div>
            </div>
          </div>
          <button
            className="nav-item"
            style={{ color: "var(--red)", width: "100%", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font)", justifyContent: "flex-start" }}
            onClick={logout}
          >
            <span style={{ width: 20, textAlign: "center", fontSize: 15 }}>↩</span> Sign out
          </button>
        </div>
      </div>

      <div className="main-area">{children}</div>
    </div>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function UsageGate({ isAdmin }: { isAdmin: boolean }) {
  const [limited, setLimited] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  const check = useCallback(async () => {
    if (isAdmin) return;
    try {
      const res = await fetch("/api/usage");
      const data = await res.json();
      if (data.limited) setLimited(true);
    } catch {}
  }, [isAdmin]);

  useEffect(() => {
    check();
    window.addEventListener("vc:usage", check);
    return () => window.removeEventListener("vc:usage", check);
  }, [check]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/me", { method: "DELETE" });
    } finally {
      router.push("/login");
    }
  };

  if (!limited) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "var(--bg-secondary, #111)",
          border: "1px solid var(--border, #2a2a2a)",
          borderRadius: "20px",
          padding: "48px 40px",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 0 60px rgba(108,92,231,0.3)",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
            margin: "0 auto 24px",
          }}
        >
          ⚡
        </div>

        <h2
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "var(--text-primary, #fff)",
            marginBottom: "12px",
            lineHeight: 1.2,
          }}
        >
          Free limit reached
        </h2>

        <p
          style={{
            fontSize: "15px",
            color: "var(--text-secondary, #888)",
            lineHeight: 1.6,
            marginBottom: "32px",
          }}
        >
          You&apos;ve used your free action. Upgrade to Pro for unlimited video
          generation, AI analysis, trend research, and more.
        </p>

        <div
          style={{
            background: "var(--bg-tertiary, #1a1a1a)",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "13px",
            color: "var(--text-secondary, #888)",
          }}
        >
          <span>Free tier usage</span>
          <span style={{ color: "#ff6b6b", fontWeight: 600 }}>1 / 1 used</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={() => router.push("/")}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
              border: "none",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            ✨ Upgrade to Pro
          </button>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              background: "transparent",
              border: "1px solid var(--border, #2a2a2a)",
              color: "var(--text-secondary, #888)",
              fontSize: "15px",
              fontWeight: 500,
              cursor: signingOut ? "not-allowed" : "pointer",
              opacity: signingOut ? 0.6 : 1,
            }}
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>

        <p
          style={{
            fontSize: "12px",
            color: "var(--text-tertiary, #555)",
            marginTop: "20px",
          }}
        >
          No credit card required to sign up for Pro
        </p>
      </div>
    </div>
  );
}

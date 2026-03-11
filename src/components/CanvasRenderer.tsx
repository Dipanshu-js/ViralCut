"use client";

export function h2rgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  return c.length === 3
    ? [parseInt(c[0]+c[0],16), parseInt(c[1]+c[1],16), parseInt(c[2]+c[2],16)]
    : [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
}

export interface DrawOpts {
  bg1: string; bg2: string; acc: string;
  hookText: string; capText: string; capStyleId: string;
  cta: string; progress: number;
  videoEl?: HTMLVideoElement | null;  // ← THE KEY: actual video element to composite
  videoOpacity?: number;              // 0–1 overlay opacity (default 1)
  showVideoBackground?: boolean;      // whether to draw video as bg
}

export function drawFrame(canvas: HTMLCanvasElement, opts: DrawOpts) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const { bg1, bg2, acc, hookText, capText, capStyleId, cta, progress, videoEl } = opts;
  const videoOpacity = opts.videoOpacity ?? 1;
  const showVideoBackground = opts.showVideoBackground !== false;

  // ── 1. Background layer ────────────────────────────────────────────────────
  if (videoEl && showVideoBackground && videoEl.readyState >= 2 && !videoEl.paused || 
      videoEl && showVideoBackground && videoEl.readyState >= 2) {
    // Draw video frame as background — crop to fill 9:16 canvas
    const vw = videoEl.videoWidth || 1280;
    const vh = videoEl.videoHeight || 720;

    // Calculate crop to fill canvas maintaining aspect ratio
    const canvasAspect = W / H;    // 9:16 = 0.5625
    const videoAspect  = vw / vh;

    let sx = 0, sy = 0, sw = vw, sh = vh;

    if (videoAspect > canvasAspect) {
      // Video is wider than canvas — crop sides
      sh = vh;
      sw = vh * canvasAspect;
      sx = (vw - sw) / 2;
    } else {
      // Video is taller than canvas — crop top/bottom
      sw = vw;
      sh = vw / canvasAspect;
      sy = (vh - sh) / 2;
    }

    ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, W, H);

    // Dark overlay to make text readable
    const overlay = ctx.createLinearGradient(0, 0, 0, H);
    overlay.addColorStop(0, "rgba(0,0,0,0.45)");
    overlay.addColorStop(0.4, "rgba(0,0,0,0.15)");
    overlay.addColorStop(0.6, "rgba(0,0,0,0.25)");
    overlay.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);

  } else {
    // Fallback: gradient background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, bg1);
    bg.addColorStop(1, bg2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Accent glow
    const [r,g,b] = h2rgb(acc);
    const cx = W/2, cy = H * 0.45;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.9);
    glow.addColorStop(0, `rgba(${r},${g},${b},0.14)`);
    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Floating dots (only for no-video mode)
    for (let i = 0; i < 8; i++) {
      const [r2,g2,b2] = h2rgb(acc);
      const angle = progress * 1.2 + i * (Math.PI * 2 / 8);
      const dx = cx + Math.cos(angle) * W * 0.38;
      const dy = cy + Math.sin(angle) * H * 0.26;
      const size = 1.5 + Math.sin(progress * Math.PI * 2 + i) * 1;
      ctx.beginPath();
      ctx.arc(dx, dy, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r2},${g2},${b2},${0.18 - i * 0.018})`;
      ctx.fill();
    }
  }

  // ── 2. Vignettes (always applied) ─────────────────────────────────────────
  const tv = ctx.createLinearGradient(0, 0, 0, H * 0.28);
  tv.addColorStop(0, "rgba(0,0,0,0.65)"); tv.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = tv; ctx.fillRect(0, 0, W, H * 0.28);

  const bv = ctx.createLinearGradient(0, H * 0.55, 0, H);
  bv.addColorStop(0, "rgba(0,0,0,0)"); bv.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = bv; ctx.fillRect(0, H * 0.55, W, H * 0.45);

  // ── 3. Accent bar ──────────────────────────────────────────────────────────
  ctx.fillStyle = acc;
  ctx.fillRect(0, 0, W, 4);

  // ── 4. Hook text ───────────────────────────────────────────────────────────
  if (progress < 0.16 && hookText) {
    const fi = Math.min(progress / 0.05, 1);
    const fo = progress > 0.11 ? Math.max(0, 1 - (progress - 0.11) / 0.05) : 1;
    ctx.save();
    ctx.globalAlpha = fi * fo;
    const fs = Math.floor(W * 0.086);
    ctx.font = `900 ${fs}px Syne, sans-serif`;
    ctx.textAlign = "center";
    ctx.shadowColor = acc; ctx.shadowBlur = 24;
    ctx.fillStyle = "#ffffff";
    const words = hookText.toUpperCase().split(" ");
    const half = Math.ceil(words.length / 2);
    ctx.fillText(words.slice(0, half).join(" "), W/2, H * 0.22);
    const l2 = words.slice(half).join(" ");
    if (l2) ctx.fillText(l2, W/2, H * 0.22 + fs * 1.25);
    ctx.restore();
  }

  // ── 5. Captions ────────────────────────────────────────────────────────────
  if (capText) {
    const fontSize = Math.floor(W * 0.063);
    ctx.save(); ctx.textAlign = "center"; ctx.shadowBlur = 0;

    switch (capStyleId) {
      case "neon":
        ctx.fillStyle = "#67e8f9"; ctx.shadowColor = "#67e8f9"; ctx.shadowBlur = 18;
        ctx.font = `800 ${fontSize}px Outfit,sans-serif`; break;
      case "yellow":
        ctx.fillStyle = "#fde047";
        ctx.font = `900 ${fontSize}px Outfit,sans-serif`; break;
      case "word":
        ctx.fillStyle = "#fff"; ctx.shadowColor = "#a78bfa"; ctx.shadowBlur = 14;
        ctx.font = `900 ${fontSize}px Outfit,sans-serif`; break;
      default:
        ctx.fillStyle = "#fff";
        ctx.font = `800 ${fontSize}px Outfit,sans-serif`;
    }

    const words = capText.split(" ");
    const lines: string[] = [];
    let curr = "";
    for (const w of words) {
      const test = curr ? `${curr} ${w}` : w;
      if (ctx.measureText(test).width > W * 0.84) { lines.push(curr); curr = w; }
      else curr = test;
    }
    if (curr) lines.push(curr);

    const lh = fontSize * 1.35;
    const yStart = H * 0.73 - (lines.length * lh) / 2;

    lines.forEach((line, i) => {
      if (capStyleId === "boxed") {
        const tw = ctx.measureText(line).width;
        ctx.shadowBlur = 0; ctx.fillStyle = "rgba(0,0,0,0.76)";
        ctx.fillRect(W/2 - tw/2 - 10, yStart + i * lh - fontSize, tw + 20, fontSize * 1.45);
        ctx.fillStyle = "#fff";
      }
      // Text shadow for readability on video
      if (capStyleId !== "boxed") {
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
      }
      ctx.fillText(line, W/2, yStart + i * lh);
    });
    ctx.restore();
  }

  // ── 6. CTA ─────────────────────────────────────────────────────────────────
  if (progress > 0.85 && cta) {
    const fade = Math.min((progress - 0.85) / 0.08, 1);
    ctx.save(); ctx.globalAlpha = fade;
    ctx.font = `700 ${Math.floor(W * 0.056)}px Outfit,sans-serif`;
    ctx.textAlign = "center"; ctx.fillStyle = acc;
    ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 12;
    ctx.fillText(cta, W/2, H * 0.91);
    ctx.restore();
  }

  // ── 7. Progress bar ────────────────────────────────────────────────────────
  const pby = H - 5;
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath(); ctx.roundRect(0, pby, W, 5, 2.5); ctx.fill();
  if (progress > 0) {
    const [r,g,b] = h2rgb(acc);
    const pg = ctx.createLinearGradient(0, 0, W * progress, 0);
    pg.addColorStop(0, acc); pg.addColorStop(1, `rgba(${r},${g},${b},0.75)`);
    ctx.fillStyle = pg; ctx.shadowColor = acc; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.roundRect(0, pby, W * progress, 5, 2.5); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── 8. Video source indicator ─────────────────────────────────────────────
  if (videoEl && showVideoBackground && videoEl.readyState >= 2) {
    ctx.save();
    ctx.font = `600 ${Math.floor(W * 0.028)}px Outfit,sans-serif`;
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText("▶ YT", W - 10, H - 12);
    ctx.restore();
  }
}

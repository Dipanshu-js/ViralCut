<div align="center">

[![banner](https://capsule-render.vercel.app/api?type=waving&color=0:0d1117,100:6c5ce7&height=140&section=header&text=ViralCut&fontSize=38&fontColor=ffffff&fontAlignY=50&desc=AI+YouTube+Shorts+Factory&descSize=14&descAlignY=70&descFontColor=8b949e)](https://viralcut.vercel.app)

[![npm](https://img.shields.io/badge/next.js-15-238636?style=flat-square&labelColor=0d1117)](https://nextjs.org)
&nbsp;
[![ci](https://img.shields.io/github/actions/workflow/status/Dipanshu-js/ViralCut/ci.yml?style=flat-square&color=238636&labelColor=0d1117&label=ci)](https://github.com/Dipanshu-js/ViralCut/actions)
&nbsp;
[![node](https://img.shields.io/badge/groq-llama_3.3_70b-238636?style=flat-square&labelColor=0d1117)](https://groq.com)
&nbsp;
[![license](https://img.shields.io/github/license/Dipanshu-js/ViralCut?style=flat-square&color=8b949e&labelColor=0d1117)](LICENSE)
&nbsp;
[![stars](https://img.shields.io/github/stars/Dipanshu-js/ViralCut?style=flat-square&color=f0b429&labelColor=0d1117)](https://github.com/Dipanshu-js/ViralCut/stargazers)

</div>

---

Paste any YouTube URL. AI scores every moment 0–99. Pick the best clips, style them on an animated 9:16 canvas, add captions + hooks + voiceover, and export `.webm` — entirely in your browser. Free forever.

```
https://youtube.com/watch?v=dQw4w9WgXcQ

⚡ Analyzing with Groq LLaMA 3.3...

  #1  92  "The ONE habit that changed everything"   0:14 – 1:02
  #2  87  "Why most people quit before this point"  3:44 – 4:28
  #3  78  "I tried this for 30 days — here's what"  7:11 – 8:05

✔ 5 viral moments found · template: Dark · captions: Neon · voice: ElevenLabs
→ Exporting canvas .webm 30fps 6Mbps... done (12.4MB)
```

---

## ⚙️ Tech Stack

- **[Next.js 15](https://nextjs.org/)** — App Router, 31 API routes, full-stack TypeScript.
- **[Groq SDK](https://groq.com/)** — LLaMA 3.3 70b. 14,400 free req/day. Viral scoring, hooks, scripts, competitor intel.
- **[PostgreSQL + Neon](https://neon.tech/)** — Serverless DB for users, projects, and per-user API keys.
- **[Prisma ORM](https://www.prisma.io/)** — Type-safe client. Auto-generates on `npm install`.
- **[Canvas API + MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)** — 100% browser-native `.webm` export at 30FPS, 6Mbps. Zero upload.
- **[ElevenLabs](https://elevenlabs.io/)** — Premium voiceover. Cascades to Google TTS → Browser TTS automatically.
- **[JWT + bcryptjs](https://www.npmjs.com/package/jsonwebtoken)** — HttpOnly cookie auth. No third-party provider.

---

## 🔋 Features

👉 **AI Viral Analysis** — 0–99 score per moment: hook strength, emotion, view velocity, retention.

👉 **8 Canvas Templates** — Dark, Ocean, Forest, Fire, Gold, Cherry, Cosmic, Steel. All animated 9:16.

👉 **Auto Captions** — Server-side YouTube caption fetch (bypasses CORS). 5 render styles.

👉 **Voiceover Cascade** — ElevenLabs → Google TTS → Browser TTS. Works with zero API keys.

👉 **Browser Export** — `.webm` VP9, 30FPS, 6Mbps. No server upload, no software needed.

👉 **Hook Generator** — 8 AI overlay hooks per Short. One-click apply to canvas.

👉 **Trend Research** — Real-time trending by region (10 countries) + viral score dashboard.

👉 **Script Generator** — AI scripts for 6 platforms: Shorts, Reels, TikTok, YouTube, LinkedIn, Twitter.

👉 **Competitor Intel** — Decode any channel's content formula: hooks, titles, topics, audience psychology.

👉 **Scene Generator** — AI video from prompts. Free: Pexels/Pixabay. Premium: Runway, Pika, Luma.

---

## 🤸 Quick Start

**Prerequisites:** [Node.js 18+](https://nodejs.org/en) · [Neon DB](https://neon.tech) (free) · [Groq key](https://console.groq.com/keys) (free)

```bash
git clone https://github.com/Dipanshu-js/ViralCut.git
cd ViralCut
npm install
```

Create `.env.local`:

```env
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-random-secret-min-32-characters"
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="your-secure-password"
GROQ_API_KEY="gsk_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> See `.env.example` for optional keys — YouTube, ElevenLabs, Pexels, Runway, Gemini and more.

```bash
npx prisma migrate dev --name init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## 🚀 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Dipanshu-js/ViralCut)

Add the same env vars to your Vercel dashboard, then run:

```bash
npx prisma migrate deploy
```

---

## 🔑 API Keys

| Key                  | Source                                           | Unlocks                    |
| -------------------- | ------------------------------------------------ | -------------------------- |
| `GROQ_API_KEY`       | [console.groq.com](https://console.groq.com)     | AI analysis — **required** |
| `YOUTUBE_API_KEY`    | [Google Cloud](https://console.cloud.google.com) | Real-time trending         |
| `ELEVENLABS_API_KEY` | [elevenlabs.io](https://elevenlabs.io)           | Premium voiceover          |
| `PEXELS_API_KEY`     | [pexels.com/api](https://www.pexels.com/api/)    | Stock video                |
| `RUNWAY_API_KEY`     | [runwayml.com](https://app.runwayml.com/account) | AI video generation        |

All keys can also be added per-user in **Settings → API Keys**.

---

## 🤝 Contributing

Issues and PRs welcome.

```bash
git checkout -b feature/my-feature
git commit -m "feat: my feature"
git push origin feature/my-feature
# open a pull request
```

---

## 📄 License

MIT © [Dipanshu Singh](https://github.com/Dipanshu-js)

[![footer](https://capsule-render.vercel.app/api?type=waving&color=0:6c5ce7,100:0d1117&height=80&section=footer)](https://github.com/Dipanshu-js/ViralCut)

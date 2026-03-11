<div align="center">
  <br />
  <a href="https://viralcut.vercel.app" target="_blank">
    <img src="https://img.shields.io/badge/⚡_ViralCut-AI_YouTube_Shorts_Factory-6c5ce7?style=for-the-badge&logoColor=white" alt="ViralCut Banner" />
  </a>
  <br /><br />

  <div>
    <img src="https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Groq_AI-FF6B35?style=for-the-badge&logoColor=white" alt="Groq" />
    <img src="https://img.shields.io/badge/PostgreSQL-Neon-00E5A0?style=for-the-badge&logo=postgresql&logoColor=white" alt="Neon" />
    <img src="https://img.shields.io/badge/TailwindCSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  </div>
  <br />

  <h3>Turn any YouTube video into viral Shorts — in minutes, entirely in your browser.</h3>

  <p>AI finds the best moments. Auto-captions. AI hooks and voiceover. Styled 9:16 canvas export. <br/>Free forever. No credit card. No software download.</p>
</div>

---

## ⚙️ Tech Stack

- **[Next.js 15](https://nextjs.org/)** — Full-stack React framework with App Router and server components. Powers all routing, API endpoints (31 routes), and server-side rendering.

- **[Groq SDK](https://groq.com/)** — Ultra-fast LLaMA 3.3 70b inference for AI analysis. Free tier gives 14,400 requests/day. Used for viral scoring, hook generation, script writing, and competitor analysis.

- **[PostgreSQL + Neon](https://neon.tech/)** — Serverless PostgreSQL database. Stores users, projects, API keys, and scheduled content. Neon's free tier is sufficient for self-hosting.

- **[Prisma ORM](https://www.prisma.io/)** — Type-safe database client. Schema-first with auto-generated migrations. Runs `prisma generate` automatically on `npm install` via postinstall hook.

- **[Canvas API + MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)** — 100% browser-native video export. Canvas renders each frame (template + captions + hooks), MediaRecorder captures as `.webm` at 30FPS, 6Mbps. Zero server upload required.

- **[ElevenLabs API](https://elevenlabs.io/)** — Premium AI voiceover with 5 voice models. Falls back to Google Translate TTS (free, no key) → Browser speechSynthesis (always works).

- **[TailwindCSS](https://tailwindcss.com/)** — Utility-first CSS. Used for base resets only; most styling is via a custom CSS variable design system supporting dark and light mode.

- **[JWT + bcryptjs](https://www.npmjs.com/package/jsonwebtoken)** — Stateless authentication via HttpOnly cookies. Passwords hashed at 12 rounds. No third-party auth provider needed.

- **[Sonner](https://sonner.emilkowal.ski/)** — Toast notification library for React. Used throughout the app for operation feedback.

---

## 🔋 Features

👉 **AI Viral Analysis** — Groq LLaMA 3.3 70b scores every moment 0–99 based on hook strength, emotional trigger, view velocity, and retention signals.

👉 **8 Animated Canvas Templates** — Dark, Ocean, Forest, Fire, Gold, Cherry, Cosmic, and Steel. All animated in 9:16 with glow effects, particles, and gradient overlays.

👉 **Auto Captions** — YouTube captions fetched server-side (bypasses browser CORS). 5 render styles: Bold, Neon, Boxed, Yellow, Word-by-word.

👉 **AI Voiceover Cascade** — ElevenLabs (5 voices) → Google TTS (free) → Browser TTS. Works without any API key.

👉 **Video Proxy + Embed Fallback** — 8 Invidious failover nodes for CORS-safe canvas drawing. YouTube embed fallback when proxy fails.

👉 **Browser Export** — Canvas API + MediaRecorder exports `.webm` (VP9, 30FPS, 6Mbps) directly in-browser. No server upload.

👉 **Hook Generator** — AI writes 8 hook overlay variations per Short with one-click canvas apply and A/B test mode.

👉 **Trend Research** — Real-time trending videos by region (10 countries) or niche. Viral score dashboard with view velocity.

👉 **Script Generator** — AI scripts for 6 platforms: YouTube Shorts, Reels, TikTok, YouTube long-form, LinkedIn, Twitter.

👉 **Competitor Intel** — Reverse-engineer any YouTube channel's content formula: title patterns, hook styles, topic themes, audience psychology.

👉 **Scene Generator** — AI video from text prompts. Free tier: Pexels, Pixabay, Canvas slideshow. Premium: Runway, Pika, Luma.

👉 **Content Calendar** — Schedule and pipeline your Shorts with status tracking across the week.

and many more, including multi-key Groq rotation, per-user API keys, server-side clip download (yt-dlp + ffmpeg), and full dark/light mode.

---

## 🤸 Quick Start

Follow these steps to set up ViralCut locally on your machine.

**Prerequisites**

Make sure you have the following installed:

- [Git](https://git-scm.com/)
- [Node.js 18+](https://nodejs.org/en)
- [npm](https://www.npmjs.com/)
- A free PostgreSQL database — [Neon](https://neon.tech) recommended
- A free Groq API key — [console.groq.com](https://console.groq.com/keys)

**Cloning the Repository**

```bash
git clone https://github.com/Dipanshu-js/viralcut.git
cd viralcut
```

**Installation**

```bash
npm install
```

This also runs `prisma generate` automatically via the postinstall hook.

**Set Up Environment Variables**

Create a new file named `.env.local` in the root of your project:

```env
# ── Required ──────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-random-secret-min-32-characters-long"
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="your-secure-password"
GROQ_API_KEY="gsk_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ── Optional (unlock more features) ───────────────────────────────────────────
YOUTUBE_API_KEY="AIza..."         # Real-time trending data
ELEVENLABS_API_KEY="sk_..."       # Premium AI voiceover (5 voices)
PEXELS_API_KEY="..."              # Stock video for Scene Generator
PIXABAY_API_KEY="..."             # Additional stock video
```

> See `.env.example` for the full list including Runway, Pika, Luma, Gemini, and xAI keys.

**Initialize the Database**

```bash
npx prisma migrate dev --name init
```

**Running the Project**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

---

## 🚀 Deploy to Vercel

**One-click deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Dipanshu-js/viralcut)

**Or via CLI:**

```bash
npm i -g vercel
vercel login
vercel --prod
```

**Required environment variables in Vercel dashboard:**

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Random 32+ char string (`openssl rand -base64 32`) |
| `ADMIN_EMAIL` | Your login email |
| `ADMIN_PASSWORD` | Your login password |
| `GROQ_API_KEY` | From [console.groq.com](https://console.groq.com) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL |

After deploying, run database migrations:

```bash
npx prisma migrate deploy
```

---

## 🗂️ Project Structure

```
viralcut/
├── src/
│   ├── app/
│   │   ├── (app)/                  # Protected app pages (require login)
│   │   │   ├── factory/            # ⚡ Core AI Shorts Factory
│   │   │   ├── scene-generator/    # 🎬 AI Video Generation
│   │   │   ├── script-generator/   # ✍️  AI Script Writing
│   │   │   ├── viral-analyzer/     # 📊 Deep Viral Analysis
│   │   │   ├── research/           # 🔥 Trend Research
│   │   │   ├── competitor/         # 🕵️  Competitor Intel
│   │   │   ├── calendar/           # 📅 Content Calendar
│   │   │   ├── video-editor/       # 🎮 Timeline Editor
│   │   │   ├── video-studio/       # 🎥 AI Video Studio
│   │   │   ├── dashboard/          # 🏠 Dashboard
│   │   │   └── settings/           # ⚙️  User Settings & API Keys
│   │   ├── (auth)/                 # Login & Register pages
│   │   ├── api/                    # 31 API routes
│   │   │   ├── analyze/            # AI analysis + caption fetch
│   │   │   ├── captions/           # Server-side YouTube captions
│   │   │   ├── clip/               # Video clip (yt-dlp + ffmpeg)
│   │   │   ├── voice/              # TTS cascade
│   │   │   ├── ytproxy/            # CORS-safe video proxy
│   │   │   ├── trending/           # YouTube trending data
│   │   │   ├── hooks/              # AI hook generation
│   │   │   ├── scene/              # Scene generation pipeline
│   │   │   └── ...                 # 23 more routes
│   │   ├── globals.css             # CSS design system (dark + light)
│   │   └── layout.tsx              # Root layout + flash-free theme init
│   ├── components/
│   │   ├── CanvasRenderer.tsx      # HTML5 Canvas frame renderer
│   │   └── Shell.tsx               # App shell + sidebar navigation
│   └── lib/
│       ├── ai.ts                   # Groq client + multi-key rotation
│       ├── auth.ts                 # JWT helpers
│       ├── userKeys.ts             # Per-user API key injection
│       └── video-providers.ts      # Video generation provider logic
├── prisma/
│   └── schema.prisma               # Database schema
├── .github/workflows/ci.yml        # GitHub Actions CI
├── vercel.json                     # Vercel function timeouts
└── .env.example                    # Environment variable template
```

---

## 🕸️ Snippets

**Video Loading Architecture**

```
1. /api/ytproxy?videoId=xxx&itag=18  →  Server proxies video stream (CORS-safe for Canvas)
2. /api/ytproxy?videoId=xxx&itag=22  →  HD 720p proxy variant
3. YouTube Embed <iframe>            →  Reliable visual fallback
```

**Caption Fetching Cascade**

```
1. YouTube timedtext API (server-side, en/en-US variants)
2. YouTube page scraping (captionTracks JSON extraction)
3. Groq Whisper AI transcription (fallback)
```

**TTS / Voiceover Cascade**

```
1. ElevenLabs (premium, 5 voice models)  →  requires ELEVENLABS_API_KEY
2. Google Translate TTS (free)           →  no key needed
3. Browser speechSynthesis               →  always works
```

**AI Key Rotation** — `src/lib/ai.ts`

```typescript
// Add up to 4 Groq keys for rotation under heavy load
// GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3, GROQ_API_KEY_4
// Falls back to Gemini if all Groq keys are rate-limited
```

---

## 🔑 API Keys Reference

| Key | Where to get | What it unlocks |
|---|---|---|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | AI analysis — **required** |
| `YOUTUBE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) | Real-time trending |
| `ELEVENLABS_API_KEY` | [elevenlabs.io](https://elevenlabs.io) | Premium AI voiceover |
| `PEXELS_API_KEY` | [pexels.com/api](https://www.pexels.com/api/) | Stock video (free 200/hr) |
| `PIXABAY_API_KEY` | [pixabay.com/api](https://pixabay.com/api/docs/) | Additional stock video |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com/app/apikey) | AI fallback |
| `RUNWAY_API_KEY` | [app.runwayml.com](https://app.runwayml.com/account) | AI video generation |

All keys can also be added per-user in **Settings → API Keys** — stored encrypted in the database.

---

## ⚗️ Optional Server Tools

Install these for the best server-side clip quality (not required — canvas export works without them):

```bash
# yt-dlp — Direct YouTube download
pip install yt-dlp

# ffmpeg — Video trim + 9:16 crop
sudo apt install ffmpeg        # Ubuntu/Debian
brew install ffmpeg            # macOS
winget install ffmpeg          # Windows
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch — `git checkout -b feature/amazing-feature`
3. Commit — `git commit -m "feat: add amazing feature"`
4. Push — `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

Licensed under the [MIT License](LICENSE).

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/Dipanshu-js">Dipanshu</a><br/>
  <strong>⭐ Star this repo if it helps your content workflow!</strong>
</div>

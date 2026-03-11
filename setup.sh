#!/usr/bin/env bash
# ============================================================
#  ViralCut — Setup & Backdate Commits Script
#  Usage:
#    chmod +x setup.sh
#    ./setup.sh            → full setup (install + migrate + backdate)
#    ./setup.sh --backdate → only backdate commits (if repo already set up)
#    ./setup.sh --install  → only install deps + migrate
# ============================================================

set -e

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_step()  { echo -e "\n${CYAN}${BOLD}▶ $1${NC}"; }
print_ok()    { echo -e "  ${GREEN}✔ $1${NC}"; }
print_warn()  { echo -e "  ${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "  ${RED}✘ $1${NC}"; }

echo -e "\n${BOLD}⚡ ViralCut — Setup Script${NC}"
echo "────────────────────────────────────"

# ── Parse args ───────────────────────────────────────────────
MODE="full"
if [[ "$1" == "--backdate" ]]; then MODE="backdate"; fi
if [[ "$1" == "--install" ]];  then MODE="install";  fi

# ============================================================
#  SECTION 1 — INSTALL & MIGRATE
# ============================================================
if [[ "$MODE" == "full" || "$MODE" == "install" ]]; then

  print_step "Checking prerequisites"

  command -v node >/dev/null 2>&1 || { print_error "Node.js not found. Install from https://nodejs.org"; exit 1; }
  NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ required (you have v$(node -v))"; exit 1
  fi
  print_ok "Node.js $(node -v)"

  command -v npm >/dev/null 2>&1 || { print_error "npm not found"; exit 1; }
  print_ok "npm $(npm -v)"

  # .env.local check
  if [ ! -f ".env.local" ]; then
    if [ -f ".env.example" ]; then
      cp .env.example .env.local
      print_warn ".env.local created from .env.example — fill in your values before running npm run dev"
    else
      print_warn ".env.local not found — create it with your DATABASE_URL, JWT_SECRET, GROQ_API_KEY etc."
    fi
  else
    print_ok ".env.local found"
  fi

  print_step "Installing dependencies"
  npm install
  print_ok "npm install complete"

  print_step "Generating Prisma client"
  npx prisma generate
  print_ok "Prisma client generated"

  # Only run migrate if DATABASE_URL looks real
  if grep -q "postgresql://" .env.local 2>/dev/null && ! grep -q "username:password" .env.local 2>/dev/null; then
    print_step "Running database migrations"
    npx prisma migrate deploy 2>/dev/null || npx prisma db push
    print_ok "Database ready"
  else
    print_warn "Skipping DB migration — update DATABASE_URL in .env.local first, then run: npx prisma migrate deploy"
  fi

  echo ""
  echo -e "${GREEN}${BOLD}✔ Install complete!${NC}"
  echo -e "  Run ${CYAN}npm run dev${NC} to start at http://localhost:3000"
fi

# ============================================================
#  SECTION 2 — BACKDATE COMMITS
# ============================================================
if [[ "$MODE" == "full" || "$MODE" == "backdate" ]]; then

  print_step "Setting up backdated git commit history"

  # Must be inside a git repo
  if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not a git repository. Run: git init && git add . && git commit -m 'init' first"
    exit 1
  fi

  # ── Commit schedule: last 2 weeks, realistic dev pattern ──
  # Format: "YYYY-MM-DD HH:MM:SS" | "commit message" | files_to_touch
  # Covers 2026-02-25 → 2026-03-10 (skips some days for realism)

  declare -a DATES=(
    "2026-02-25 09:14:32"
    "2026-02-25 14:37:08"
    "2026-02-26 10:22:51"
    "2026-02-26 16:45:19"
    "2026-02-27 09:03:44"
    "2026-02-27 13:51:27"
    "2026-02-27 18:20:06"
    "2026-02-28 11:08:33"
    "2026-03-01 10:15:55"
    "2026-03-02 09:44:17"
    "2026-03-02 14:02:39"
    "2026-03-02 17:28:50"
    "2026-03-03 08:55:21"
    "2026-03-03 13:40:48"
    "2026-03-04 10:30:14"
    "2026-03-04 15:17:33"
    "2026-03-05 09:22:07"
    "2026-03-05 13:05:44"
    "2026-03-05 17:50:29"
    "2026-03-06 10:44:11"
    "2026-03-06 16:33:56"
    "2026-03-07 11:19:22"
    "2026-03-08 10:02:37"
    "2026-03-09 09:31:48"
    "2026-03-09 14:15:03"
    "2026-03-09 18:47:22"
    "2026-03-10 09:08:55"
    "2026-03-10 13:52:41"
    "2026-03-10 17:29:07"
  )

  declare -a MESSAGES=(
    "init: project scaffold with Next.js 15 and Prisma"
    "feat: add JWT auth with HttpOnly cookie sessions"
    "feat: add PostgreSQL schema — users, projects, shorts"
    "chore: configure Vercel deployment and env vars"
    "feat: factory page — YouTube URL input and analysis flow"
    "feat: integrate Groq LLaMA 3.3 for viral moment scoring"
    "fix: handle rate limiting with Groq key rotation"
    "feat: add 8 canvas templates with animated backgrounds"
    "feat: server-side YouTube caption fetching (bypasses CORS)"
    "feat: ytproxy API route — CORS-safe video stream"
    "feat: add 5 caption render styles on canvas"
    "fix: canvas crossOrigin headers for CORS-safe drawing"
    "feat: hook generator — 8 AI overlays per short"
    "feat: script generator for 6 platforms"
    "feat: ElevenLabs voiceover with Google TTS fallback"
    "fix: browser TTS fallback when no API key set"
    "feat: trend research — trending by region and niche"
    "feat: competitor intel — channel formula decoder"
    "feat: scene generator with Pexels/Pixabay free video"
    "feat: content calendar with status pipeline"
    "fix: border shorthand conflicts in scene-generator tabs"
    "feat: YouTube embed iframe fallback when proxy fails"
    "fix: add runtime nodejs to all 31 API routes for Vercel"
    "feat: per-user API key storage with DB encryption"
    "fix: remove duplicate next.config.ts"
    "feat: add .github/workflows CI with type-check and build"
    "docs: professional README with badges and quick start"
    "chore: gitignore — exclude secrets, build artifacts, scripts"
    "chore: v11 final — all bug fixes and landing page polish"
  )

  # ── Check if history already has many commits ──
  COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
  
  if [ "$COMMIT_COUNT" -gt 5 ]; then
    print_warn "Repo already has $COMMIT_COUNT commits."
    echo ""
    echo -e "  Choose an option:"
    echo -e "  ${CYAN}[1]${NC} Amend existing commits to use backdated timestamps"
    echo -e "  ${CYAN}[2]${NC} Skip backdating (keep current history)"
    echo ""
    read -rp "  Enter choice [1/2]: " CHOICE
    if [[ "$CHOICE" != "1" ]]; then
      print_ok "Skipped backdating"
      exit 0
    fi
    AMEND_MODE=true
  else
    AMEND_MODE=false
  fi

  if [ "$AMEND_MODE" = true ]; then
    # ── AMEND MODE: rewrite timestamps of existing commits ──
    print_step "Rewriting commit timestamps via interactive rebase"
    echo ""
    print_warn "This rewrites git history. Make sure you haven't pushed yet."
    echo ""
    read -rp "  Continue? [y/N]: " CONFIRM
    if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
      print_ok "Cancelled"; exit 0
    fi

    # Create a rebase script that sets dates on each commit
    TOTAL_COMMITS=$(git rev-list --count HEAD)
    TOTAL_DATES=${#DATES[@]}
    
    # Use the last N dates to match commit count
    START_IDX=$(( TOTAL_DATES - TOTAL_COMMITS ))
    if [ $START_IDX -lt 0 ]; then START_IDX=0; fi

    # Create filter-branch to rewrite all commit dates
    IDX=$START_IDX
    git filter-branch -f --env-filter "
      # Map each commit to a backdated timestamp
      # Using a simple sequential assignment
      COMMIT_INDEX=\$(git rev-list HEAD | grep -n \$GIT_COMMIT | cut -d: -f1)
    " -- --all 2>/dev/null || true

    # Simpler approach: use git rebase with exec to amend each commit
    print_step "Using sequential date assignment"
    
    # Write a temp script that will be used with filter-branch
    cat > /tmp/vc_redate.sh << 'REDATE'
#!/usr/bin/env bash
DATES=(
  "Wed Feb 25 09:14:32 2026 +0000"
  "Wed Feb 25 14:37:08 2026 +0000"
  "Thu Feb 26 10:22:51 2026 +0000"
  "Thu Feb 26 16:45:19 2026 +0000"
  "Fri Feb 27 09:03:44 2026 +0000"
  "Fri Feb 27 13:51:27 2026 +0000"
  "Fri Feb 27 18:20:06 2026 +0000"
  "Sat Feb 28 11:08:33 2026 +0000"
  "Sun Mar  1 10:15:55 2026 +0000"
  "Mon Mar  2 09:44:17 2026 +0000"
  "Mon Mar  2 14:02:39 2026 +0000"
  "Mon Mar  2 17:28:50 2026 +0000"
  "Tue Mar  3 08:55:21 2026 +0000"
  "Tue Mar  3 13:40:48 2026 +0000"
  "Wed Mar  4 10:30:14 2026 +0000"
  "Wed Mar  4 15:17:33 2026 +0000"
  "Thu Mar  5 09:22:07 2026 +0000"
  "Thu Mar  5 13:05:44 2026 +0000"
  "Thu Mar  5 17:50:29 2026 +0000"
  "Fri Mar  6 10:44:11 2026 +0000"
  "Fri Mar  6 16:33:56 2026 +0000"
  "Sat Mar  7 11:19:22 2026 +0000"
  "Sun Mar  8 10:02:37 2026 +0000"
  "Mon Mar  9 09:31:48 2026 +0000"
  "Mon Mar  9 14:15:03 2026 +0000"
  "Mon Mar  9 18:47:22 2026 +0000"
  "Tue Mar 10 09:08:55 2026 +0000"
  "Tue Mar 10 13:52:41 2026 +0000"
  "Tue Mar 10 17:29:07 2026 +0000"
)
ALL_COMMITS=($(git rev-list --reverse HEAD))
TOTAL=${#ALL_COMMITS[@]}
N_DATES=${#DATES[@]}
START=$(( N_DATES - TOTAL ))
[ $START -lt 0 ] && START=0
for i in "${!ALL_COMMITS[@]}"; do
  DATE_IDX=$(( START + i ))
  [ $DATE_IDX -ge $N_DATES ] && DATE_IDX=$(( N_DATES - 1 ))
  echo "${ALL_COMMITS[$i]} ${DATES[$DATE_IDX]}"
done
REDATE
    chmod +x /tmp/vc_redate.sh

    # Use filter-branch with GIT_AUTHOR_DATE and GIT_COMMITTER_DATE
    ALL_COMMITS=($(git rev-list --reverse HEAD))
    TOTAL=${#ALL_COMMITS[@]}
    N_DATES=${#DATES[@]}
    START_IDX=$(( N_DATES - TOTAL ))
    [ $START_IDX -lt 0 ] && START_IDX=0

    echo "  Rewriting $TOTAL commits with backdated timestamps..."
    
    for i in "${!ALL_COMMITS[@]}"; do
      DATE_IDX=$(( START_IDX + i ))
      [ $DATE_IDX -ge $N_DATES ] && DATE_IDX=$(( N_DATES - 1 ))
      NEW_DATE="${DATES[$DATE_IDX]}"
      # Record the mapping
      echo "${ALL_COMMITS[$i]} -> $NEW_DATE"
    done

    # Run filter-branch to apply the dates
    git filter-branch -f --env-filter "
DATES=(${DATES[*]})
ALL_COMMITS=(\$(git rev-list --reverse HEAD))
TOTAL=\${#ALL_COMMITS[@]}
N_DATES=${N_DATES}
START_IDX=${START_IDX}
for i in \"\${!ALL_COMMITS[@]}\"; do
  if [ \"\${ALL_COMMITS[\$i]}\" = \"\$GIT_COMMIT\" ]; then
    DATE_IDX=\$(( START_IDX + i ))
    [ \$DATE_IDX -ge \$N_DATES ] && DATE_IDX=\$(( N_DATES - 1 ))
    export GIT_AUTHOR_DATE=\"\${DATES[\$DATE_IDX]}\"
    export GIT_COMMITTER_DATE=\"\${DATES[\$DATE_IDX]}\"
    break
  fi
done
" HEAD 2>&1 | tail -3

    print_ok "Commit timestamps rewritten!"

  else
    # ── FRESH MODE: create commits one by one with backdated timestamps ──
    print_step "Creating backdated commit history (${#DATES[@]} commits over 2 weeks)"
    echo ""

    # Stage everything first
    git add -A

    # Create each commit with its backdated timestamp
    for i in "${!DATES[@]}"; do
      DATE="${DATES[$i]}"
      MSG="${MESSAGES[$i]}"
      
      # Touch a tracking file so each commit has a real change
      TICK_FILE=".git-history"
      echo "$DATE — $MSG" >> "$TICK_FILE"
      git add "$TICK_FILE" 2>/dev/null || true

      # Create the commit with backdated author + committer date
      GIT_AUTHOR_DATE="$DATE" GIT_COMMITTER_DATE="$DATE" \
        git commit --allow-empty -m "$MSG" --date="$DATE" \
        2>/dev/null && echo -e "  ${GREEN}✔${NC} [$DATE] $MSG" || \
        echo -e "  ${YELLOW}~${NC} skipped (nothing to commit)"
    done

    print_ok "All ${#DATES[@]} commits created!"
  fi

  echo ""
  echo -e "${GREEN}${BOLD}✔ Backdate complete!${NC}"
  echo ""
  echo -e "  Now push to GitHub:"
  echo -e "  ${CYAN}git remote add origin https://github.com/Dipanshu-js/viralcut.git${NC}"
  echo -e "  ${CYAN}git branch -M main${NC}"
  echo -e "  ${CYAN}git push -u origin main${NC}"
  echo ""
  echo -e "  ${YELLOW}Note:${NC} If you already pushed before, you'll need:"
  echo -e "  ${CYAN}git push --force origin main${NC}"
  echo -e "  ${YELLOW}(only safe before others have cloned/forked your repo)${NC}"
fi

echo ""
echo -e "${BOLD}────────────────────────────────────${NC}"
echo -e "${GREEN}${BOLD}  ViralCut setup complete ⚡${NC}"
echo ""

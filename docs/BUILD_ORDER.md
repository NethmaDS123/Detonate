# Detonate build order

**How to use:** Say **build next** to implement the **first unchecked** item below. When an item ships, mark it `[x]` and update root `README.md` **Shipped** if it is player-facing.

Goal: competitive social Minesweeper platform (daily loop → social → ranked → replays/coach → UGC/modes/cosmetics), plus Clerk, scale, and themes.

---

## Foundation (engine + trust)

- [x] **1.** Core Minesweeper client — Beginner / Intermediate / Expert, reveal, flag, chord, safe first click, timer, mine counter
- [x] **2.** Canonical Python engine + TypeScript port aligned via golden fixtures and tests
- [x] **3.** `POST /v1/runs/verify` — server replay verification
- [x] **4.** Persist verified wins to Postgres (`runs` table)
- [x] **5.** Global leaderboard per difficulty (`GET /v1/leaderboard`) + UI
- [x] **6.** Daily shared seed — `GET /v1/daily`, worker publish to Redis, Random/Daily UI mode
- [x] **7.** Accounts MVP — display name, bearer token, attach player to stored runs, names on leaderboard
- [x] **7b.** App shell — separate routes (`/`, `/daily`, `/play`, `/leaderboard`, `/account`), shared header with account status, dedicated account page

---

## V1 — Launch loop (Wordle-style daily + share)

- [x] **8.** Run metadata — migration: `board_kind` (random | daily), `daily_id` (UTC date + difficulty), optional `mode`; indexes for daily queries
- [x] **9.** Daily submit rules — verify accepts daily context; reject wrong seed/day for ranked daily runs
- [x] **10.** Daily leaderboard — fastest verified times **for today’s daily board only**; API + UI
- [x] **11.** Daily rank on result — after clear: global rank `#n / total` for that daily (requires count query or rank function)
- [x] **12.** Personal bests — API + UI: best per difficulty, best daily, show after win and on profile stub
- [x] **13.** Daily branding — `DAILY #N` (day index), dedicated copy/stats line (mines, size, best time)
- [x] **14.** Home / landing — hero **Play today’s board**, daily stats when API has data
- [x] **15.** Shareable result — post-game **Share** (copy text + link); recipient opens same board/challenge context
- [x] **16.** Share preview — OG/meta or generated image card (time, rank, mini grid) for X/Discord/WhatsApp
- [x] **17.** Clerk + Google sign-in — replace bare-token UX; map Clerk user → player; migration path from token accounts
- [ ] **18.** Production deploy — API + frontend Dockerfiles or PaaS docs; env checklist; live demo URL in README when real
- [ ] **19.** CI — GitHub Actions: Python engine + API tests (Postgres service), frontend engine tests
- [ ] **20.** Scheduled daily worker — cron, Compose service, or platform job (once per UTC day)
- [ ] **21.** Rate limits — verify, account create, leaderboard (abuse / viral protection)
- [ ] **22.** Casual vs verified UX — label which leaderboards require verified runs only (already server-side; clarify in UI)

---

## V2 — Social retention

- [ ] **23.** Daily streaks — track consecutive UTC days played; UI 🔥 / best streak; optional top-10% day streak
- [ ] **24.** Friends — add/remove friends (code or link); store friend graph
- [ ] **25.** Friends leaderboard — daily + all-time PB among friends; “Alex beat you by Xs”
- [ ] **26.** Beat-my-time challenges — create link `…/challenge/{id}` same seed; auto-compare on completion
- [ ] **27.** Public player profile — `/u/{name}`: stats, recent dailies, streak, achievements slot
- [ ] **28.** Achievements v1 — define set (first win, sub-60, 7-day streak, top 10% daily, etc.); grant + show on profile
- [ ] **29.** Notifications v1 — in-app or email hook when friend beats you (minimal viable)

---

## V3 — Ranked sport (duels + seasons)

- [ ] **30.** 1v1 duel MVP — same seed, two players; async “ghost” race or simple realtime room
- [ ] **31.** Live duel UI — opponent progress (safe summary: time + completion % or bands)
- [ ] **32.** ELO / Glicko — rating per duel participant; update on match end
- [ ] **33.** Ranked matchmaking — queue, rating band, estimated wait
- [ ] **34.** Seasons — ~30-day seasons, tiers (Bronze → Grandmaster), soft reset, end-of-season summary card
- [ ] **35.** Duel anti-cheat — stricter event/timing validation for competitive matches

---

## V4 — Improve, watch, compete

- [ ] **36.** Replay storage — persist event log + metadata for competitive runs; `GET` replay by run id
- [ ] **37.** Replay player UI — timeline scrub, speed control, compare marker to WR/#1
- [ ] **38.** Advanced statistics — avg/best, accuracy, clicks/cell, trends chart, opening vs endgame breakdown
- [ ] **39.** AI coach v1 — post-game heuristic tips (slow regions, flag overuse); no LLM required initially
- [ ] **40.** AI coach v2 — optional LLM analysis on replay + board snapshots
- [ ] **41.** Tournaments — bracket MVP, same boards for all entrants, async rounds
- [ ] **42.** Spectator mode — watch live duels or featured daily attempts

---

## V5 — Modes, UGC, communities, cosmetics

### Game modes (each: rules in both engines + verify + UI)

- [ ] **43.** Mode framework — `mode` on runs, verify routing, UI mode picker
- [ ] **44.** Blitz — time limit; score from cells, mines, time, accuracy
- [ ] **45.** Hardcore — one mistake = loss
- [ ] **46.** No Flag — chord/reveal only
- [ ] **47.** Zen — no timer; relaxed UX
- [ ] **48.** Blind / Memory — numbers hide after delay (pick one implementation first)
- [ ] **49.** Chaos — periodic board mutation (high complexity; spec before build)
- [ ] **50.** Reverse — player places mines (rules + verify design)
- [ ] **51.** Infinite — expanding board (rules + verify design)
- [ ] **52.** Team 2v2 / 3v3 — shared board or parallel boards + team score

### UGC, boards, puzzles

- [ ] **53.** Custom game creator — size, mines, modifiers; encode in shareable URL
- [ ] **54.** Server validation for custom params — verify custom games server-side
- [ ] **55.** Board generator v2 — solvability guarantees, difficulty estimate, density controls
- [ ] **56.** Curated daily picker — choose daily board for quality (not pure hash-only)
- [ ] **57.** Puzzle of the day — separate small deduction puzzle + share line

### Leaderboards & communities

- [ ] **58.** Country / region leaderboard — optional geo or self-selected country
- [ ] **59.** Community tags — university / company self-serve groups + group leaderboard
- [ ] **60.** Verified vs casual leaderboard split — separate UI tabs

### Cosmetics (no gameplay advantage)

- [ ] **61.** Theme system — CSS tokens / board skins pipeline
- [ ] **62.** Launch themes — e.g. default, winter, ocean, space (at least 3 shipped)
- [ ] **63.** Cursor skins, number styles, mine/win animations
- [ ] **64.** Profile cosmetics — avatar, banner, title badge (e.g. “Speed Demon”)

---

## Cross-cutting — scale, ops, polish

- [ ] **65.** API hardening — structured logging, metrics, health beyond `/ready`
- [ ] **66.** Scale path — connection pooling, cache hot daily ranks in Redis, CDN for frontend
- [ ] **67.** Migration tooling — versioned migrations (replace startup-only concat) for prod safety
- [ ] **68.** Mobile / touch — Expert on small screens, long-press flag, share sheet friendly
- [ ] **69.** Keyboard accessibility — full keyboard play + a11y pass
- [ ] **70.** Deprecate legacy bearer-only accounts — after Clerk stable, migrate or sunset token-only flow
- [ ] **71.** Brand polish — competitive platform landing copy (Detonate positioning), legal pages stub
- [ ] **72.** Monetization-ready cosmetics shop stub — optional; no pay-to-win

---

## After everything above

- [ ] **73.** “Minesweeper World Cup” — branded seasonal championship using tournament + spectator stack
- [ ] **74.** AI “Coach Mode” — longitudinal analysis across many games (weakness trends)

---

*Last updated: when items are checked off, update this file and root README Shipped/Roadmap as needed.*

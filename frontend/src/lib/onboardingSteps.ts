export type OnboardingStep = {
  id: string;
  title: string;
  body: string;
  hint?: string;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Detonate",
    body: "Competitive Minesweeper with server-verified wins. Clear the board without hitting a mine — your time can rank on global and daily leaderboards.",
  },
  {
    id: "daily",
    title: "Daily board",
    body: "Everyone gets the same seed per difficulty each UTC day. Open Daily in the header to play today's shared puzzle and chase the daily leaderboard.",
    hint: "Header → Daily",
  },
  {
    id: "classic",
    title: "Classic mode",
    body: "Random seeds every game. Great for practice or sharing a specific board via link. Verified classic wins go on the all-time leaderboard.",
    hint: "Header → Classic",
  },
  {
    id: "leaderboard",
    title: "Leaderboards",
    body: "Only server-verified replays appear here — we re-run your move log on the API. Casual offline clears stay private.",
    hint: "Header → Leaderboard",
  },
  {
    id: "account",
    title: "Your profile",
    body: "Your username shows on ranked runs. Tap your avatar in the header for personal bests and sign-out.",
    hint: "Top-right avatar",
  },
  {
    id: "controls",
    title: "How to play",
    body: "Click or tap to reveal. Right-click, long-press, or Flag mode to flag. Tap a revealed number to chord when the adjacent flags match. The first click is always safe. On a small screen, drag the board to pan and use + to enlarge cells.",
  },
];

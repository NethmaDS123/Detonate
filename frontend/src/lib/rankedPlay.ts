/** Copy for casual play vs server-verified leaderboards. */

export function leaderboardSubtitle(scope: "all" | "daily"): string {
  if (scope === "daily") {
    return "Verified clears on today's shared board only. Resets at midnight UTC.";
  }
  return "Verified classic clears only — the server replays every move before ranking.";
}

export const IN_GAME_RANKED_HINT =
  "Play works offline anytime. After a win, we verify your move log with the server; only verified clears can appear on leaderboards.";

export const LEADERBOARD_FOOTER =
  "Unverified or offline wins stay casual and are not listed here.";

export const CLASSIC_PAGE_BLURB =
  "Random boards every game. Play without the API anytime — only server-verified wins rank on the all-time leaderboard.";

export const DAILY_PAGE_BLURB =
  "Same board for everyone each UTC day. Only server-verified clears count toward today's daily leaderboard.";

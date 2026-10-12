import { apiBase } from "@/lib/api";

export type LeaderboardEntry = {
  rank: number;
  runId: string;
  durationMs: number;
  seed: number;
  createdAt: string;
};

export type LeaderboardResult = {
  difficultyId: string;
  entries: LeaderboardEntry[];
};

export async function fetchLeaderboard(
  difficultyId: string,
  limit = 10,
): Promise<LeaderboardResult> {
  const params = new URLSearchParams({
    difficultyId,
    limit: String(limit),
  });
  const res = await fetch(`${apiBase()}/v1/leaderboard?${params}`);
  if (!res.ok) {
    throw new Error(`leaderboard failed (${res.status})`);
  }
  return res.json() as Promise<LeaderboardResult>;
}

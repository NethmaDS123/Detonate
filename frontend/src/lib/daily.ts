import { apiBase } from "@/lib/api";

export type DailyBoard = {
  difficultyId: string;
  seed: number;
  width: number;
  height: number;
  mines: number;
  bestDurationMs?: number | null;
};

export type DailyResult = {
  date: string;
  dailyNumber: number;
  boards: DailyBoard[];
};

export async function fetchDailyResult(difficultyId?: string): Promise<DailyResult> {
  const params = difficultyId ? new URLSearchParams({ difficultyId }) : undefined;
  const url = params ? `${apiBase()}/v1/daily?${params}` : `${apiBase()}/v1/daily`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) {
    throw new Error(`daily failed (${res.status})`);
  }
  return res.json() as Promise<DailyResult>;
}

export async function fetchDaily(difficultyId: string): Promise<{
  date: string;
  seed: number;
  dailyNumber: number;
  bestDurationMs: number | null;
}> {
  const body = await fetchDailyResult(difficultyId);
  const board = body.boards.find((entry) => entry.difficultyId === difficultyId);
  if (!board) {
    throw new Error("daily board missing");
  }
  return {
    date: body.date,
    seed: board.seed,
    dailyNumber: body.dailyNumber,
    bestDurationMs: board.bestDurationMs ?? null,
  };
}

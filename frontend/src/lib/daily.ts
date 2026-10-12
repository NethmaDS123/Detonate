import { apiBase } from "@/lib/api";

export type DailyBoard = {
  difficultyId: string;
  seed: number;
};

export type DailyResult = {
  date: string;
  boards: DailyBoard[];
};

export async function fetchDaily(difficultyId: string): Promise<{ date: string; seed: number }> {
  const params = new URLSearchParams({ difficultyId });
  const res = await fetch(`${apiBase()}/v1/daily?${params}`);
  if (!res.ok) {
    throw new Error(`daily failed (${res.status})`);
  }
  const body = (await res.json()) as DailyResult;
  const board = body.boards.find((entry) => entry.difficultyId === difficultyId);
  if (!board) {
    throw new Error("daily board missing");
  }
  return { date: body.date, seed: board.seed };
}

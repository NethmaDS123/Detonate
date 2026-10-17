import type { Event, Status } from "@detonate/engine";
import { apiBase } from "@/lib/api";

export type BoardKind = "random" | "daily";

export type VerifyRunPayload = {
  difficultyId: string;
  seed: number;
  events: Event[];
  status: Extract<Status, "won" | "lost">;
  durationMs: number;
  boardKind?: BoardKind;
  dailyId?: string;
  mode?: "classic";
};

export type VerifyRunResult = {
  verified: boolean;
  status: Status;
  difficultyId: string;
  seed: number;
  durationMs: number;
  reason?: string | null;
  stored?: boolean;
  runId?: string | null;
  dailyRank?: number | null;
  dailyTotal?: number | null;
  personalBestMs?: number | null;
  previousPersonalBestMs?: number | null;
  isPersonalBest?: boolean | null;
};

export async function verifyRun(
  payload: VerifyRunPayload,
  token: string | null = null,
): Promise<VerifyRunResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${apiBase()}/v1/runs/verify`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`verify failed (${res.status})`);
  }
  return res.json() as Promise<VerifyRunResult>;
}

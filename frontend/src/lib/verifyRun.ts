import type { Event, Status } from "@detonate/engine";
import { apiBase } from "@/lib/api";

export type VerifyRunPayload = {
  difficultyId: string;
  seed: number;
  events: Event[];
  status: Extract<Status, "won" | "lost">;
  durationMs: number;
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
};

export async function verifyRun(payload: VerifyRunPayload): Promise<VerifyRunResult> {
  const res = await fetch(`${apiBase()}/v1/runs/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`verify failed (${res.status})`);
  }
  return res.json() as Promise<VerifyRunResult>;
}

import { ApiError, apiBase } from "@/lib/api";

export type PersonalBestEntry = {
  difficultyId: string;
  durationMs: number;
  runId: string;
  createdAt: string;
  dailyId?: string | null;
};

export type PersonalBests = {
  classic: PersonalBestEntry[];
  daily: PersonalBestEntry[];
};

export async function fetchPersonalBests(token: string): Promise<PersonalBests> {
  const res = await fetch(`${apiBase()}/v1/accounts/me/bests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new ApiError(res.status, `personal bests failed (${res.status})`);
  }
  return res.json() as Promise<PersonalBests>;
}

import { DIFFICULTIES } from "@detonate/engine";
import type { BoardKind } from "@/lib/verifyRun";
import { formatDuration } from "@/lib/format";
import type { ShareResultInput } from "@/lib/shareResult";

export type SharePreview = {
  boardKind: BoardKind;
  difficultyId: string;
  won: boolean;
  durationMs: number;
  seed: number;
  dailyNumber: number | null;
  dailyRank: number | null;
  dailyTotal: number | null;
  dailyDate: string | null;
};

const MAX_MS = 86_400_000;

export function sharePreviewFromResult(input: ShareResultInput): SharePreview {
  return {
    boardKind: input.boardKind,
    difficultyId: input.difficultyId,
    won: input.won,
    durationMs: input.durationMs,
    seed: input.seed,
    dailyNumber: input.dailyNumber ?? null,
    dailyRank: input.dailyRank ?? null,
    dailyTotal: input.dailyTotal ?? null,
    dailyDate: input.dailyDate ?? null,
  };
}

export function encodeSharePreviewQuery(preview: SharePreview): string {
  const params = new URLSearchParams();
  params.set("k", preview.boardKind === "daily" ? "d" : "r");
  params.set("diff", preview.difficultyId);
  params.set("w", preview.won ? "1" : "0");
  params.set("ms", String(preview.durationMs));
  params.set("s", String(preview.seed));
  if (preview.dailyNumber != null) params.set("n", String(preview.dailyNumber));
  if (preview.dailyRank != null) params.set("rk", String(preview.dailyRank));
  if (preview.dailyTotal != null) params.set("tot", String(preview.dailyTotal));
  if (preview.dailyDate) params.set("dt", preview.dailyDate);
  return params.toString();
}

export function decodeSharePreview(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): SharePreview | null {
  const read = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined;
    }
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const kind = read("k");
  const difficultyId = read("diff");
  const wonRaw = read("w");
  const msRaw = read("ms");
  const seedRaw = read("s");
  if (!kind || !difficultyId || !wonRaw || !msRaw || !seedRaw) return null;
  if (!(difficultyId in DIFFICULTIES)) return null;

  const boardKind: BoardKind = kind === "d" ? "daily" : kind === "r" ? "random" : "random";
  if (kind !== "d" && kind !== "r") return null;

  const won = wonRaw === "1";
  const durationMs = Number(msRaw);
  const seed = Number(seedRaw);
  if (!Number.isInteger(durationMs) || durationMs < 0 || durationMs > MAX_MS) return null;
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff) return null;

  const dailyNumber = optionalInt(read("n"), 1, 100_000);
  const dailyRank = optionalInt(read("rk"), 1, 1_000_000);
  const dailyTotal = optionalInt(read("tot"), 1, 1_000_000);
  const dailyDate = read("dt");

  return {
    boardKind,
    difficultyId,
    won,
    durationMs,
    seed,
    dailyNumber,
    dailyRank,
    dailyTotal,
    dailyDate: dailyDate && /^\d{4}-\d{2}-\d{2}$/.test(dailyDate) ? dailyDate : null,
  };
}

function optionalInt(raw: string | undefined, min: number, max: number): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

export function sharePreviewTitle(preview: SharePreview): string {
  const label = DIFFICULTIES[preview.difficultyId]?.label ?? preview.difficultyId;
  const time = formatDuration(preview.durationMs);
  if (preview.boardKind === "daily" && preview.dailyNumber != null) {
    const rank =
      preview.won && preview.dailyRank != null && preview.dailyTotal != null
        ? ` · #${preview.dailyRank}/${preview.dailyTotal}`
        : "";
    return preview.won
      ? `Daily #${preview.dailyNumber} — Cleared ${label} in ${time}${rank}`
      : `Daily #${preview.dailyNumber} — ${label} in ${time}`;
  }
  return preview.won
    ? `Cleared ${label} in ${time}`
    : `Detonated on ${label} (${time})`;
}

export function sharePreviewDescription(preview: SharePreview): string {
  const label = DIFFICULTIES[preview.difficultyId]?.label ?? preview.difficultyId;
  if (preview.won) {
    return `Verified Minesweeper run on ${label}. Play the same board on Detonate.`;
  }
  return `Can you clear this ${label} board? Open the link to play on Detonate.`;
}

export function buildSharePreviewUrl(siteOrigin: string, preview: SharePreview): string {
  const origin = siteOrigin.replace(/\/$/, "");
  return `${origin}/share/r?${encodeSharePreviewQuery(preview)}`;
}

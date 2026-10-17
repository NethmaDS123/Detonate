import type { BoardKind } from "@/lib/verifyRun";
import { formatDuration } from "@/lib/format";
import { buildSharePreviewUrl, sharePreviewFromResult } from "@/lib/sharePreview";

export type ShareResultInput = {
  siteOrigin: string;
  boardKind: BoardKind;
  difficultyId: string;
  difficultyLabel: string;
  won: boolean;
  durationMs: number;
  seed: number;
  dailyNumber?: number | null;
  dailyDate?: string | null;
  dailyRank?: number | null;
  dailyTotal?: number | null;
};

export function buildSharePlayUrl(
  siteOrigin: string,
  boardKind: BoardKind,
  difficultyId: string,
  seed: number,
): string {
  const origin = siteOrigin.replace(/\/$/, "");
  if (boardKind === "daily") {
    const params = new URLSearchParams({ difficulty: difficultyId, from: "share" });
    return `${origin}/daily?${params.toString()}`;
  }
  const params = new URLSearchParams({
    difficulty: difficultyId,
    seed: String(seed),
    from: "share",
  });
  return `${origin}/play?${params.toString()}`;
}

export function buildShareText(input: ShareResultInput): string {
  const preview = sharePreviewFromResult(input);
  const url = buildSharePreviewUrl(input.siteOrigin, preview);
  const time = formatDuration(input.durationMs);
  const outcome = input.won ? "Cleared" : "Detonated on";
  const dailyTag =
    input.boardKind === "daily" && input.dailyNumber != null
      ? `Daily #${input.dailyNumber}`
      : "Detonate";

  let headline = `${dailyTag} — ${outcome} ${input.difficultyLabel} in ${time}`;
  if (input.won && input.boardKind === "daily" && input.dailyRank != null && input.dailyTotal != null) {
    headline += ` (#${input.dailyRank}/${input.dailyTotal})`;
  } else if (!input.won && input.boardKind === "random") {
    headline = `${dailyTag} — Detonated on ${input.difficultyLabel} (${time}). Can you clear it?`;
  } else if (!input.won && input.boardKind === "daily") {
    headline = `${dailyTag} — Detonated on ${input.difficultyLabel} (${time}). Try today's board:`;
  }

  if (input.boardKind === "daily" && input.dailyDate) {
    headline += `\nBoard date ${input.dailyDate} (UTC)`;
  }

  return `${headline}\n${url}`;
}

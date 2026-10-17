import type { Difficulty } from "@detonate/engine";
import { formatDuration } from "@/lib/format";

export function formatDailyStatsLine(
  difficulty: Pick<Difficulty, "label" | "width" | "height" | "mines">,
  bestDurationMs: number | null | undefined,
): string {
  const size = `${difficulty.width}×${difficulty.height}`;
  const best =
    bestDurationMs != null
      ? `Best today ${formatDuration(bestDurationMs)}`
      : "No verified clears yet today";
  return `${difficulty.label} · ${size} · ${difficulty.mines} mines · ${best}`;
}

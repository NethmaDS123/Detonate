import type { Difficulty } from "@detonate/engine";
import { formatDailyStatsLine } from "@/lib/dailyBranding";

export function DailyBranding({
  dailyNumber,
  difficulty,
  bestDurationMs,
  date,
  compact = false,
}: {
  dailyNumber: number;
  difficulty: Difficulty;
  bestDurationMs: number | null | undefined;
  date: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "text-sm" : undefined}>
      <p className="eyebrow">Daily #{dailyNumber}</p>
      {!compact ? (
        <p className="mt-1 font-medium">
          {difficulty.label} · {difficulty.width}×{difficulty.height} · {difficulty.mines} mines
        </p>
      ) : null}
      <p className={`${compact ? "" : "mt-1"} text-xs text-[var(--muted)]`}>
        {formatDailyStatsLine(difficulty, bestDurationMs)}
        {!compact ? ` · Board date ${date} (UTC)` : null}
      </p>
    </div>
  );
}

"use client";

import { DIFFICULTIES } from "@detonate/engine";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatDate, formatDuration } from "@/lib/format";
import {
  fetchDailyLeaderboard,
  fetchLeaderboard,
  type DailyLeaderboardResult,
  type LeaderboardEntry,
} from "@/lib/leaderboard";

export function Leaderboard({
  difficultyId,
  limit = 10,
  variant = "compact",
  scope = "all",
  highlightRunId = null,
  refreshKey = 0,
}: {
  difficultyId: string;
  limit?: number;
  variant?: "compact" | "full";
  scope?: "all" | "daily";
  highlightRunId?: string | null;
  refreshKey?: number;
}) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    difficultyId: string;
    entries: LeaderboardEntry[] | null;
    dailyNumber?: number;
    bestDurationMs?: number | null;
  } | null>(null);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const requestKey = `${scope}:${difficultyId}:${limit}:${refreshKey}:${attempt}`;

  useEffect(() => {
    let cancelled = false;
    const load =
      scope === "daily"
        ? fetchDailyLeaderboard(difficultyId, limit)
        : fetchLeaderboard(difficultyId, limit);
    void load.then(
      (body) => {
        if (cancelled) return;
        if (scope === "daily") {
          const daily = body as DailyLeaderboardResult;
          setResult({
            key: requestKey,
            difficultyId,
            entries: daily.entries,
            dailyNumber: daily.dailyNumber,
            bestDurationMs: daily.bestDurationMs,
          });
          return;
        }
        setResult({ key: requestKey, difficultyId, entries: body.entries });
      },
      () => {
        if (!cancelled) setResult({ key: requestKey, difficultyId, entries: null });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [difficultyId, limit, requestKey, scope]);

  const current = result?.difficultyId === difficultyId ? result : null;
  const loading = result?.key !== requestKey;
  const entries = current?.entries ?? [];
  const state: "loading" | "ready" | "offline" =
    current?.entries ? "ready" : loading || !current ? "loading" : "offline";

  const label = DIFFICULTIES[difficultyId]?.label ?? difficultyId;
  const difficulty = DIFFICULTIES[difficultyId];
  const full = variant === "full";
  const daily = scope === "daily";
  const dailyNumber = current?.dailyNumber;
  const bestDurationMs = current?.bestDurationMs;
  const highlighted = highlightRunId !== null && entries.some((e) => e.runId === highlightRunId);
  const viewAllHref = daily
    ? `/leaderboard?difficulty=${difficultyId}&board=daily`
    : `/leaderboard?difficulty=${difficultyId}`;

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-col gap-1 border-b border-[var(--line)] px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-sm font-medium">
            {daily && dailyNumber != null ? `Daily #${dailyNumber}` : daily ? "Today's daily" : "Fastest times"}{" "}
            <span className="text-[var(--muted)]">· {label}</span>
          </h2>
          {daily && difficulty ? (
            <p className="text-xs text-[var(--muted)]">
              {difficulty.width}×{difficulty.height} · {difficulty.mines} mines
              {bestDurationMs != null ? ` · Best ${formatDuration(bestDurationMs)}` : ""}
            </p>
          ) : null}
        </div>
        {!full && (
          <Link href={viewAllHref} className="text-xs text-[var(--muted)] hover:text-[var(--text)]">
            View all
          </Link>
        )}
      </header>

      {state === "loading" && (
        <ul className="space-y-2 p-4" aria-label="Loading times">
          {Array.from({ length: Math.min(limit, 5) }, (_, i) => (
            <li key={i} className="h-5 animate-pulse rounded bg-[var(--line)]" />
          ))}
        </ul>
      )}

      {state === "offline" && (
        <div className="space-y-3 px-4 py-5 text-sm">
          <p className="text-[var(--muted)]">Can&apos;t reach the leaderboard right now.</p>
          <button type="button" onClick={retry} className="btn btn-sm">
            Try again
          </button>
        </div>
      )}

      {state === "ready" && entries.length === 0 && (
        <p className="px-4 py-5 text-sm text-[var(--muted)]">
          {daily
            ? "No one has cleared today's daily yet. Be the first."
            : "No verified times yet. Clear a board to set the first one."}
        </p>
      )}

      {state === "ready" && entries.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--muted)]">
              <th className="w-12 px-4 py-2 font-normal">#</th>
              <th className="px-2 py-2 font-normal">Player</th>
              <th className="px-4 py-2 text-right font-normal">Time</th>
              {full && <th className="hidden px-4 py-2 text-right font-normal sm:table-cell">Date</th>}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const yours = entry.runId === highlightRunId;
              return (
                <tr
                  key={entry.runId}
                  className={`border-t border-[var(--line)] ${yours ? "bg-[#231c17]" : ""}`}
                >
                  <td className="px-4 py-2 font-mono text-[var(--muted)]">{entry.rank}</td>
                  <td className="truncate px-2 py-2">
                    {entry.displayName ?? <span className="text-[var(--muted)]">Anonymous</span>}
                    {yours && <span className="ml-2 text-xs text-emerald-400">you</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {formatDuration(entry.durationMs)}
                  </td>
                  {full && (
                    <td className="hidden px-4 py-2 text-right text-[var(--muted)] sm:table-cell">
                      {formatDate(entry.createdAt)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {state === "ready" && entries.length > 0 && highlightRunId && !highlighted && (
        <p className="border-t border-[var(--line)] px-4 py-2 text-xs text-[var(--muted)]">
          Your time is outside the top {limit}.
        </p>
      )}
    </section>
  );
}

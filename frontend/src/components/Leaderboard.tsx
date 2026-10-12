"use client";

import { useEffect, useState } from "react";
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";

const LIMIT = 10;

function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Leaderboard({
  difficultyId,
  label,
  highlightRunId,
  refreshKey,
}: {
  difficultyId: string;
  label: string;
  highlightRunId: string | null;
  refreshKey: number;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "offline">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    void fetchLeaderboard(difficultyId, LIMIT)
      .then((result) => {
        if (cancelled) return;
        setEntries(result.entries);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([]);
          setState("offline");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [difficultyId, refreshKey]);

  const highlighted = highlightRunId
    ? entries.some((entry) => entry.runId === highlightRunId)
    : false;

  return (
    <section className="w-full max-w-md border border-[var(--line)] bg-[var(--bg-raised)]">
      <header className="flex items-baseline justify-between border-b border-[var(--line)] px-4 py-2">
        <h2 className="font-mono text-xs tracking-[0.2em] text-[var(--muted)] uppercase">
          Leaderboard
        </h2>
        <span className="text-sm">{label}</span>
      </header>

      {state === "loading" && (
        <p className="px-4 py-3 font-mono text-sm text-[var(--muted)]">Loading times…</p>
      )}
      {state === "offline" && (
        <p className="px-4 py-3 font-mono text-sm text-[var(--muted)]">Leaderboard offline.</p>
      )}
      {state === "ready" && entries.length === 0 && (
        <p className="px-4 py-3 font-mono text-sm text-[var(--muted)]">No verified times yet.</p>
      )}
      {state === "ready" && entries.length > 0 && (
        <table className="w-full font-mono text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--muted)]">
              <th className="px-4 py-2 font-normal">#</th>
              <th className="px-4 py-2 font-normal">Time</th>
              <th className="px-4 py-2 font-normal">Seed</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const yours = entry.runId === highlightRunId;
              return (
                <tr key={entry.runId} className={yours ? "bg-[#221c18]" : undefined}>
                  <td className="px-4 py-1.5">{entry.rank}</td>
                  <td className="px-4 py-1.5">
                    {formatTime(entry.durationMs)}
                    {yours && <span className="ml-2 text-emerald-400">you</span>}
                  </td>
                  <td className="px-4 py-1.5 text-[var(--muted)]">{entry.seed}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {state === "ready" && entries.length > 0 && highlightRunId && !highlighted && (
        <p className="border-t border-[var(--line)] px-4 py-2 text-xs text-[var(--muted)]">
          Your time is outside the top {LIMIT}.
        </p>
      )}
    </section>
  );
}

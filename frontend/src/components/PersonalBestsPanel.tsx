"use client";

import { DIFFICULTIES } from "@detonate/engine";
import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";
import { fetchPersonalBests, type PersonalBestEntry } from "@/lib/personalBests";

const DIFFICULTY_ORDER = ["beginner", "intermediate", "expert"] as const;

function byDifficulty(entries: PersonalBestEntry[]): Map<string, PersonalBestEntry> {
  return new Map(entries.map((entry) => [entry.difficultyId, entry]));
}

export function PersonalBestsPanel({ token }: { token: string }) {
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ready"; classic: Map<string, PersonalBestEntry>; daily: Map<string, PersonalBestEntry> } | { kind: "error" }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void fetchPersonalBests(token).then(
      (data) => {
        if (cancelled) return;
        setState({
          kind: "ready",
          classic: byDifficulty(data.classic),
          daily: byDifficulty(data.daily),
        });
      },
      () => {
        if (!cancelled) setState({ kind: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.kind === "loading") {
    return (
      <section className="card p-6">
        <h2 className="font-medium">Personal bests</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Loading verified times…</p>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="card p-6">
        <h2 className="font-medium">Personal bests</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Couldn&apos;t load your times right now.</p>
      </section>
    );
  }

  const hasAny =
    DIFFICULTY_ORDER.some((id) => state.classic.has(id) || state.daily.has(id));

  return (
    <section className="card p-6">
      <h2 className="font-medium">Personal bests</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Fastest verified clears attached to this account.
      </p>
      {!hasAny ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          No verified wins yet. Clear a board while signed in to start tracking times.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                <th className="pb-2 pr-4 font-normal">Difficulty</th>
                <th className="pb-2 pr-4 font-normal">Classic</th>
                <th className="pb-2 font-normal">Daily</th>
              </tr>
            </thead>
            <tbody>
              {DIFFICULTY_ORDER.map((id) => {
                const label = DIFFICULTIES[id]?.label ?? id;
                const classic = state.classic.get(id);
                const daily = state.daily.get(id);
                return (
                  <tr key={id} className="border-b border-[var(--line)] last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{label}</td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums">
                      {classic ? formatDuration(classic.durationMs) : "—"}
                    </td>
                    <td className="py-2.5 font-mono tabular-nums">
                      {daily ? formatDuration(daily.durationMs) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

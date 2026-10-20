import Link from "next/link";
import { Leaderboard } from "@/components/Leaderboard";
import { fetchDailyResult, type DailyBoard } from "@/lib/daily";
import { formatDailyStatsLine } from "@/lib/dailyBranding";
import { DIFFICULTY_LIST } from "@/lib/difficulty";
import { formatDuration } from "@/lib/format";

const STEPS = [
  {
    title: "Play",
    body: "Classic Minesweeper rules. Click or tap to reveal, right-click or hold to flag, and chord a number when the flags match.",
  },
  {
    title: "Verify",
    body: "When you clear a board, the server replays every move to confirm the win is real.",
  },
  {
    title: "Rank",
    body: "Verified times go on the leaderboard. Create an account to put your name on them.",
  },
];

function boardsByDifficulty(boards: DailyBoard[]): Map<string, DailyBoard> {
  return new Map(boards.map((board) => [board.difficultyId, board]));
}

export default async function HomePage() {
  let dailyNumber: number | null = null;
  let dailyDate: string | null = null;
  let boards = new Map<string, DailyBoard>();
  let apiOnline = false;

  try {
    const daily = await fetchDailyResult();
    dailyNumber = daily.dailyNumber;
    dailyDate = daily.date;
    boards = boardsByDifficulty(daily.boards);
    apiOnline = true;
  } catch {
    apiOnline = false;
  }

  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      <section className="flex max-w-2xl flex-col gap-4 sm:gap-5">
        {!apiOnline ? <p className="eyebrow">Competitive Minesweeper</p> : null}
        <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:gap-x-3">
          <span className="text-5xl font-semibold uppercase leading-none tracking-tight sm:text-6xl">
            Detonate
          </span>
          <span className="text-xl font-normal text-[var(--muted)] sm:text-2xl">
            don&apos;t.
          </span>
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-[0.9375rem]">
          {apiOnline ? (
            <>
              One shared board per difficulty each day. Clear it fast — every win is verified on
              the server.
            </>
          ) : (
            <>
              Same rules as Minesweeper. Every win is replayed on the server, so every time on the
              board is real.
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/daily" className="btn btn-primary">
            Play today&apos;s board
          </Link>
          <Link href="/play" className="btn">
            Classic
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-[var(--line)] pb-4">
          <h2 className="eyebrow">
            {dailyNumber != null ? `Daily #${dailyNumber}` : "Today's daily"}
          </h2>
          {apiOnline && dailyDate ? (
            <p className="font-mono text-xs text-[var(--muted)]">{dailyDate} UTC</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
          {DIFFICULTY_LIST.map((d) => {
            const board = boards.get(d.id);
            const bestDurationMs = board?.bestDurationMs;
            const hasBest = apiOnline && bestDurationMs != null;
            return (
              <Link
                key={d.id}
                href={`/daily?difficulty=${d.id}`}
                className="card group flex min-h-[9.5rem] flex-col p-5 transition-colors hover:border-[var(--muted)] sm:min-h-[10rem] sm:p-6"
              >
                <div className="space-y-1.5">
                  <p className="font-medium">{d.label}</p>
                  <p className="font-mono text-xs leading-relaxed text-[var(--muted)]">
                    {apiOnline && board
                      ? formatDailyStatsLine(d, board.bestDurationMs)
                      : `${d.width}×${d.height} · ${d.mines} mines`}
                  </p>
                </div>
                {hasBest ? (
                  <p className="mt-auto pt-4 font-mono text-lg tabular-nums text-emerald-400">
                    {formatDuration(bestDurationMs)}
                  </p>
                ) : (
                  <p className="mt-auto pt-4 text-sm text-[var(--muted)] group-hover:text-[var(--text)]">
                    {apiOnline ? "Be the first clear →" : "Play →"}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
        {!apiOnline ? (
          <p className="text-sm text-[var(--muted)]">
            Daily stats need the API — you can still play offline in Classic mode.
          </p>
        ) : null}
      </section>

      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_min(100%,22.5rem)] lg:items-start lg:gap-8 xl:gap-12">
        <div className="flex min-w-0 flex-col gap-5">
          <h2 className="eyebrow border-b border-[var(--line)] pb-4">How it works</h2>
          <ol className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            {STEPS.map((step, i) => (
              <li key={step.title} className="card flex flex-col p-5 sm:p-6">
                <p className="font-mono text-xs text-[var(--accent)]">0{i + 1}</p>
                <p className="mt-2 font-medium">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="min-w-0 lg:sticky lg:top-[calc(3.5rem+1px)]">
          <Leaderboard
            difficultyId="beginner"
            limit={5}
            scope={apiOnline ? "daily" : "all"}
          />
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { DIFFICULTIES } from "@detonate/engine";
import { Leaderboard } from "@/components/Leaderboard";
import { fetchDailyResult, type DailyBoard } from "@/lib/daily";
import { formatDailyStatsLine } from "@/lib/dailyBranding";
import { DIFFICULTY_LIST } from "@/lib/difficulty";
import { formatDuration } from "@/lib/format";

const STEPS = [
  {
    title: "Play",
    body: "Classic Minesweeper rules. Left-click reveals, right-click flags, click a number to chord.",
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

  const heroDifficulty = DIFFICULTIES.beginner;
  const heroBoard = boards.get(heroDifficulty.id);
  const heroStats = formatDailyStatsLine(heroDifficulty, heroBoard?.bestDurationMs);

  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col items-start gap-6 pt-6 sm:pt-12">
        <p className="eyebrow">
          {dailyNumber != null ? `Daily #${dailyNumber}` : "Competitive Minesweeper"}
        </p>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Don&apos;t.</h1>
        <p className="max-w-lg text-[var(--muted)]">
          {apiOnline ? (
            <>
              One shared board per difficulty today
              {dailyDate ? ` (${dailyDate} UTC)` : ""}. Clear it fast — every win is verified on
              the server.
            </>
          ) : (
            <>
              Same rules as Minesweeper. Every win is replayed on the server, so every time on the
              board is real.
            </>
          )}
        </p>
        {apiOnline ? (
          <p className="max-w-lg font-mono text-sm text-[var(--muted)]">{heroStats}</p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Link href="/daily" className="btn btn-primary">
            Play today&apos;s board
          </Link>
          <Link href="/play" className="btn">
            Classic
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="eyebrow">
            {dailyNumber != null ? `Daily #${dailyNumber}` : "Today's daily"}
          </h2>
          {apiOnline && dailyDate ? (
            <p className="text-xs text-[var(--muted)]">Board date {dailyDate} (UTC)</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {DIFFICULTY_LIST.map((d) => {
            const board = boards.get(d.id);
            return (
              <Link
                key={d.id}
                href={`/daily?difficulty=${d.id}`}
                className="card group p-5 transition-colors hover:border-[var(--muted)]"
              >
                <p className="font-medium">{d.label}</p>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                  {apiOnline && board
                    ? formatDailyStatsLine(d, board.bestDurationMs)
                    : `${d.width}×${d.height} · ${d.mines} mines`}
                </p>
                {apiOnline && board?.bestDurationMs != null ? (
                  <p className="mt-3 font-mono text-lg tabular-nums text-emerald-400">
                    {formatDuration(board.bestDurationMs)}
                  </p>
                ) : (
                  <p className="mt-6 text-sm text-[var(--muted)] group-hover:text-[var(--text)]">
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

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <h2 className="eyebrow">How it works</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="card p-5">
                <p className="font-mono text-xs text-[var(--accent)]">0{i + 1}</p>
                <p className="mt-2 font-medium">{step.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
        <Leaderboard difficultyId="beginner" limit={5} scope={apiOnline ? "daily" : "all"} />
      </section>
    </div>
  );
}

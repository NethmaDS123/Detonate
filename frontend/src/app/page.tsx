import Link from "next/link";
import { Leaderboard } from "@/components/Leaderboard";
import { DIFFICULTY_LIST } from "@/lib/difficulty";

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

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col items-start gap-6 pt-6 sm:pt-12">
        <p className="eyebrow">Competitive Minesweeper</p>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Don&apos;t.</h1>
        <p className="max-w-lg text-[var(--muted)]">
          Same rules as Minesweeper. Every win is replayed on the server, so every time on the
          board is real.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/daily" className="btn btn-primary">
            Play today&apos;s daily
          </Link>
          <Link href="/play" className="btn">
            Classic
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="eyebrow">Today&apos;s daily</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {DIFFICULTY_LIST.map((d) => (
            <Link
              key={d.id}
              href={`/daily?difficulty=${d.id}`}
              className="card group p-5 transition-colors hover:border-[var(--muted)]"
            >
              <p className="font-medium">{d.label}</p>
              <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                {d.width}×{d.height} · {d.mines} mines
              </p>
              <p className="mt-6 text-sm text-[var(--muted)] group-hover:text-[var(--text)]">
                Play →
              </p>
            </Link>
          ))}
        </div>
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
        <Leaderboard difficultyId="beginner" limit={5} />
      </section>
    </div>
  );
}

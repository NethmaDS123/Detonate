"use client";

import { DIFFICULTIES, Game, type Cell, type Event, type Status } from "@detonate/engine";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "@/components/AccountProvider";
import { Leaderboard } from "@/components/Leaderboard";
import { fetchDaily } from "@/lib/daily";
import { formatClock, formatDuration } from "@/lib/format";
import { randomSeed } from "@/lib/seed";
import {
  verifyRun,
  type BoardKind,
  type VerifyRunPayload,
  type VerifyRunResult,
} from "@/lib/verifyRun";

type VerifyState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "done"; result: VerifyRunResult }
  | { kind: "unavailable" };

type Tone = "muted" | "good" | "bad";

const CELL_SIZE: Record<string, number> = { beginner: 34, intermediate: 28, expert: 22 };

const TONE_CLASS: Record<Tone, string> = {
  muted: "text-[var(--muted)]",
  good: "text-emerald-400",
  bad: "text-[var(--accent)]",
};

function statusLabel(status: Status): string {
  if (status === "won") return "Cleared";
  if (status === "lost") return "Detonated";
  if (status === "in_progress") return "Don't.";
  return "Click any cell";
}

function verifySummary(state: VerifyState): { tone: Tone; text: string } {
  if (state.kind === "unavailable") {
    return { tone: "muted", text: "Couldn't reach the server, so this win wasn't recorded." };
  }
  if (state.kind !== "done") {
    return { tone: "muted", text: "Verifying with the server…" };
  }
  const { result } = state;
  if (result.verified && result.stored) {
    return { tone: "good", text: "Verified and saved to the leaderboard." };
  }
  if (result.verified) {
    return { tone: "muted", text: "Verified, but the leaderboard couldn't save it right now." };
  }
  if (result.reason === "daily_mismatch") {
    return { tone: "bad", text: "This daily board has expired. Load today's board to rank." };
  }
  return { tone: "bad", text: "The server replay didn't match this result, so it wasn't ranked." };
}

type BoardView = {
  seed: number;
  date: string | null;
  status: Status;
  remainingMines: number;
  grid: Cell[][];
};

function snapshot(game: Game, date: string | null): BoardView {
  return {
    seed: game.seed,
    date,
    status: game.status,
    remainingMines: game.remainingMines(),
    grid: game.grid.map((row) => row.map((cell) => ({ ...cell }))),
  };
}

export function GameClient({
  boardKind,
  difficultyId,
  initialSeed,
}: {
  boardKind: BoardKind;
  difficultyId: string;
  initialSeed?: number;
}) {
  const difficulty = DIFFICULTIES[difficultyId] ?? DIFFICULTIES.beginner;
  const { status: accountStatus, account, token } = useAccount();

  const [initial] = useState(() => {
    if (initialSeed === undefined) return { game: null, view: null };
    const game = new Game(difficulty.width, difficulty.height, difficulty.mines, initialSeed);
    return { game, view: snapshot(game, null) };
  });
  const gameRef = useRef<Game | null>(initial.game);
  const eventsRef = useRef<Event[]>([]);
  const [view, setView] = useState<BoardView | null>(initial.view);
  const [dailyFailed, setDailyFailed] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [verify, setVerify] = useState<VerifyState>({ kind: "idle" });
  const [highlightRunId, setHighlightRunId] = useState<string | null>(null);
  const [leaderboardTick, setLeaderboardTick] = useState(0);

  const deal = useCallback(
    (seed: number, date: string | null) => {
      const game = new Game(difficulty.width, difficulty.height, difficulty.mines, seed);
      gameRef.current = game;
      eventsRef.current = [];
      setView(snapshot(game, date));
      setVerify({ kind: "idle" });
      setStartedAt(null);
      setEndedAt(null);
    },
    [difficulty],
  );

  const requestDaily = useCallback(
    () =>
      fetchDaily(difficulty.id).then(
        (result) => {
          setDailyFailed(false);
          deal(result.seed, result.date);
        },
        () => setDailyFailed(true),
      ),
    [deal, difficulty.id],
  );

  useEffect(() => {
    if (boardKind === "daily") void requestDaily();
  }, [boardKind, requestDaily]);

  const newBoard = useCallback(() => {
    if (boardKind === "daily") {
      setDailyFailed(false);
      setView(null);
      void requestDaily();
      return;
    }
    deal(randomSeed(), null);
  }, [boardKind, deal, requestDaily]);

  useEffect(() => {
    if (!startedAt || endedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [startedAt, endedAt]);

  const submitWin = useCallback(
    (game: Game, date: string | null, durationMs: number) => {
      const events = [...eventsRef.current];
      const payload: VerifyRunPayload = {
        difficultyId: difficulty.id,
        seed: game.seed,
        events,
        status: "won",
        durationMs,
        boardKind,
        mode: "classic",
        ...(boardKind === "daily" && date ? { dailyId: `${date}:${difficulty.id}` } : {}),
      };
      setVerify({ kind: "pending" });
      void verifyRun(payload, token).then(
        (result) => {
          if (gameRef.current !== game) return;
          setVerify({ kind: "done", result });
          if (result.stored && result.runId) {
            setHighlightRunId(result.runId);
            setLeaderboardTick((n) => n + 1);
          }
        },
        () => {
          if (gameRef.current === game) setVerify({ kind: "unavailable" });
        },
      );
    },
    [boardKind, difficulty.id, token],
  );

  const applyMove = useCallback(
    (event: Event) => {
      const game = gameRef.current;
      if (!game || !view || game.status === "won" || game.status === "lost") return;
      const wasReady = game.status === "ready";
      eventsRef.current.push(event);
      const status = game.apply(event);

      const t = Date.now();
      const start = wasReady && status !== "ready" ? t : startedAt;
      if (start !== startedAt) {
        setStartedAt(start);
        setNow(t);
      }
      if (status === "won" || status === "lost") {
        setEndedAt(t);
        if (status === "won" && start !== null) submitWin(game, view.date, t - start);
      }
      setView(snapshot(game, view.date));
    },
    [startedAt, submitWin, view],
  );

  const onReveal = useCallback(
    (x: number, y: number) => {
      const cell = view?.grid[y][x];
      if (!cell || cell.flagged) return;
      applyMove({ type: cell.revealed && cell.adjacent > 0 ? "chord" : "reveal", x, y });
    },
    [applyMove, view],
  );

  const onFlag = useCallback((x: number, y: number) => applyMove({ type: "flag", x, y }), [applyMove]);

  if (dailyFailed) {
    return (
      <div className="card mx-auto w-full max-w-md p-6 text-center">
        <p className="font-medium">Couldn&apos;t load today&apos;s board.</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          The daily board comes from the server. Check your connection and try again.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-primary" onClick={newBoard}>
            Try again
          </button>
          <Link className="btn" href={`/play?difficulty=${difficulty.id}`}>
            Play classic instead
          </Link>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="card mx-auto flex h-64 w-full max-w-md items-center justify-center">
        <p className="font-mono text-sm text-[var(--muted)]">Dealing a board…</p>
      </div>
    );
  }

  const finished = view.status === "won" || view.status === "lost";
  const elapsed = startedAt ? (endedAt ?? now) - startedAt : 0;
  const cellSize = CELL_SIZE[difficulty.id] ?? 28;
  const playAgainLabel = boardKind === "daily" ? "Replay daily" : "New board";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <section className="flex min-w-0 flex-col items-center">
        <div className="flex w-min max-w-full flex-col gap-3">
          <div className="card flex items-center justify-between gap-6 px-4 py-2.5">
            <div>
              <p className="eyebrow text-[10px]">Mines</p>
              <p className="font-mono text-lg tabular-nums">
                {view.remainingMines.toString().padStart(3, "0")}
              </p>
            </div>
            <p
              className={`whitespace-nowrap text-sm font-medium ${view.status === "lost" ? "text-[var(--accent)]" : view.status === "won" ? "text-emerald-400" : "text-[var(--muted)]"}`}
              aria-live="polite"
            >
              {statusLabel(view.status)}
            </p>
            <div className="text-right">
              <p className="eyebrow text-[10px]">Time</p>
              <p className="font-mono text-lg tabular-nums">{formatClock(elapsed)}</p>
            </div>
          </div>

          <div className="max-w-full overflow-x-auto">
            <div
              role="group"
              aria-label={`${difficulty.label} board`}
              className="card inline-grid gap-[2px] p-2"
              style={{
                gridTemplateColumns: `repeat(${difficulty.width}, ${cellSize}px)`,
                gridAutoRows: `${cellSize}px`,
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {view.grid.map((row, y) =>
                row.map((cell, x) => (
                  <CellView
                    key={`${x}-${y}`}
                    x={x}
                    y={y}
                    revealed={cell.revealed}
                    flagged={cell.flagged}
                    isMine={cell.isMine}
                    adjacent={cell.adjacent}
                    status={view.status}
                    size={cellSize}
                    onReveal={onReveal}
                    onFlag={onFlag}
                  />
                )),
              )}
            </div>
          </div>

          {finished ? (
            <ResultCard
              won={view.status === "won"}
              elapsed={elapsed}
              verify={verify}
              signedInAs={accountStatus === "signed_in" ? (account?.displayName ?? null) : null}
              playAgainLabel={playAgainLabel}
              onPlayAgain={newBoard}
              leaderboardHref={
                boardKind === "daily"
                  ? `/leaderboard?difficulty=${difficulty.id}&board=daily`
                  : `/leaderboard?difficulty=${difficulty.id}`
              }
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]">
              <span>Left-click reveals · right-click flags · click a number to chord</span>
              <button type="button" className="btn btn-sm" onClick={newBoard}>
                {boardKind === "daily" ? "Restart" : "New board"}
              </button>
            </div>
          )}
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="card px-4 py-3 text-sm">
          <p className="eyebrow">{boardKind === "daily" ? "Daily board" : "Classic"}</p>
          <p className="mt-1">
            {difficulty.label} · {difficulty.width}×{difficulty.height} · {difficulty.mines} mines
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {boardKind === "daily"
              ? `Same board for everyone on ${view.date ?? "today"} (UTC).`
              : `Seed ${view.seed}. Every new board is different.`}
          </p>
        </div>
        <Leaderboard
          difficultyId={difficulty.id}
          scope={boardKind === "daily" ? "daily" : "all"}
          highlightRunId={highlightRunId}
          refreshKey={leaderboardTick}
        />
      </aside>
    </div>
  );
}

function ResultCard({
  won,
  elapsed,
  verify,
  signedInAs,
  playAgainLabel,
  onPlayAgain,
  leaderboardHref,
}: {
  won: boolean;
  elapsed: number;
  verify: VerifyState;
  signedInAs: string | null;
  playAgainLabel: string;
  onPlayAgain: () => void;
  leaderboardHref: string;
}) {
  const summary = won ? verifySummary(verify) : null;
  const saved = verify.kind === "done" && Boolean(verify.result.stored);

  return (
    <div className="card p-5" role="status">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={`text-xl font-semibold ${won ? "text-emerald-400" : "text-[var(--accent)]"}`}>
          {won ? "Cleared." : "Detonated."}
        </p>
        <p className="font-mono text-2xl tabular-nums">{formatDuration(elapsed)}</p>
      </div>

      {summary ? (
        <p className={`mt-2 text-sm ${TONE_CLASS[summary.tone]}`}>{summary.text}</p>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]">You hit a mine. Shake it off and go again.</p>
      )}

      {saved && (
        <p className="mt-1 text-sm text-[var(--muted)]">
          {signedInAs ? (
            <>
              Ranked as <span className="text-[var(--text)]">{signedInAs}</span>.
            </>
          ) : (
            <>
              Saved without a name.{" "}
              <Link href="/account" className="text-[var(--text)] underline underline-offset-4">
                Create an account
              </Link>{" "}
              to put your name on future wins.
            </>
          )}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={onPlayAgain}>
          {playAgainLabel}
        </button>
        <Link href={leaderboardHref} className="btn">
          Leaderboard
        </Link>
      </div>
    </div>
  );
}

function CellView({
  x,
  y,
  revealed,
  flagged,
  isMine,
  adjacent,
  status,
  size,
  onReveal,
  onFlag,
}: {
  x: number;
  y: number;
  revealed: boolean;
  flagged: boolean;
  isMine: boolean;
  adjacent: number;
  status: Status;
  size: number;
  onReveal: (x: number, y: number) => void;
  onFlag: (x: number, y: number) => void;
}) {
  const finished = status === "won" || status === "lost";
  let content = "";
  let className =
    "flex items-center justify-center rounded-[3px] font-mono font-semibold select-none";

  if (!revealed) {
    className += " bg-[#2b2622] shadow-[inset_0_-2px_0_rgba(0,0,0,0.35)]";
    if (!finished) className += " hover:bg-[#3a332d]";
    if (flagged) {
      content = "⚑";
      className += " text-[var(--accent)]";
    }
  } else if (isMine) {
    content = "●";
    className +=
      status === "lost"
        ? " bg-[var(--accent)] text-[#1a0f0c]"
        : " bg-[#2b2622] text-[var(--accent)]";
  } else {
    className += " bg-[#14110f]";
    if (adjacent > 0) {
      content = String(adjacent);
      className += ` cell-num-${adjacent}`;
    }
  }

  return (
    <button
      type="button"
      aria-label={`Row ${y + 1}, column ${x + 1}${flagged ? ", flagged" : ""}`}
      className={className}
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.5) }}
      disabled={finished}
      onClick={() => onReveal(x, y)}
      onContextMenu={(e) => {
        e.preventDefault();
        onFlag(x, y);
      }}
    >
      {content}
    </button>
  );
}

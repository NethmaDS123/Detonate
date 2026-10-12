"use client";

import { DIFFICULTIES, Game, type Difficulty, type Event, type Status } from "@detonate/engine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Leaderboard } from "@/components/Leaderboard";
import { fetchDaily } from "@/lib/daily";
import { verifyRun } from "@/lib/verifyRun";

const difficultyList = Object.values(DIFFICULTIES);

function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function statusLine(status: Status): string {
  if (status === "won") return "Cleared.";
  if (status === "lost") return "Detonated.";
  if (status === "in_progress") return "Don't.";
  return "Click a cell.";
}

export function GameClient() {
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTIES.beginner);
  const [seed, setSeed] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [revision, setRevision] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const gameRef = useRef<Game>(new Game(9, 9, 10, 1));
  const eventsRef = useRef<Event[]>([]);
  const [verifyState, setVerifyState] = useState<
    "idle" | "pending" | "verified" | "failed" | "unavailable"
  >("idle");
  const [runStored, setRunStored] = useState(false);
  const [highlightRunId, setHighlightRunId] = useState<string | null>(null);
  const [leaderboardTick, setLeaderboardTick] = useState(0);
  const [boardMode, setBoardMode] = useState<"random" | "daily">("random");
  const [dailyDate, setDailyDate] = useState<string | null>(null);
  const [dailyState, setDailyState] = useState<"idle" | "loading" | "ready" | "offline">("idle");

  useEffect(() => {
    reset(DIFFICULTIES.beginner);
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deal a board once on the client
  }, []);

  const reset = useCallback(
    (next: Difficulty, nextSeed?: number) => {
      const resolvedSeed = nextSeed ?? ((Date.now() >>> 0) || 1);
      setDifficulty(next);
      setSeed(resolvedSeed);
      gameRef.current = new Game(next.width, next.height, next.mines, resolvedSeed);
      eventsRef.current = [];
      setVerifyState("idle");
      setRunStored(false);
      setHighlightRunId((current) => (next.id === difficulty.id ? current : null));
      setStartedAt(null);
      setEndedAt(null);
      setRevision((n) => n + 1);
    },
    [difficulty.id],
  );

  const loadDaily = useCallback(
    async (next: Difficulty) => {
      setDailyState("loading");
      try {
        const result = await fetchDaily(next.id);
        reset(next, result.seed);
        setDailyDate(result.date);
        setDailyState("ready");
      } catch {
        setDailyState("offline");
      }
    },
    [reset],
  );

  const selectDifficulty = useCallback(
    (next: Difficulty) => {
      if (boardMode === "daily") {
        void loadDaily(next);
        return;
      }
      reset(next);
    },
    [boardMode, loadDaily, reset],
  );

  const selectBoardMode = useCallback(
    (mode: "random" | "daily") => {
      setBoardMode(mode);
      if (mode === "daily") {
        void loadDaily(difficulty);
        return;
      }
      setDailyDate(null);
      setDailyState("idle");
      reset(difficulty);
    },
    [difficulty, loadDaily, reset],
  );

  useEffect(() => {
    if (!startedAt || endedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [startedAt, endedAt]);

  const bump = useCallback((startedThisAction: boolean) => {
    const g = gameRef.current;
    if (startedThisAction) {
      const t = Date.now();
      setStartedAt(t);
      setNow(t);
    }
    if (g.status === "won" || g.status === "lost") {
      setEndedAt((prev) => prev ?? Date.now());
    }
    setRevision((n) => n + 1);
  }, []);

  const onReveal = useCallback(
    (x: number, y: number) => {
      const g = gameRef.current;
      const wasReady = g.status === "ready";
      const cell = g.cell(x, y);
      const event: Event =
        cell.revealed && cell.adjacent > 0
          ? { type: "chord", x, y }
          : { type: "reveal", x, y };
      eventsRef.current.push(event);
      if (event.type === "chord") {
        g.chord(x, y);
      } else {
        g.reveal(x, y);
      }
      bump(wasReady && g.status !== "ready");
    },
    [bump],
  );

  const onFlag = useCallback(
    (x: number, y: number) => {
      eventsRef.current.push({ type: "flag", x, y });
      gameRef.current.flag(x, y);
      bump(false);
    },
    [bump],
  );

  useEffect(() => {
    if (!endedAt || !startedAt || gameRef.current.status !== "won") return;
    const events = [...eventsRef.current];
    if (events.length === 0) return;

    let cancelled = false;
    setVerifyState("pending");
    void verifyRun({
      difficultyId: difficulty.id,
      seed,
      events,
      status: "won",
      durationMs: endedAt - startedAt,
    })
      .then((result) => {
        if (cancelled) return;
        setVerifyState(result.verified ? "verified" : "failed");
        setRunStored(Boolean(result.stored));
        if (result.stored && result.runId) {
          setHighlightRunId(result.runId);
          setLeaderboardTick((n) => n + 1);
        }
      })
      .catch(() => {
        if (!cancelled) setVerifyState("unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, [endedAt, startedAt, difficulty.id, seed]);

  const cellSize = useMemo(() => {
    if (difficulty.id === "expert") return 22;
    if (difficulty.id === "intermediate") return 26;
    return 32;
  }, [difficulty.id]);

  const game = gameRef.current;
  const elapsed = endedAt && startedAt ? endedAt - startedAt : startedAt ? now - startedAt : 0;

  if (!mounted) {
    return (
      <p className="font-mono text-sm text-[var(--muted)]">Dealing a board…</p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <header className="flex w-full max-w-5xl flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.28em] text-[var(--muted)] uppercase">
            Detonate
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">Don&apos;t.</h1>
        </div>
        <p className="max-w-xs text-sm text-[var(--muted)]">
          Same rules as Minesweeper. The product is not detonating.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {difficultyList.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => selectDifficulty(d)}
            className={`border px-3 py-1.5 text-sm transition-colors ${
              difficulty.id === d.id
                ? "border-[var(--accent)] text-[var(--text)]"
                : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--muted)]"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {(["random", "daily"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => selectBoardMode(mode)}
            className={`border px-3 py-1.5 font-mono text-xs tracking-wide uppercase transition-colors ${
              boardMode === mode
                ? "border-[var(--accent)] text-[var(--text)]"
                : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--muted)]"
            }`}
          >
            {mode}
          </button>
        ))}
        {boardMode === "daily" && dailyState === "loading" && (
          <span className="font-mono text-xs text-[var(--muted)]">loading daily…</span>
        )}
        {boardMode === "daily" && dailyState === "offline" && (
          <span className="font-mono text-xs text-[var(--muted)]">daily offline</span>
        )}
      </div>

      <div className="flex w-full max-w-5xl items-center justify-between gap-4 border border-[var(--line)] bg-[var(--bg-raised)] px-4 py-3 font-mono text-sm">
        <span>
          {game.remainingMines().toString().padStart(3, "0")}{" "}
          <span className="text-[var(--muted)]">mines</span>
        </span>
        <span className={game.status === "lost" ? "text-[var(--accent)]" : ""}>
          {statusLine(game.status)}
          {verifyState === "pending" && (
            <span className="ml-2 text-[var(--muted)]">· verifying…</span>
          )}
          {verifyState === "verified" && (
            <span className="ml-2 text-emerald-400">
              · verified{runStored ? ", saved" : ""}
            </span>
          )}
          {verifyState === "failed" && (
            <span className="ml-2 text-[var(--accent)]">· verify failed</span>
          )}
          {verifyState === "unavailable" && (
            <span className="ml-2 text-[var(--muted)]">· verify offline</span>
          )}
        </span>
        <span>{formatTime(elapsed)}</span>
      </div>

      <div
        className="border border-[var(--line)] p-2"
        onContextMenu={(e) => e.preventDefault()}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${difficulty.width}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${difficulty.height}, ${cellSize}px)`,
        }}
        data-revision={revision}
      >
        {game.grid.map((row, y) =>
          row.map((cell, x) => (
            <CellView
              key={`${x}-${y}`}
              x={x}
              y={y}
              revealed={cell.revealed}
              flagged={cell.flagged}
              isMine={cell.isMine}
              adjacent={cell.adjacent}
              status={game.status}
              size={cellSize}
              onReveal={onReveal}
              onFlag={onFlag}
            />
          )),
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
        <button
          type="button"
          onClick={() =>
            boardMode === "daily" ? void loadDaily(difficulty) : reset(difficulty)
          }
          className="border border-[var(--line)] px-4 py-2 text-[var(--text)] hover:border-[var(--muted)]"
        >
          {boardMode === "daily" ? "Retry daily" : "New board"}
        </button>
        <span className="font-mono text-xs">
          {boardMode === "daily" && dailyDate ? `daily · ${dailyDate}` : `seed ${seed}`}
        </span>
      </div>

      <Leaderboard
        difficultyId={difficulty.id}
        label={difficulty.label}
        highlightRunId={highlightRunId}
        refreshKey={leaderboardTick}
      />
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
  let content = "";
  let className =
    "flex items-center justify-center border border-[var(--bg)] font-mono font-semibold select-none";

  if (!revealed) {
    className += " bg-[#2b2622] hover:bg-[#352f2a]";
    if (flagged) {
      content = "F";
      className += " text-[var(--accent)]";
    }
  } else if (isMine) {
    content = "●";
    className +=
      status === "lost"
        ? " bg-[var(--accent)] text-[#1a0f0c]"
        : " bg-[#2b2622] text-[var(--accent)]";
  } else {
    className += " bg-[#12100e]";
    if (adjacent > 0) {
      content = String(adjacent);
      className += ` cell-num-${adjacent}`;
    }
  }

  return (
    <button
      type="button"
      aria-label={`cell ${x},${y}`}
      className={className}
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.48) }}
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

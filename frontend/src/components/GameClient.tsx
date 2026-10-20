"use client";

import { DIFFICULTIES, Game, type Cell, type Event, type Status } from "@detonate/engine";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useAccount } from "@/components/AccountProvider";
import { DailyBranding } from "@/components/DailyBranding";
import { Leaderboard } from "@/components/Leaderboard";
import { ShareResultButton } from "@/components/ShareResultButton";
import { fetchDaily } from "@/lib/daily";
import { formatClock, formatDuration } from "@/lib/format";
import { randomSeed } from "@/lib/seed";
import {
  verifyRun,
  type BoardKind,
  type VerifyRunPayload,
  type VerifyRunResult,
} from "@/lib/verifyRun";
import { IN_GAME_RANKED_HINT } from "@/lib/rankedPlay";

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

/** Narrow viewports only — laptops and monitors keep the desktop layout. */
function useMobileViewport() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return mobile;
}

function verifySummary(
  state: VerifyState,
  boardKind: BoardKind,
): { tone: Tone; text: string } {
  if (state.kind === "unavailable") {
    return {
      tone: "muted",
      text: "Casual win — the server was unreachable, so this clear wasn't verified or ranked.",
    };
  }
  if (state.kind !== "done") {
    return { tone: "muted", text: "Verifying with the server…" };
  }
  const { result } = state;
  if (result.verified && result.stored) {
    if (
      boardKind === "daily" &&
      result.dailyRank != null &&
      result.dailyTotal != null
    ) {
      return {
        tone: "good",
        text: `Verified — #${result.dailyRank} of ${result.dailyTotal} on today's daily.`,
      };
    }
    return { tone: "good", text: "Verified and saved to the leaderboard." };
  }
  if (result.verified) {
    return { tone: "muted", text: "Verified, but the leaderboard couldn't save it right now." };
  }
  if (result.reason === "daily_mismatch") {
    return { tone: "bad", text: "This daily board has expired. Load today's board to rank." };
  }
  return {
    tone: "bad",
    text: "Server replay didn't match — casual clear only, not ranked.",
  };
}

function personalBestCopy(
  verify: VerifyState,
  boardKind: BoardKind,
): { tone: Tone; text: string } | null {
  if (verify.kind !== "done" || !verify.result.stored || verify.result.isPersonalBest == null) {
    return null;
  }
  const mode = boardKind === "daily" ? "Daily" : "Classic";
  if (verify.result.isPersonalBest) {
    return { tone: "good", text: `New ${mode} personal best!` };
  }
  if (verify.result.personalBestMs != null) {
    return {
      tone: "muted",
      text: `Your ${mode.toLowerCase()} best is ${formatDuration(verify.result.personalBestMs)}.`,
    };
  }
  return null;
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
  const isMobile = useMobileViewport();

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
  const [dailyBranding, setDailyBranding] = useState<{
    dailyNumber: number;
    bestDurationMs: number | null;
  } | null>(null);
  const [flagMode, setFlagMode] = useState(false);
  const [zoom, setZoom] = useState<"auto" | number>("auto");
  const [boardOverflows, setBoardOverflows] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const flagging = isMobile && flagMode;
  const activeZoom = isMobile ? zoom : "auto";

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
          setDailyBranding({
            dailyNumber: result.dailyNumber,
            bestDurationMs: result.bestDurationMs,
          });
          deal(result.seed, result.date);
        },
        () => setDailyFailed(true),
      ),
    [deal, difficulty.id],
  );

  useEffect(() => {
    if (boardKind === "daily") void requestDaily();
  }, [boardKind, requestDaily]);

  useEffect(() => {
    if (!isMobile) return;
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => {
      setBoardOverflows(
        frame.scrollWidth > frame.clientWidth + 1 || frame.scrollHeight > frame.clientHeight + 1,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    if (boardRef.current) observer.observe(boardRef.current);
    return () => observer.disconnect();
  }, [isMobile, activeZoom, view, difficulty.width, difficulty.height]);

  useEffect(() => {
    if (boardKind !== "daily" || leaderboardTick === 0) return;
    void fetchDaily(difficulty.id).then((result) => {
      setDailyBranding({
        dailyNumber: result.dailyNumber,
        bestDurationMs: result.bestDurationMs,
      });
    });
  }, [boardKind, difficulty.id, leaderboardTick]);

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

  function zoomBy(delta: number) {
    const cell = boardRef.current?.querySelector("button");
    const current = cell ? cell.getBoundingClientRect().width : typeof zoom === "number" ? zoom : 32;
    setZoom(Math.round(Math.min(52, Math.max(12, current + delta))));
  }

  function fitBoard() {
    if (activeZoom !== "auto") {
      setZoom("auto");
      return;
    }
    const frame = frameRef.current;
    if (!frame) return;
    const inner = frame.clientWidth - 18;
    const size = Math.floor((inner - 2 * (difficulty.width - 1)) / difficulty.width);
    setZoom(Math.max(8, Math.min(52, size)));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <section className="flex min-w-0 flex-col items-center">
        <div
          className={
            isMobile
              ? "flex w-full min-w-0 flex-col gap-3"
              : "flex w-min max-w-full flex-col gap-3"
          }
        >
          <div
            className={`card flex items-center justify-between px-4 py-2.5 ${isMobile ? "gap-3" : "gap-6"}`}
          >
            <div>
              <p className="eyebrow text-[10px]">Mines</p>
              <p className="font-mono text-lg tabular-nums">
                {view.remainingMines.toString().padStart(3, "0")}
              </p>
            </div>
            <p
              className={`text-sm font-medium ${isMobile ? "text-center" : "whitespace-nowrap"} ${view.status === "lost" ? "text-[var(--accent)]" : view.status === "won" ? "text-emerald-400" : "text-[var(--muted)]"}`}
              aria-live="polite"
            >
              {view.status === "ready" && isMobile
                ? "Tap any cell"
                : statusLabel(view.status)}
            </p>
            <div className="text-right">
              <p className="eyebrow text-[10px]">Time</p>
              <p className="font-mono text-lg tabular-nums">{formatClock(elapsed)}</p>
            </div>
          </div>

          {isMobile ? (
            <div className="flex items-center justify-between gap-2">
              <div className="segmented segmented-toggle" role="group" aria-label="Touch action">
                <button
                  type="button"
                  className="segmented-item"
                  aria-pressed={!flagging}
                  onClick={() => setFlagMode(false)}
                >
                  Reveal
                </button>
                <button
                  type="button"
                  className="segmented-item"
                  aria-pressed={flagging}
                  onClick={() => setFlagMode(true)}
                >
                  Flag
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  className="btn btn-sm px-2.5"
                  aria-label="Smaller cells"
                  disabled={typeof activeZoom === "number" && activeZoom <= 12}
                  onClick={() => zoomBy(-4)}
                >
                  −
                </button>
                <button type="button" className="btn btn-sm" onClick={fitBoard}>
                  {activeZoom === "auto" ? "Fit" : "Auto"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm px-2.5"
                  aria-label="Larger cells"
                  disabled={typeof activeZoom === "number" && activeZoom >= 52}
                  onClick={() => zoomBy(4)}
                >
                  +
                </button>
              </div>
            </div>
          ) : null}

          {isMobile ? (
            <div ref={frameRef} className="mine-frame w-full min-w-0 overflow-auto">
              <div
                ref={boardRef}
                role="group"
                aria-label={`${difficulty.label} board`}
                className={`mine-board card p-2 ${flagging ? "ring-1 ring-[var(--accent)]" : ""}`}
                data-zoomed={activeZoom === "auto" ? undefined : ""}
                style={
                  {
                    "--cols": difficulty.width,
                    ...(typeof activeZoom === "number" ? { "--cell": `${activeZoom}px` } : {}),
                  } as CSSProperties
                }
                onContextMenu={(e) => e.preventDefault()}
              >
                {view.grid.map((row, y) =>
                  row.map((cell, x) => (
                    <MobileCellView
                      key={`${x}-${y}`}
                      x={x}
                      y={y}
                      revealed={cell.revealed}
                      flagged={cell.flagged}
                      isMine={cell.isMine}
                      adjacent={cell.adjacent}
                      status={view.status}
                      flagMode={flagging}
                      onReveal={onReveal}
                      onFlag={onFlag}
                    />
                  )),
                )}
              </div>
            </div>
          ) : (
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
                    <DesktopCellView
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
          )}

          {finished ? (
            <ResultCard
              won={view.status === "won"}
              elapsed={elapsed}
              verify={verify}
              boardKind={boardKind}
              difficultyId={difficulty.id}
              difficultyLabel={difficulty.label}
              seed={view.seed}
              dailyNumber={dailyBranding?.dailyNumber ?? null}
              dailyDate={view.date}
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
            <div className="flex flex-col gap-2 text-xs text-[var(--muted)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  {isMobile
                    ? flagging
                      ? "Flag mode — tap a covered cell to flag or unflag."
                      : `Tap to reveal · hold to flag · tap a number to chord${boardOverflows ? " · drag to pan" : ""}`
                    : "Left-click reveals · right-click flags · click a number to chord"}
                </span>
                <button type="button" className="btn btn-sm" onClick={newBoard}>
                  {boardKind === "daily" ? "Restart" : "New board"}
                </button>
              </div>
              <p>{IN_GAME_RANKED_HINT}</p>
            </div>
          )}
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="card px-4 py-3 text-sm">
          {boardKind === "daily" && dailyBranding && view.date ? (
            <DailyBranding
              dailyNumber={dailyBranding.dailyNumber}
              difficulty={difficulty}
              bestDurationMs={dailyBranding.bestDurationMs}
              date={view.date}
            />
          ) : (
            <>
              <p className="eyebrow">Classic</p>
              <p className="mt-1">
                {difficulty.label} · {difficulty.width}×{difficulty.height} · {difficulty.mines}{" "}
                mines
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Seed {view.seed}. Every new board is different.
              </p>
            </>
          )}
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
  boardKind,
  difficultyId,
  difficultyLabel,
  seed,
  dailyNumber,
  dailyDate,
  signedInAs,
  playAgainLabel,
  onPlayAgain,
  leaderboardHref,
}: {
  won: boolean;
  elapsed: number;
  verify: VerifyState;
  boardKind: BoardKind;
  difficultyId: string;
  difficultyLabel: string;
  seed: number;
  dailyNumber: number | null;
  dailyDate: string | null;
  signedInAs: string | null;
  playAgainLabel: string;
  onPlayAgain: () => void;
  leaderboardHref: string;
}) {
  const summary = won ? verifySummary(verify, boardKind) : null;
  const personalBest = won ? personalBestCopy(verify, boardKind) : null;
  const saved = verify.kind === "done" && Boolean(verify.result.stored);
  const dailyPlacement =
    verify.kind === "done" &&
    verify.result.dailyRank != null &&
    verify.result.dailyTotal != null
      ? { rank: verify.result.dailyRank, total: verify.result.dailyTotal }
      : null;

  return (
    <div className="card p-5" role="status">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={`text-xl font-semibold ${won ? "text-emerald-400" : "text-[var(--accent)]"}`}>
          {won ? "Cleared." : "Detonated."}
        </p>
        <p className="font-mono text-2xl tabular-nums">{formatDuration(elapsed)}</p>
      </div>

      {won && dailyPlacement ? (
        <p className="mt-3 font-mono text-3xl tabular-nums text-emerald-400">
          #{dailyPlacement.rank}
          <span className="text-lg text-[var(--muted)]"> / {dailyPlacement.total}</span>
        </p>
      ) : null}

      {summary ? (
        <p className={`mt-2 text-sm ${TONE_CLASS[summary.tone]}`}>{summary.text}</p>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]">You hit a mine. Shake it off and go again.</p>
      )}

      {personalBest ? (
        <p className={`mt-1 text-sm ${TONE_CLASS[personalBest.tone]}`}>{personalBest.text}</p>
      ) : null}

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
        <ShareResultButton
          boardKind={boardKind}
          difficultyId={difficultyId}
          difficultyLabel={difficultyLabel}
          won={won}
          durationMs={elapsed}
          seed={seed}
          dailyNumber={dailyNumber}
          dailyDate={dailyDate}
          dailyRank={verify.kind === "done" ? verify.result.dailyRank : null}
          dailyTotal={verify.kind === "done" ? verify.result.dailyTotal : null}
        />
        <Link href={leaderboardHref} className="btn">
          Leaderboard
        </Link>
      </div>
    </div>
  );
}

function DesktopCellView({
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

function MobileCellView({
  x,
  y,
  revealed,
  flagged,
  isMine,
  adjacent,
  status,
  flagMode,
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
  flagMode: boolean;
  onReveal: (x: number, y: number) => void;
  onFlag: (x: number, y: number) => void;
}) {
  const press = useRef<{
    id: number;
    x: number;
    y: number;
    timer: number | null;
    moved: boolean;
    held: boolean;
    touch: boolean;
  } | null>(null);
  const fromTouch = useRef(false);
  const finished = status === "won" || status === "lost";

  function act() {
    if (flagMode && !revealed) onFlag(x, y);
    else onReveal(x, y);
  }

  function clearTimer() {
    if (press.current?.timer != null) {
      window.clearTimeout(press.current.timer);
      press.current.timer = null;
    }
  }

  let content = "";
  let className =
    "mine-cell flex items-center justify-center rounded-[3px] font-mono font-semibold select-none";

  if (!revealed) {
    className += " bg-[#2b2622] shadow-[inset_0_-2px_0_rgba(0,0,0,0.35)]";
    if (!finished) className += " mine-cell-live";
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
      disabled={finished}
      onPointerDown={(event) => {
        fromTouch.current = event.pointerType !== "mouse";
        if (event.button !== 0 && !fromTouch.current) return;
        clearTimer();
        const touch = event.pointerType !== "mouse";
        const timer = touch
          ? window.setTimeout(() => {
              if (!press.current || press.current.moved || revealed) return;
              press.current.held = true;
              onFlag(x, y);
            }, 400)
          : null;
        press.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          timer,
          moved: false,
          held: false,
          touch,
        };
      }}
      onPointerMove={(event) => {
        const current = press.current;
        if (!current || current.id !== event.pointerId) return;
        const dx = event.clientX - current.x;
        const dy = event.clientY - current.y;
        if (dx * dx + dy * dy > 64) {
          current.moved = true;
          clearTimer();
        }
      }}
      onPointerUp={(event) => {
        const current = press.current;
        if (!current || current.id !== event.pointerId) return;
        clearTimer();
        press.current = null;
        if (!current.touch || current.moved || current.held) return;
        act();
      }}
      onPointerCancel={() => {
        clearTimer();
        press.current = null;
      }}
      onClick={() => {
        if (fromTouch.current) return;
        act();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        if (!fromTouch.current) onFlag(x, y);
      }}
    >
      {content}
    </button>
  );
}

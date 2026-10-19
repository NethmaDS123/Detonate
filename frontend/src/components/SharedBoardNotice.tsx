export function SharedBoardNotice({ boardKind }: { boardKind: "daily" | "random" }) {
  return (
    <div className="card border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)]" role="note">
      {boardKind === "daily" ? (
        <>
          Shared daily board — same grid as everyone else today (UTC). Only server-verified clears
          rank on today&apos;s daily leaderboard.
        </>
      ) : (
        <>
          Shared board — same seed as the link. Only server-verified clears rank on the all-time
          leaderboard.
        </>
      )}
    </div>
  );
}

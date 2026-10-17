export function SharedBoardNotice({ boardKind }: { boardKind: "daily" | "random" }) {
  return (
    <div className="card border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)]" role="note">
      {boardKind === "daily" ? (
        <>
          Shared daily board — same grid as everyone else today (UTC). Clear it faster to climb
          today&apos;s leaderboard.
        </>
      ) : (
        <>Shared board — same seed as the link. Clear it to beat their run.</>
      )}
    </div>
  );
}

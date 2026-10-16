import type { Metadata } from "next";
import Link from "next/link";
import { DifficultyTabs } from "@/components/DifficultyTabs";
import { Leaderboard } from "@/components/Leaderboard";
import { PageHeader } from "@/components/PageHeader";
import { resolveDifficulty } from "@/lib/difficulty";

export const metadata: Metadata = { title: "Leaderboard" };

function resolveBoard(value: string | string[] | undefined): "all" | "daily" {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "daily" ? "daily" : "all";
}

export default async function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  const params = await searchParams;
  const difficulty = resolveDifficulty(params.difficulty);
  const scope = resolveBoard(params.board);
  const daily = scope === "daily";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Leaderboard"
        title={daily ? "Today's daily" : "Fastest verified clears"}
        description={
          daily
            ? "Fastest verified clears on today's shared board only. Resets at midnight UTC."
            : "Every time here was replayed move by move on the server before it was ranked."
        }
      >
        <div className="flex flex-col gap-3">
          <nav aria-label="Leaderboard type" className="segmented w-fit">
            <Link
              href={`/leaderboard?difficulty=${difficulty.id}`}
              scroll={false}
              className="segmented-item"
              aria-current={daily ? undefined : "page"}
            >
              All-time
            </Link>
            <Link
              href={`/leaderboard?difficulty=${difficulty.id}&board=daily`}
              scroll={false}
              className="segmented-item"
              aria-current={daily ? "page" : undefined}
            >
              Today&apos;s daily
            </Link>
          </nav>
          <DifficultyTabs
            basePath="/leaderboard"
            activeId={difficulty.id}
            query={daily ? { board: "daily" } : undefined}
          />
        </div>
      </PageHeader>
      <Leaderboard difficultyId={difficulty.id} limit={50} scope={scope} variant="full" />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { DifficultyTabs } from "@/components/DifficultyTabs";
import { Leaderboard } from "@/components/Leaderboard";
import { PageHeader } from "@/components/PageHeader";
import { fetchDailyResult } from "@/lib/daily";
import { formatDailyStatsLine } from "@/lib/dailyBranding";
import { resolveDifficulty } from "@/lib/difficulty";
import { leaderboardSubtitle } from "@/lib/rankedPlay";

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
  let dailyNumber = 1;
  let dailyDescription = leaderboardSubtitle("daily");
  if (daily) {
    try {
      const info = await fetchDailyResult(difficulty.id);
      dailyNumber = info.dailyNumber;
      const board = info.boards.find((entry) => entry.difficultyId === difficulty.id);
      dailyDescription = `${formatDailyStatsLine(difficulty, board?.bestDurationMs)} ${leaderboardSubtitle("daily")}`;
    } catch {
      dailyDescription = `${formatDailyStatsLine(difficulty, null)} ${leaderboardSubtitle("daily")}`;
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={daily ? `Daily #${dailyNumber}` : "Leaderboard"}
        title={daily ? "Today's daily" : "Fastest verified clears"}
        description={daily ? dailyDescription : leaderboardSubtitle("all")}
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

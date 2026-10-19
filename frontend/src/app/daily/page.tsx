import type { Metadata } from "next";
import { DifficultyTabs } from "@/components/DifficultyTabs";
import { GameClient } from "@/components/GameClient";
import { PageHeader } from "@/components/PageHeader";
import { fetchDailyResult } from "@/lib/daily";
import { formatDailyStatsLine } from "@/lib/dailyBranding";
import { SharedBoardNotice } from "@/components/SharedBoardNotice";
import { resolveDifficulty } from "@/lib/difficulty";
import { isSharedBoardLink } from "@/lib/shareParams";
import { DAILY_PAGE_BLURB } from "@/lib/rankedPlay";

export const metadata: Metadata = { title: "Daily" };

export default async function DailyPage({ searchParams }: PageProps<"/daily">) {
  const params = await searchParams;
  const difficulty = resolveDifficulty(params.difficulty);
  const shared = isSharedBoardLink(params.from);
  let dailyNumber = 1;
  let description = DAILY_PAGE_BLURB;
  try {
    const daily = await fetchDailyResult(difficulty.id);
    dailyNumber = daily.dailyNumber;
    const board = daily.boards.find((entry) => entry.difficultyId === difficulty.id);
    description = `${formatDailyStatsLine(difficulty, board?.bestDurationMs)} ${DAILY_PAGE_BLURB}`;
  } catch {
    description = `${formatDailyStatsLine(difficulty, null)} ${DAILY_PAGE_BLURB}`;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={`Daily #${dailyNumber}`}
        title="Today's board"
        description={description}
      >
        <DifficultyTabs basePath="/daily" activeId={difficulty.id} />
      </PageHeader>
      {shared ? <SharedBoardNotice boardKind="daily" /> : null}
      <GameClient key={difficulty.id} boardKind="daily" difficultyId={difficulty.id} />
    </div>
  );
}

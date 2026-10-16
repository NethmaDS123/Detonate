import type { Metadata } from "next";
import { DifficultyTabs } from "@/components/DifficultyTabs";
import { GameClient } from "@/components/GameClient";
import { PageHeader } from "@/components/PageHeader";
import { resolveDifficulty } from "@/lib/difficulty";

export const metadata: Metadata = { title: "Daily" };

export default async function DailyPage({ searchParams }: PageProps<"/daily">) {
  const difficulty = resolveDifficulty((await searchParams).difficulty);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Daily"
        title="Today's board"
        description="Everyone gets the same board for each difficulty. It changes at midnight UTC."
      >
        <DifficultyTabs basePath="/daily" activeId={difficulty.id} />
      </PageHeader>
      <GameClient key={difficulty.id} boardKind="daily" difficultyId={difficulty.id} />
    </div>
  );
}

import type { Metadata } from "next";
import { DifficultyTabs } from "@/components/DifficultyTabs";
import { GameClient } from "@/components/GameClient";
import { PageHeader } from "@/components/PageHeader";
import { resolveDifficulty } from "@/lib/difficulty";
import { randomSeed } from "@/lib/seed";

export const metadata: Metadata = { title: "Classic" };

export default async function PlayPage({ searchParams }: PageProps<"/play">) {
  const difficulty = resolveDifficulty((await searchParams).difficulty);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Classic"
        title="Fresh board, every time"
        description="A new random board each game. Verified wins count toward the all-time leaderboard."
      >
        <DifficultyTabs basePath="/play" activeId={difficulty.id} />
      </PageHeader>
      <GameClient
        key={difficulty.id}
        boardKind="random"
        difficultyId={difficulty.id}
        initialSeed={randomSeed()}
      />
    </div>
  );
}

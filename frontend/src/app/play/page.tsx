import type { Metadata } from "next";
import { DifficultyTabs } from "@/components/DifficultyTabs";
import { GameClient } from "@/components/GameClient";
import { PageHeader } from "@/components/PageHeader";
import { SharedBoardNotice } from "@/components/SharedBoardNotice";
import { resolveDifficulty } from "@/lib/difficulty";
import { parseSeedParam, randomSeed } from "@/lib/seed";
import { isSharedBoardLink } from "@/lib/shareParams";
import { CLASSIC_PAGE_BLURB } from "@/lib/rankedPlay";

export const metadata: Metadata = { title: "Classic" };

export default async function PlayPage({ searchParams }: PageProps<"/play">) {
  const params = await searchParams;
  const difficulty = resolveDifficulty(params.difficulty);
  const shared = isSharedBoardLink(params.from);
  const seedFromLink = parseSeedParam(params.seed);
  const initialSeed = seedFromLink ?? randomSeed();
  const gameKey = `${difficulty.id}:${initialSeed}`;

  return (
    <div className="flex flex-col gap-5 sm:gap-8">
      <PageHeader
        dense
        eyebrow="Classic"
        title={shared && seedFromLink != null ? "Shared board" : "Fresh board, every time"}
        description={
          shared && seedFromLink != null
            ? `Shared seed from a link. ${CLASSIC_PAGE_BLURB}`
            : CLASSIC_PAGE_BLURB
        }
      >
        <DifficultyTabs basePath="/play" activeId={difficulty.id} />
      </PageHeader>
      {shared && seedFromLink != null ? <SharedBoardNotice boardKind="random" /> : null}
      <GameClient
        key={gameKey}
        boardKind="random"
        difficultyId={difficulty.id}
        initialSeed={initialSeed}
      />
    </div>
  );
}

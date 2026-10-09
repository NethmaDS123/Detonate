import { GameClient } from "@/components/GameClient";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
      <GameClient />
    </main>
  );
}

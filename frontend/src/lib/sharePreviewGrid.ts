import { DIFFICULTIES, Game } from "@detonate/engine";

export type PreviewCell = {
  revealed: boolean;
  isMine: boolean;
  adjacent: number;
  flagged: boolean;
};

export function buildPreviewGrid(difficultyId: string, seed: number): {
  width: number;
  height: number;
  cells: PreviewCell[];
} {
  const difficulty = DIFFICULTIES[difficultyId] ?? DIFFICULTIES.beginner;
  const game = new Game(difficulty.width, difficulty.height, difficulty.mines, seed);
  game.reveal(4, 4);

  const cells: PreviewCell[] = [];
  for (let y = 0; y < difficulty.height; y += 1) {
    for (let x = 0; x < difficulty.width; x += 1) {
      const cell = game.cell(x, y);
      cells.push({
        revealed: cell.revealed,
        isMine: cell.isMine,
        adjacent: cell.adjacent,
        flagged: cell.flagged,
      });
    }
  }

  return { width: difficulty.width, height: difficulty.height, cells };
}

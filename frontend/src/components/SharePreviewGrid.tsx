import { buildPreviewGrid } from "@/lib/sharePreviewGrid";

const NUMBER_COLOR: Record<number, string> = {
  1: "#6b9cff",
  2: "#6bcf8e",
  3: "#ff6b6b",
  4: "#9b7bff",
  5: "#c45c2a",
  6: "#4ec4c4",
  7: "#e8e8e8",
  8: "#b0b0b0",
};

export function SharePreviewGrid({
  difficultyId,
  seed,
  maxWidth = 280,
}: {
  difficultyId: string;
  seed: number;
  maxWidth?: number;
}) {
  const { width, height, cells } = buildPreviewGrid(difficultyId, seed);
  const cellSize = Math.max(6, Math.floor(maxWidth / width));
  const gridWidth = width * cellSize + (width - 1) * 2;

  return (
    <div
      className="inline-grid gap-[2px] rounded-md border border-[var(--line)] bg-[#0f0d0b] p-2"
      style={{
        gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
        gridAutoRows: `${cellSize}px`,
        width: gridWidth + 16,
      }}
      aria-hidden
    >
      {cells.map((cell, index) => {
        let bg = "#2b2622";
        let content = "";
        let color = "#eae6e1";
        if (cell.revealed) {
          bg = cell.isMine ? "#c45c2a" : "#14110f";
          if (!cell.isMine && cell.adjacent > 0) {
            content = String(cell.adjacent);
            color = NUMBER_COLOR[cell.adjacent] ?? color;
          }
        }
        return (
          <div
            key={index}
            className="flex items-center justify-center rounded-[2px] font-mono text-[10px] font-semibold leading-none"
            style={{ backgroundColor: bg, color, fontSize: Math.max(7, cellSize * 0.45) }}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

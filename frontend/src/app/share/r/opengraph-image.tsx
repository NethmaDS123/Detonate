import { ImageResponse } from "next/og";
import { DIFFICULTIES } from "@detonate/engine";
import {
  decodeSharePreview,
  sharePreviewDescription,
  sharePreviewTitle,
} from "@/lib/sharePreview";
import { buildPreviewGrid } from "@/lib/sharePreviewGrid";
import { formatDuration } from "@/lib/format";

export const runtime = "edge";
export const alt = "Detonate result";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

type ImageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OpengraphImage({ searchParams }: ImageProps) {
  const params = await searchParams;
  const preview = decodeSharePreview(params);

  if (!preview) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "#0f0d0b",
            color: "#eae6e1",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: 56, fontWeight: 700 }}>Detonate</div>
          <div style={{ fontSize: 28, color: "#9a9188", marginTop: 12 }}>Don&apos;t.</div>
        </div>
      ),
      { ...size },
    );
  }

  const title = sharePreviewTitle(preview);
  const description = sharePreviewDescription(preview);
  const difficulty = DIFFICULTIES[preview.difficultyId] ?? DIFFICULTIES.beginner;
  const { width, height, cells } = buildPreviewGrid(preview.difficultyId, preview.seed);
  const cellSize = Math.min(22, Math.floor(320 / width));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          background: "#0f0d0b",
          color: "#eae6e1",
          fontFamily: "system-ui, sans-serif",
          padding: 56,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            paddingRight: 40,
          }}
        >
          <div style={{ fontSize: 22, letterSpacing: 4, color: "#c45c2a", fontWeight: 600 }}>
            DETONATE
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              lineHeight: 1.15,
              marginTop: 16,
              maxWidth: 560,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 52, fontWeight: 700, marginTop: 20, fontFamily: "monospace" }}>
            {formatDuration(preview.durationMs)}
          </div>
          <div style={{ fontSize: 22, color: "#9a9188", marginTop: 20, maxWidth: 520 }}>
            {description}
          </div>
          <div style={{ fontSize: 18, color: "#6bcf8e", marginTop: 28 }}>
            {difficulty.label} · {difficulty.width}×{difficulty.height} · {difficulty.mines} mines
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              padding: 12,
              background: "#1a1612",
              borderRadius: 8,
              border: "1px solid #3a332d",
            }}
          >
            {Array.from({ length: height }, (_, y) => (
              <div key={y} style={{ display: "flex", gap: 2 }}>
                {cells.slice(y * width, (y + 1) * width).map((cell, x) => {
                  let bg = "#2b2622";
                  let text = "";
                  let color = "#eae6e1";
                  if (cell.revealed) {
                    bg = cell.isMine ? "#c45c2a" : "#14110f";
                    if (!cell.isMine && cell.adjacent > 0) {
                      text = String(cell.adjacent);
                      color = NUMBER_COLOR[cell.adjacent] ?? color;
                    }
                  }
                  return (
                    <div
                      key={`${x}-${y}`}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        background: bg,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: Math.max(8, cellSize * 0.45),
                        fontWeight: 700,
                        color,
                        fontFamily: "monospace",
                      }}
                    >
                      {text}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

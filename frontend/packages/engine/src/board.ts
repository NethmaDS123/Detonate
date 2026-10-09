import { XorShift32 } from "./rng";
import type { Cell } from "./types";

export function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

export function neighbors(
  x: number,
  y: number,
  width: number,
  height: number,
): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(nx, ny, width, height)) {
        cells.push([nx, ny]);
      }
    }
  }
  return cells;
}

export function openingExcluded(
  x: number,
  y: number,
  width: number,
  height: number,
): Set<string> {
  const excluded = new Set<string>([key(x, y)]);
  for (const [nx, ny] of neighbors(x, y, width, height)) {
    excluded.add(key(nx, ny));
  }
  return excluded;
}

export function key(x: number, y: number): string {
  return `${x},${y}`;
}

export function emptyGrid(width: number, height: number): Cell[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      isMine: false,
      adjacent: 0,
      revealed: false,
      flagged: false,
    })),
  );
}

export function placeMines(
  grid: Cell[][],
  mineCount: number,
  seed: number,
  excluded: Set<string>,
  safeCell: [number, number],
): void {
  const height = grid.length;
  const width = height ? grid[0].length : 0;
  let candidates: Array<[number, number]> = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!excluded.has(key(x, y))) {
        candidates.push([x, y]);
      }
    }
  }
  if (candidates.length < mineCount) {
    candidates = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x !== safeCell[0] || y !== safeCell[1]) {
          candidates.push([x, y]);
        }
      }
    }
  }
  const rng = new XorShift32(seed);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = rng.randInt(i + 1);
    const tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
  }
  for (const [x, y] of candidates.slice(0, mineCount)) {
    grid[y][x].isMine = true;
  }
  fillAdjacent(grid);
}

function fillAdjacent(grid: Cell[][]): void {
  const height = grid.length;
  const width = height ? grid[0].length : 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].isMine) {
        grid[y][x].adjacent = 0;
        continue;
      }
      grid[y][x].adjacent = neighbors(x, y, width, height).filter(
        ([nx, ny]) => grid[ny][nx].isMine,
      ).length;
    }
  }
}

export function minePositions(grid: Cell[][]): number[][] {
  const positions: number[][] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x].isMine) {
        positions.push([x, y]);
      }
    }
  }
  positions.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return positions;
}

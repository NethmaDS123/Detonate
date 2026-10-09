import {
  emptyGrid,
  inBounds,
  minePositions,
  neighbors,
  openingExcluded,
  placeMines,
} from "./board";
import type { Cell, Event, Status } from "./types";

export class Game {
  readonly width: number;
  readonly height: number;
  readonly mines: number;
  readonly seed: number;
  grid: Cell[][];
  status: Status = "ready";
  minesPlaced = false;

  constructor(width: number, height: number, mines: number, seed: number) {
    if (width < 1 || height < 1) {
      throw new Error("board must be at least 1x1");
    }
    if (mines < 1 || mines >= width * height) {
      throw new Error("mine count must leave at least one safe cell");
    }
    this.width = width;
    this.height = height;
    this.mines = mines;
    this.seed = seed >>> 0;
    this.grid = emptyGrid(width, height);
  }

  cell(x: number, y: number): Cell {
    return this.grid[y][x];
  }

  apply(event: Event): Status {
    if (event.type === "reveal") this.reveal(event.x, event.y);
    else if (event.type === "flag") this.flag(event.x, event.y);
    else if (event.type === "chord") this.chord(event.x, event.y);
    else throw new Error(`unknown event type: ${event.type}`);
    return this.status;
  }

  reveal(x: number, y: number): void {
    if (this.status === "won" || this.status === "lost") return;
    if (!inBounds(x, y, this.width, this.height)) return;
    const cell = this.cell(x, y);
    if (cell.flagged || cell.revealed) return;
    this.ensureMines(x, y);
    if (cell.isMine) {
      cell.revealed = true;
      this.status = "lost";
      this.revealMines();
      return;
    }
    this.flood(x, y);
    this.checkWin();
  }

  flag(x: number, y: number): void {
    if (this.status === "won" || this.status === "lost") return;
    if (!inBounds(x, y, this.width, this.height)) return;
    const cell = this.cell(x, y);
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
  }

  chord(x: number, y: number): void {
    if (this.status === "won" || this.status === "lost") return;
    if (!inBounds(x, y, this.width, this.height)) return;
    const cell = this.cell(x, y);
    if (!cell.revealed || cell.isMine || cell.adjacent === 0) return;
    const flagged = neighbors(x, y, this.width, this.height).filter(
      ([nx, ny]) => this.cell(nx, ny).flagged,
    ).length;
    if (flagged !== cell.adjacent) return;
    let hitMine = false;
    for (const [nx, ny] of neighbors(x, y, this.width, this.height)) {
      const ncell = this.cell(nx, ny);
      if (ncell.flagged || ncell.revealed) continue;
      if (ncell.isMine) {
        ncell.revealed = true;
        hitMine = true;
      } else {
        this.flood(nx, ny);
      }
    }
    if (hitMine) {
      this.status = "lost";
      this.revealMines();
      return;
    }
    this.checkWin();
  }

  flagsPlaced(): number {
    return this.grid.flat().filter((c) => c.flagged).length;
  }

  remainingMines(): number {
    return this.mines - this.flagsPlaced();
  }

  snapshot() {
    return {
      width: this.width,
      height: this.height,
      mines: this.mines,
      seed: this.seed,
      status: this.status,
      minesPlaced: this.minesPlaced,
      minePositions: this.minesPlaced ? minePositions(this.grid) : [],
      revealed: this.grid.map((row) => row.map((c) => c.revealed)),
      flagged: this.grid.map((row) => row.map((c) => c.flagged)),
      adjacent: this.grid.map((row) => row.map((c) => c.adjacent)),
      isMine: this.grid.map((row) => row.map((c) => c.isMine)),
    };
  }

  private ensureMines(x: number, y: number): void {
    if (this.minesPlaced) return;
    const excluded = openingExcluded(x, y, this.width, this.height);
    placeMines(this.grid, this.mines, this.seed, excluded, [x, y]);
    this.minesPlaced = true;
    this.status = "in_progress";
  }

  private flood(x: number, y: number): void {
    const stack: Array<[number, number]> = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      const cell = this.cell(cx, cy);
      if (cell.revealed || cell.flagged || cell.isMine) continue;
      cell.revealed = true;
      if (cell.adjacent === 0) {
        stack.push(...neighbors(cx, cy, this.width, this.height));
      }
    }
  }

  private checkWin(): void {
    for (const row of this.grid) {
      for (const cell of row) {
        if (!cell.isMine && !cell.revealed) return;
      }
    }
    this.status = "won";
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell.isMine) cell.flagged = true;
      }
    }
  }

  private revealMines(): void {
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell.isMine) cell.revealed = true;
      }
    }
  }
}

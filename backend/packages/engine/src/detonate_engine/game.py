from __future__ import annotations

from detonate_engine.board import (
    empty_grid,
    in_bounds,
    mine_positions,
    neighbors,
    opening_excluded,
    place_mines,
)
from detonate_engine.types import Cell, Event, Status


class Game:
    def __init__(self, width: int, height: int, mines: int, seed: int) -> None:
        if width < 1 or height < 1:
            raise ValueError("board must be at least 1x1")
        if mines < 1 or mines >= width * height:
            raise ValueError("mine count must leave at least one safe cell")
        self.width = width
        self.height = height
        self.mines = mines
        self.seed = seed & 0xFFFFFFFF
        self.grid: list[list[Cell]] = empty_grid(width, height)
        self.status = Status.READY
        self.mines_placed = False

    def cell(self, x: int, y: int) -> Cell:
        return self.grid[y][x]

    def apply(self, event: Event) -> Status:
        if event.type == "reveal":
            self.reveal(event.x, event.y)
        elif event.type == "flag":
            self.flag(event.x, event.y)
        elif event.type == "chord":
            self.chord(event.x, event.y)
        else:
            raise ValueError(f"unknown event type: {event.type}")
        return self.status

    def reveal(self, x: int, y: int) -> None:
        if self.status in (Status.WON, Status.LOST):
            return
        if not in_bounds(x, y, self.width, self.height):
            return
        cell = self.cell(x, y)
        if cell.flagged or cell.revealed:
            return
        self._ensure_mines(x, y)
        if cell.is_mine:
            cell.revealed = True
            self.status = Status.LOST
            self._reveal_mines()
            return
        self._flood(x, y)
        self._check_win()

    def flag(self, x: int, y: int) -> None:
        if self.status in (Status.WON, Status.LOST):
            return
        if not in_bounds(x, y, self.width, self.height):
            return
        cell = self.cell(x, y)
        if cell.revealed:
            return
        cell.flagged = not cell.flagged

    def chord(self, x: int, y: int) -> None:
        if self.status in (Status.WON, Status.LOST):
            return
        if not in_bounds(x, y, self.width, self.height):
            return
        cell = self.cell(x, y)
        if not cell.revealed or cell.is_mine or cell.adjacent == 0:
            return
        flagged = sum(
            1
            for nx, ny in neighbors(x, y, self.width, self.height)
            if self.cell(nx, ny).flagged
        )
        if flagged != cell.adjacent:
            return
        hit_mine = False
        for nx, ny in neighbors(x, y, self.width, self.height):
            ncell = self.cell(nx, ny)
            if ncell.flagged or ncell.revealed:
                continue
            if ncell.is_mine:
                ncell.revealed = True
                hit_mine = True
            else:
                self._flood(nx, ny)
        if hit_mine:
            self.status = Status.LOST
            self._reveal_mines()
            return
        self._check_win()

    def flags_placed(self) -> int:
        return sum(1 for row in self.grid for cell in row if cell.flagged)

    def remaining_mines(self) -> int:
        return self.mines - self.flags_placed()

    def snapshot(self) -> dict:
        return {
            "width": self.width,
            "height": self.height,
            "mines": self.mines,
            "seed": self.seed,
            "status": self.status.value,
            "minesPlaced": self.mines_placed,
            "minePositions": mine_positions(self.grid) if self.mines_placed else [],
            "revealed": [[cell.revealed for cell in row] for row in self.grid],
            "flagged": [[cell.flagged for cell in row] for row in self.grid],
            "adjacent": [[cell.adjacent for cell in row] for row in self.grid],
            "isMine": [[cell.is_mine for cell in row] for row in self.grid],
        }

    def _ensure_mines(self, x: int, y: int) -> None:
        if self.mines_placed:
            return
        excluded = opening_excluded(x, y, self.width, self.height)
        place_mines(self.grid, self.mines, self.seed, excluded, (x, y))
        self.mines_placed = True
        self.status = Status.IN_PROGRESS

    def _flood(self, x: int, y: int) -> None:
        stack = [(x, y)]
        while stack:
            cx, cy = stack.pop()
            cell = self.cell(cx, cy)
            if cell.revealed or cell.flagged or cell.is_mine:
                continue
            cell.revealed = True
            if cell.adjacent == 0:
                stack.extend(neighbors(cx, cy, self.width, self.height))

    def _check_win(self) -> None:
        for row in self.grid:
            for cell in row:
                if not cell.is_mine and not cell.revealed:
                    return
        self.status = Status.WON
        for row in self.grid:
            for cell in row:
                if cell.is_mine:
                    cell.flagged = True

    def _reveal_mines(self) -> None:
        for row in self.grid:
            for cell in row:
                if cell.is_mine:
                    cell.revealed = True

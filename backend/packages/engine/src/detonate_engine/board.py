from __future__ import annotations

from detonate_engine.rng import XorShift32
from detonate_engine.types import Cell


def in_bounds(x: int, y: int, width: int, height: int) -> bool:
    return 0 <= x < width and 0 <= y < height


def neighbors(x: int, y: int, width: int, height: int) -> list[tuple[int, int]]:
    cells: list[tuple[int, int]] = []
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            nx, ny = x + dx, y + dy
            if in_bounds(nx, ny, width, height):
                cells.append((nx, ny))
    return cells


def opening_excluded(x: int, y: int, width: int, height: int) -> set[tuple[int, int]]:
    excluded = {(x, y)}
    excluded.update(neighbors(x, y, width, height))
    return excluded


def empty_grid(width: int, height: int) -> list[list[Cell]]:
    return [[Cell() for _ in range(width)] for _ in range(height)]


def place_mines(
    grid: list[list[Cell]],
    mine_count: int,
    seed: int,
    excluded: set[tuple[int, int]],
    safe_cell: tuple[int, int],
) -> None:
    height = len(grid)
    width = len(grid[0]) if height else 0
    candidates = [
        (x, y)
        for y in range(height)
        for x in range(width)
        if (x, y) not in excluded
    ]
    if len(candidates) < mine_count:
        candidates = [
            (x, y)
            for y in range(height)
            for x in range(width)
            if (x, y) != safe_cell
        ]
    rng = XorShift32(seed)
    for i in range(len(candidates) - 1, 0, -1):
        j = rng.rand_int(i + 1)
        candidates[i], candidates[j] = candidates[j], candidates[i]
    for x, y in candidates[:mine_count]:
        grid[y][x].is_mine = True
    _fill_adjacent(grid)


def _fill_adjacent(grid: list[list[Cell]]) -> None:
    height = len(grid)
    width = len(grid[0]) if height else 0
    for y in range(height):
        for x in range(width):
            if grid[y][x].is_mine:
                grid[y][x].adjacent = 0
                continue
            grid[y][x].adjacent = sum(
                1 for nx, ny in neighbors(x, y, width, height) if grid[ny][nx].is_mine
            )


def mine_positions(grid: list[list[Cell]]) -> list[list[int]]:
    positions: list[list[int]] = []
    for y, row in enumerate(grid):
        for x, cell in enumerate(row):
            if cell.is_mine:
                positions.append([x, y])
    positions.sort()
    return positions

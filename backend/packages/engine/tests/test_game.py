from detonate_engine.game import Game
from detonate_engine.types import Event, Status


def test_first_click_is_never_a_mine() -> None:
    for seed in range(50):
        game = Game(9, 9, 10, seed)
        game.reveal(4, 4)
        assert not game.cell(4, 4).is_mine
        assert game.status != Status.LOST


def test_first_click_opening_is_zero() -> None:
    game = Game(9, 9, 10, 7)
    game.reveal(0, 0)
    assert game.cell(0, 0).adjacent == 0
    assert game.cell(0, 0).revealed


def test_flag_toggles_and_does_not_reveal() -> None:
    game = Game(9, 9, 10, 1)
    game.flag(0, 0)
    assert game.cell(0, 0).flagged
    game.reveal(0, 0)
    assert not game.cell(0, 0).revealed
    game.flag(0, 0)
    game.reveal(0, 0)
    assert game.cell(0, 0).revealed


def test_cannot_win_if_a_mine_was_revealed() -> None:
    game = Game(9, 9, 10, 99)
    game.reveal(0, 0)
    mine = next(
        (x, y)
        for y in range(9)
        for x in range(9)
        if game.cell(x, y).is_mine
    )
    game.reveal(*mine)
    assert game.status == Status.LOST
    assert game.cell(*mine).revealed


def test_win_flags_remaining_mines() -> None:
    game = Game(9, 9, 10, 3)
    game.reveal(4, 4)
    for y in range(9):
        for x in range(9):
            if not game.cell(x, y).is_mine and not game.cell(x, y).revealed:
                game.reveal(x, y)
    assert game.status == Status.WON
    assert game.flags_placed() == 10


def test_chord_opens_when_flags_match() -> None:
    game = Game(9, 9, 10, 11)
    game.apply(Event("reveal", 0, 0))
    numbered = next(
        (x, y)
        for y in range(9)
        for x in range(9)
        if game.cell(x, y).revealed and game.cell(x, y).adjacent > 0
    )
    x, y = numbered
    cell = game.cell(x, y)
    mines = [
        (nx, ny)
        for nx, ny in (
            (x + dx, y + dy)
            for dy in (-1, 0, 1)
            for dx in (-1, 0, 1)
            if not (dx == 0 and dy == 0)
        )
        if 0 <= nx < 9 and 0 <= ny < 9 and game.cell(nx, ny).is_mine
    ]
    assert len(mines) == cell.adjacent
    for mx, my in mines:
        if not game.cell(mx, my).flagged:
            game.flag(mx, my)
    game.chord(x, y)
    for nx in range(x - 1, x + 2):
        for ny in range(y - 1, y + 2):
            if 0 <= nx < 9 and 0 <= ny < 9 and not game.cell(nx, ny).is_mine:
                assert game.cell(nx, ny).revealed or game.cell(nx, ny).flagged

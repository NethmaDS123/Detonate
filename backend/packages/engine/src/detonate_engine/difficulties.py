from dataclasses import dataclass


@dataclass(frozen=True)
class Difficulty:
    id: str
    label: str
    width: int
    height: int
    mines: int


DIFFICULTIES: dict[str, Difficulty] = {
    "beginner": Difficulty("beginner", "Beginner", 9, 9, 10),
    "intermediate": Difficulty("intermediate", "Intermediate", 16, 16, 40),
    "expert": Difficulty("expert", "Expert", 30, 16, 99),
}

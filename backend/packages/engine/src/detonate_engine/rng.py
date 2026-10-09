"""Portable xorshift32. Must match packages/engine-ts/src/rng.ts exactly."""


class XorShift32:
    def __init__(self, seed: int) -> None:
        state = seed & 0xFFFFFFFF
        self.state = 2463534242 if state == 0 else state

    def next_u32(self) -> int:
        x = self.state
        x = (x ^ ((x << 13) & 0xFFFFFFFF)) & 0xFFFFFFFF
        x = (x ^ (x >> 17)) & 0xFFFFFFFF
        x = (x ^ ((x << 5) & 0xFFFFFFFF)) & 0xFFFFFFFF
        self.state = x
        return x

    def rand_int(self, n: int) -> int:
        if n <= 0:
            raise ValueError("n must be positive")
        return self.next_u32() % n

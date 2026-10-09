from detonate_engine.rng import XorShift32


def test_xorshift_is_deterministic() -> None:
    a = XorShift32(42)
    b = XorShift32(42)
    assert [a.next_u32() for _ in range(32)] == [b.next_u32() for _ in range(32)]


def test_zero_seed_is_nonzero_state() -> None:
    rng = XorShift32(0)
    assert rng.next_u32() != 0

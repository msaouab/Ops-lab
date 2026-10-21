from next_warmer_day import *  # noqa: F401,F403

import time


def test_examples():
    assert next_warmer([73, 74, 75, 71, 69, 72, 76, 73]) == [1, 1, 4, 2, 1, 1, 0, 0]
    assert next_warmer([30, 40, 50, 60]) == [1, 1, 1, 0]
    assert next_warmer([]) == []
    assert next_warmer([5, 5, 5]) == [0, 0, 0]


def test_linear_time():
    big = list(range(100_000, 0, -1)) + [200_000]
    t = time.perf_counter()
    out = next_warmer(big)
    assert time.perf_counter() - t < 1.5
    assert out[0] == 100_000 and out[-1] == 0

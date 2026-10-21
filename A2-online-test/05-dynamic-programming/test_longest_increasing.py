from longest_increasing import *  # noqa: F401,F403

import random
import time


def test_lis():
    assert lis_length([10, 9, 2, 5, 3, 7, 101, 18]) == 4
    assert lis_length([0, 1, 0, 3, 2, 3]) == 4
    assert lis_length([7, 7, 7]) == 1
    assert lis_length([]) == 0


def test_speed():
    rnd = random.Random(42)
    nums = [rnd.randint(0, 10**9) for _ in range(50_000)]
    t = time.perf_counter()
    lis_length(nums)
    assert time.perf_counter() - t < 2

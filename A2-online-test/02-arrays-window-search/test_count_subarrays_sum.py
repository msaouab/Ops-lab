from count_subarrays_sum import *  # noqa: F401,F403

import time


def test_examples():
    assert count_subarrays([1, 1, 1], 2) == 2
    assert count_subarrays([1, 2, 3], 3) == 2
    assert count_subarrays([1, -1, 0], 0) == 3
    assert count_subarrays([], 0) == 0


def test_linear():
    nums = [1] * 200_000
    t = time.perf_counter()
    assert count_subarrays(nums, 199_999) == 2
    assert time.perf_counter() - t < 1.5

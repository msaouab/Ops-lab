from best_k_day_sales import *  # noqa: F401,F403

def test_examples():
    assert best_window([1, 12, -5, -6, 50, 3], 4) == 1
    assert best_window([5, 5, 5], 2) == 0
    assert best_window([1, 2], 3) == -1
    assert best_window([3, 1, 4], 1) == 2
    assert best_window([], 0) == -1

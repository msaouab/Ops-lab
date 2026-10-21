from pair_for_budget import *  # noqa: F401,F403

def test_examples():
    assert pair_for_budget([2, 7, 11, 15], 9) == (0, 1)
    assert pair_for_budget([3, 2, 4], 6) == (1, 2)
    assert pair_for_budget([3, 3], 6) == (0, 1)


def test_none_and_order():
    assert pair_for_budget([1, 2, 3], 100) is None
    assert pair_for_budget([], 1) is None
    assert pair_for_budget([1, 5, 1, 5], 6) == (0, 1)

from coupon_combos import *  # noqa: F401,F403


def norm(result):
    return sorted(tuple(r) for r in result)


def test_examples():
    assert norm(coupon_combos([2, 3, 6, 7], 7)) == [(2, 2, 3), (7,)]
    assert norm(coupon_combos([2, 3, 5], 8)) == [(2, 2, 2, 2), (2, 3, 3), (3, 5)]


def test_edges():
    assert norm(coupon_combos([2], 1)) == []
    assert norm(coupon_combos([5, 1], 3)) == [(1, 1, 1)]
    for combo in coupon_combos([3, 1, 2], 6):
        assert combo == sorted(combo) and sum(combo) == 6
    assert len(coupon_combos([2, 3, 5, 7], 30)) == len(set(map(tuple, coupon_combos([2, 3, 5, 7], 30))))

from k_closest_depots import *  # noqa: F401,F403

def test_closest():
    assert k_closest([(1, 3), (-2, 2)], 1) == [(-2, 2)]
    assert k_closest([(3, 3), (5, -1), (-2, 4)], 2) == [(3, 3), (-2, 4)]
    assert k_closest([(1, 0), (0, 1), (-1, 0)], 2) == [(-1, 0), (0, 1)]
    assert k_closest([], 3) == []

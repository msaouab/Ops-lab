from fastest_delivery import *  # noqa: F401,F403

def test_fastest():
    roads = [(1, 2, 7), (1, 3, 9), (1, 6, 14), (2, 3, 10), (2, 4, 15),
             (3, 4, 11), (3, 6, 2), (4, 5, 6), (6, 5, 9)]
    assert fastest(6, roads, 1, 5) == 20
    assert fastest(6, roads, 1, 4) == 20
    assert fastest(6, roads, 5, 1) == -1
    assert fastest(3, [(1, 2, 5)], 1, 1) == 0

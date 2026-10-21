from truck_loading import *  # noqa: F401,F403

def test_load():
    assert best_load([(1, 1), (3, 4), (4, 5), (5, 7)], 7) == 9
    assert best_load([(10, 60), (20, 100), (30, 120)], 50) == 220
    assert best_load([(5, 10)], 4) == 0
    assert best_load([], 10) == 0

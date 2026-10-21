from longest_streak import *  # noqa: F401,F403

def test_examples():
    assert longest_streak([100, 4, 200, 1, 3, 2]) == 4
    assert longest_streak([0, 3, 7, 2, 5, 8, 4, 6, 0, 1]) == 9
    assert longest_streak([]) == 0
    assert longest_streak([1, 1, 1]) == 1
    assert longest_streak([-2, -1, 5]) == 2

from rob_houses import *  # noqa: F401,F403

def test_line():
    assert best_non_adjacent([1, 2, 3, 1]) == 4
    assert best_non_adjacent([2, 7, 9, 3, 1]) == 12
    assert best_non_adjacent([]) == 0


def test_circle():
    assert best_non_adjacent_circle([2, 3, 2]) == 3
    assert best_non_adjacent_circle([1, 2, 3, 1]) == 4
    assert best_non_adjacent_circle([7]) == 7

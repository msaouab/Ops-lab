from rooms_needed import *  # noqa: F401,F403

def test_rooms():
    assert rooms_needed([(0, 30), (5, 10), (15, 20)]) == 2
    assert rooms_needed([(7, 10), (2, 4)]) == 1
    assert rooms_needed([(9, 10), (10, 11)]) == 1
    assert rooms_needed([(1, 5), (2, 6), (3, 7)]) == 3
    assert rooms_needed([]) == 0

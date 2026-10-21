from cheapest_climb import *  # noqa: F401,F403

def test_climb():
    assert cheapest_climb([10, 15, 20]) == 15
    assert cheapest_climb([1, 100, 1, 1, 1, 100, 1, 1, 100, 1]) == 6
    assert cheapest_climb([5, 7]) == 5

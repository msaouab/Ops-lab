from fewest_coins import *  # noqa: F401,F403

def test_fewest():
    assert fewest_coins([1, 2, 5], 11) == 3
    assert fewest_coins([2], 3) == -1
    assert fewest_coins([1, 3, 4], 6) == 2
    assert fewest_coins([1], 0) == 0
    assert fewest_coins([186, 419, 83, 408], 6249) == 20


def test_ways():
    assert number_of_ways([1, 2, 5], 5) == 4
    assert number_of_ways([2], 3) == 0
    assert number_of_ways([10], 10) == 1
    assert number_of_ways([3, 5], 0) == 1

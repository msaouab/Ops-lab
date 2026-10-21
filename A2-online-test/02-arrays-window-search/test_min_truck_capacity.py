from min_truck_capacity import *  # noqa: F401,F403

def test_examples():
    assert min_capacity([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5) == 15
    assert min_capacity([3, 2, 2, 4, 1, 4], 3) == 6
    assert min_capacity([1, 2, 3, 1, 1], 4) == 3
    assert min_capacity([10], 1) == 10
    assert min_capacity([5, 5, 5], 10) == 5

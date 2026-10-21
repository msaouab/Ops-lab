from merge_bookings import *  # noqa: F401,F403

def test_merge():
    assert merge_bookings([[1, 3], [2, 6], [8, 10], [15, 18]]) == [[1, 6], [8, 10], [15, 18]]
    assert merge_bookings([[1, 4], [4, 5]]) == [[1, 5]]
    assert merge_bookings([[5, 6], [1, 2]]) == [[1, 2], [5, 6]]
    assert merge_bookings([[1, 10], [2, 3]]) == [[1, 10]]
    assert merge_bookings([]) == []

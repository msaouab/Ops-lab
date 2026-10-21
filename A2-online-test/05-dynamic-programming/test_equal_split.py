from equal_split import *  # noqa: F401,F403

def test_split():
    assert can_split_equal([1, 5, 11, 5]) is True
    assert can_split_equal([1, 2, 3, 5]) is False
    assert can_split_equal([2, 2]) is True
    assert can_split_equal([100]) is False
    assert can_split_equal([3, 3, 3, 4, 5]) is True

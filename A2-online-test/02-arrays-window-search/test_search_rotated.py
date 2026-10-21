from search_rotated import *  # noqa: F401,F403

def test_examples():
    nums = [4, 5, 6, 7, 0, 1, 2]
    assert search_rotated(nums, 0) == 4
    assert search_rotated(nums, 3) == -1
    assert all(search_rotated(nums, v) == i for i, v in enumerate(nums))
    assert search_rotated([1], 0) == -1
    assert search_rotated([], 5) == -1
    assert search_rotated([3, 1], 1) == 1

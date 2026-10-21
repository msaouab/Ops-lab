from merge_k_sorted import *  # noqa: F401,F403

def test_merge_k():
    assert merge_k([[1, 4, 5], [1, 3, 4], [2, 6]]) == [1, 1, 2, 3, 4, 4, 5, 6]
    assert merge_k([]) == [] and merge_k([[], []]) == []
    assert merge_k([[2], [1]]) == [1, 2]

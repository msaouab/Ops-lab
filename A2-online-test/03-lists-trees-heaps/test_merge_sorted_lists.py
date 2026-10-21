from merge_sorted_lists import *  # noqa: F401,F403

from structures import to_linked, to_list


def test_merge():
    assert to_list(merge(to_linked([1, 2, 4]), to_linked([1, 3, 4]))) == [1, 1, 2, 3, 4, 4]
    assert to_list(merge(None, to_linked([0]))) == [0]
    assert merge(None, None) is None

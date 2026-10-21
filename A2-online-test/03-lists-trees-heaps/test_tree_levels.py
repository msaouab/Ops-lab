from tree_levels import *  # noqa: F401,F403

from structures import to_tree


def test_levels():
    t = to_tree([3, 9, 20, None, None, 15, 7])
    assert levels(t) == [[3], [9, 20], [15, 7]]
    assert max_depth(t) == 3
    assert levels(None) == [] and max_depth(None) == 0

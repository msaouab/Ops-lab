from valid_bst import *  # noqa: F401,F403

from structures import to_tree


def test_bst():
    assert is_bst(to_tree([2, 1, 3])) is True
    assert is_bst(to_tree([5, 1, 4, None, None, 3, 6])) is False
    assert is_bst(to_tree([5, 4, 6, None, None, 3, 7])) is False
    assert is_bst(to_tree([2, 2])) is False
    assert is_bst(None) is True

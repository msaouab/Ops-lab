from same_tree import *  # noqa: F401,F403

from structures import to_tree


def test_same():
    assert same_tree(to_tree([1, 2, 3]), to_tree([1, 2, 3])) is True
    assert same_tree(to_tree([1, 2]), to_tree([1, None, 2])) is False
    assert same_tree(to_tree([1, 2, 1]), to_tree([1, 1, 2])) is False
    assert same_tree(None, None) is True
    assert same_tree(to_tree([1]), None) is False

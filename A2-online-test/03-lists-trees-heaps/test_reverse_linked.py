from reverse_linked import *  # noqa: F401,F403

from structures import to_linked, to_list


def test_reverse():
    assert to_list(reverse(to_linked([1, 2, 3, 4]))) == [4, 3, 2, 1]
    assert to_list(reverse(to_linked([7]))) == [7]
    assert reverse(None) is None

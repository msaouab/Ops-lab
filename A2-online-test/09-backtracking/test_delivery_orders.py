from itertools import permutations

from delivery_orders import *  # noqa: F401,F403


def norm(result):
    return sorted(tuple(r) for r in result)


def test_examples():
    assert norm(delivery_orders([1, 2, 3])) == sorted(permutations([1, 2, 3]))
    assert norm(delivery_orders([7])) == [(7,)]


def test_edges():
    assert norm(delivery_orders([])) == [()]
    result = delivery_orders([1, 2, 3, 4, 5, 6])
    assert len(result) == 720
    assert len(set(map(tuple, result))) == 720  # no duplicates

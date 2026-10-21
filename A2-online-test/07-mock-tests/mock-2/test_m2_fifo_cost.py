from m2_fifo_cost import *  # noqa: F401,F403

import pytest


def test_m2_q1():
    assert fifo_cost([(10, 5.0), (5, 7.0)], [8, 4]) == 64.0
    assert fifo_cost([(3, 1.5)], [3]) == 4.5
    assert fifo_cost([(2, 10), (2, 20), (2, 30)], [5]) == 90.0
    assert fifo_cost([], []) == 0.0
    with pytest.raises(ValueError):
        fifo_cost([(1, 1.0)], [2])

from running_median import *  # noqa: F401,F403

import pytest


def test_median():
    m = MedianTracker()
    with pytest.raises(ValueError):
        m.median()
    out = []
    for x in [5, 15, 1, 3, 8]:
        m.add(x)
        out.append(m.median())
    assert out == [5.0, 10.0, 5.0, 4.0, 5.0]

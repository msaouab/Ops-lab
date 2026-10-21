from first_failing_build import *  # noqa: F401,F403

import math


def make(first_bad):
    calls = []

    def f(v):
        calls.append(v)
        return first_bad is not None and v >= first_bad
    return f, calls


def test_examples():
    for n, bad in [(10, 4), (1, 1), (1_000_000, 777_777), (5, None), (2, 2)]:
        f, calls = make(bad)
        assert first_failing(n, f) == (bad if bad else -1)
        assert len(calls) <= math.ceil(math.log2(n)) + 2

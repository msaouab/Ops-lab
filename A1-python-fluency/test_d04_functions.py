from d04_functions import *  # noqa: F401,F403

import inspect
import itertools
import time

import pytest


def test_counter_independent():
    a, b = make_counter(), make_counter(10)
    assert [a(), a(), a()] == [1, 2, 3]
    assert b() == 11


def test_memoize():
    calls = []

    @memoize
    def slow_square(x):
        calls.append(x)
        return x * x

    assert slow_square(4) == 16 and slow_square(4) == 16
    assert calls == [4]
    assert slow_square.cache == {(4,): 16}


def test_memoize_fib_fast():
    @memoize
    def fib(n):
        return n if n < 2 else fib(n - 1) + fib(n - 2)

    assert fib(80) == 23416728348467685


def test_timed():
    @timed
    def nap():
        time.sleep(0.02)
        return "done"

    assert nap() == "done"
    assert nap.__name__ == "nap"
    assert 0.015 < nap.last_duration < 1


def test_retry_succeeds_then_fails():
    attempts = {"n": 0}

    @retry(3, (ConnectionError,))
    def flaky():
        attempts["n"] += 1
        if attempts["n"] < 3:
            raise ConnectionError("down")
        return "ok"

    assert flaky() == "ok" and attempts["n"] == 3

    @retry(2, (ConnectionError,))
    def always_down():
        raise ConnectionError("down")

    with pytest.raises(ConnectionError):
        always_down()

    @retry(5, (ConnectionError,))
    def wrong_error():
        attempts["n"] += 1
        raise ValueError("not retried")

    attempts["n"] = 0
    with pytest.raises(ValueError):
        wrong_error()
    assert attempts["n"] == 1


def test_batched_is_lazy():
    gen = batched(itertools.count(), 3)
    assert inspect.isgenerator(gen)
    assert next(gen) == [0, 1, 2]
    assert list(batched(range(5), 2)) == [[0, 1], [2, 3], [4]]
    assert list(batched([], 2)) == []


def test_temporary_attr():
    class Cfg:
        mode = "prod"

    cfg = Cfg()
    with temporary_attr(cfg, "mode", "test"):
        assert cfg.mode == "test"
    assert cfg.mode == "prod"

    with pytest.raises(RuntimeError):
        with temporary_attr(cfg, "debug", True):
            assert cfg.debug is True
            raise RuntimeError
    assert not hasattr(cfg, "debug")

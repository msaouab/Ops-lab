"""
Drill 04 · Closures, decorators, generators, context managers  ·  Core  ·  functions as values  ·  target 40 min

1. make_counter(start=0) -> a function; each call returns the next integer (start+1, start+2, ...)
2. @memoize -> caches results by positional args; expose the cache as `wrapped.cache` (a dict)
3. @timed   -> after each call, store the duration in seconds (float) in `wrapped.last_duration`
               and return the original result. Keep the function's __name__ (functools.wraps).
4. retry(times, exceptions) -> decorator factory: re-call up to `times` attempts in total when one of
               `exceptions` is raised; re-raise the last error when all attempts fail
5. batched(iterable, n) -> GENERATOR yielding lists of n items (last may be shorter); must be lazy
6. temporary_attr(obj, name, value) -> context manager: sets obj.name = value inside the block and
               restores the previous value afterwards (even on exception); if the attribute did
               not exist before, delete it afterwards
"""
import functools
import time
from contextlib import contextmanager

def make_counter(start: int = 0):
    raise NotImplementedError


def memoize(fn):
    raise NotImplementedError


def timed(fn):
    raise NotImplementedError


def retry(times: int, exceptions: tuple = (Exception,)):
    raise NotImplementedError


def batched(iterable, n: int):
    raise NotImplementedError


def temporary_attr(obj, name: str, value):
    raise NotImplementedError

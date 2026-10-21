from longest_palindrome import *  # noqa: F401,F403

import time


def test_examples():
    assert longest_palindrome("babad") == "bab"
    assert longest_palindrome("cbbd") == "bb"


def test_edges():
    assert longest_palindrome("") == ""
    assert longest_palindrome("a") == "a"
    assert longest_palindrome("abcd") == "a"
    assert longest_palindrome("forgeeksskeegfor") == "geeksskeeg"


def test_speed():
    s = "ab" * 1000 + "racecar" + "cd" * 1000
    t = time.perf_counter()
    longest_palindrome(s)
    assert time.perf_counter() - t < 3

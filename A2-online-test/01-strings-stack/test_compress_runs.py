from compress_runs import *  # noqa: F401,F403

def test_examples():
    assert compress("aabcccc") == "a2bc4"
    assert compress("abc") == "abc"
    assert compress("aabb") == "aabb"


def test_edges():
    assert compress("") == ""
    assert compress("aaaaaaaaaaaa") == "a12"
    assert compress("aaab") == "a3b"
    assert compress("zzzzzyx") == "z5yx"

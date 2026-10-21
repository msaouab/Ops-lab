from m1_fix_brackets import *  # noqa: F401,F403

def test_m1_q1():
    assert min_insertions("())") == 1
    assert min_insertions("(((") == 3
    assert min_insertions("()") == 0
    assert min_insertions("()))((") == 4
    assert min_insertions("") == 0
    assert min_insertions(")(") == 2

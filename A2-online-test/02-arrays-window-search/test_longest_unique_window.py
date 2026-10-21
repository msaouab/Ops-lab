from longest_unique_window import *  # noqa: F401,F403

def test_examples():
    assert longest_unique("abcabcbb") == 3
    assert longest_unique("bbbbb") == 1
    assert longest_unique("pwwkew") == 3
    assert longest_unique("") == 0
    assert longest_unique("abba") == 2
    assert longest_unique("dvdf") == 3

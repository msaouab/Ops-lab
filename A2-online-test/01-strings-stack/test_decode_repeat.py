from decode_repeat import *  # noqa: F401,F403

def test_examples():
    assert decode("3[a]2[bc]") == "aaabcbc"
    assert decode("3[a2[c]]") == "accaccacc"
    assert decode("2[abc]3[cd]ef") == "abcabccdcdcdef"


def test_more():
    assert decode("") == ""
    assert decode("abc") == "abc"
    assert decode("10[a]") == "a" * 10
    assert decode("2[x1[y]]z") == "xyxyz"

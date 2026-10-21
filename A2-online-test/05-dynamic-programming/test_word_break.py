from word_break import *  # noqa: F401,F403

def test_split():
    assert can_split("erpsale", ["erp", "sale"]) is True
    assert can_split("applepenapple", ["apple", "pen"]) is True
    assert can_split("catsandog", ["cats", "dog", "sand", "and", "cat"]) is False
    assert can_split("", ["a"]) is True


def test_no_exponential_blowup():
    assert can_split("a" * 200 + "b", ["a", "aa", "aaa", "aaaa"]) is False

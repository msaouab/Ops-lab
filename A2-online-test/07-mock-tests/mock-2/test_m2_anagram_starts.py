from m2_anagram_starts import *  # noqa: F401,F403

def test_m2_q2():
    assert anagram_starts("cbaebabacd", "abc") == [0, 6]
    assert anagram_starts("abab", "ab") == [0, 1, 2]
    assert anagram_starts("a", "ab") == []
    assert anagram_starts("abaaabaa", "aab") == [0, 1, 3, 4, 5]

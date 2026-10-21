from common_subsequence import *  # noqa: F401,F403

def is_subseq(s, t):
    it = iter(t)
    return all(ch in it for ch in s)


def test_lcs():
    for a, b, n in [("abcde", "ace", 3), ("abc", "def", 0), ("AGGTAB", "GXTXAYB", 4), ("", "x", 0)]:
        assert lcs_length(a, b) == n
        s = lcs(a, b)
        assert len(s) == n and is_subseq(s, a) and is_subseq(s, b)

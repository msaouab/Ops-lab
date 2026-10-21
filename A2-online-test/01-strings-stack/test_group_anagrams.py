from group_anagrams import *  # noqa: F401,F403

def test_example():
    assert group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]) == [
        ["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]


def test_edges():
    assert group_anagrams([]) == []
    assert group_anagrams([""]) == [[""]]
    assert group_anagrams(["ab", "ba", "ab"]) == [["ab", "ba", "ab"]]

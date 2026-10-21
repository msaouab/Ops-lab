from edit_distance import *  # noqa: F401,F403

def test_edit():
    assert edit_distance("horse", "ros") == 3
    assert edit_distance("intention", "execution") == 5
    assert edit_distance("", "abc") == 3
    assert edit_distance("sale", "sale") == 0
    assert edit_distance("kitten", "sitting") == 3

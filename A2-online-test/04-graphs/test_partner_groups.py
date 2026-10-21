from partner_groups import *  # noqa: F401,F403

def test_groups():
    links = [(0, 1), (1, 2), (3, 4)]
    assert count_groups(6, links) == 3
    assert largest_group(6, links) == 3
    assert count_groups(3, []) == 3 and largest_group(3, []) == 1
    assert count_groups(0, []) == 0 and largest_group(0, []) == 0

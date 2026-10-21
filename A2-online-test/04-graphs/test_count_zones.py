from count_zones import *  # noqa: F401,F403

def test_zones():
    assert count_zones(["##..", "##..", "..#.", "...#"]) == 3
    assert count_zones(["#.#", ".#.", "#.#"]) == 5
    assert count_zones(["###", "#.#", "###"]) == 1
    assert count_zones([]) == 0
    assert count_zones(["...."]) == 0


def test_large_grid_no_recursion_limit():
    big = ["#" * 300] * 300
    assert count_zones(big) == 1

from grid_paths import *  # noqa: F401,F403

def test_paths():
    assert count_paths(["...", ".#.", "..."]) == 2
    assert count_paths(["...", "...", "..."]) == 6
    assert count_paths(["#.", ".."]) == 0
    assert count_paths(["..", ".#"]) == 0
    assert count_paths(["." * 17] * 17) == 601080390

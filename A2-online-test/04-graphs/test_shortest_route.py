from shortest_route import *  # noqa: F401,F403

def test_route():
    grid = ["....",
            ".##.",
            "...#",
            "#..."]
    assert shortest_route(grid, (0, 0), (3, 3)) == 6
    assert shortest_route(grid, (0, 0), (0, 0)) == 0
    assert shortest_route([".#.", ".#.", ".#."], (0, 0), (0, 2)) == -1
    assert shortest_route(["#."], (0, 0), (0, 1)) == -1

from product_bundles import *  # noqa: F401,F403


def norm(result):
    return sorted(tuple(b) for b in result)


def test_examples():
    assert norm(bundles(["a", "b"])) == [(), ("a",), ("a", "b"), ("b",)]
    assert norm(bundles(["x", "y", "z"])) == sorted([(), ("x",), ("y",), ("z",), ("x", "y"), ("x", "z"), ("y", "z"), ("x", "y", "z")])


def test_edges():
    assert norm(bundles([])) == [()]
    assert len(bundles(list("abcdefghij"))) == 1024
    for b in bundles(["c", "a", "b"]):
        assert b == [x for x in ["c", "a", "b"] if x in b]  # input order kept

from d01_idioms import *  # noqa: F401,F403

def test_chunk():
    assert chunk([1, 2, 3, 4, 5], 2) == [[1, 2], [3, 4], [5]]
    assert chunk([], 3) == []
    assert chunk([1, 2], 5) == [[1, 2]]


def test_flatten():
    assert flatten([[1, 2], [3], []]) == [1, 2, 3]
    assert flatten([]) == []


def test_dedupe():
    assert dedupe([3, 1, 3, 2, 1]) == [3, 1, 2]
    assert dedupe(["b", "a", "b"]) == ["b", "a"]


def test_invert():
    assert invert({"a": 1, "b": 2}) == {1: "a", 2: "b"}
    assert invert({"a": 1, "b": 1}) == {1: "b"}


def test_diffs():
    assert diffs([1, 4, 9]) == [3, 5]
    assert diffs([7]) == []


def test_index_of_max():
    assert index_of_max([3, 9, 2, 9]) == 1
    assert index_of_max([]) == -1
    assert index_of_max([-5, -2, -9]) == 1


def test_dig():
    data = {"a": {"b": 2}, "items": [{"name": "desk"}, {"name": "chair"}]}
    assert dig(data, "a.b") == 2
    assert dig(data, "items.1.name") == "chair"
    assert dig(data, "items.5.name") is None
    assert dig(data, "a.x", default=0) == 0
    assert dig(data, "a.b.c") is None


def test_word_lengths():
    assert word_lengths("The cat saw the Owl") == {"the": 3, "cat": 3, "saw": 3, "owl": 3}
    assert word_lengths("") == {}

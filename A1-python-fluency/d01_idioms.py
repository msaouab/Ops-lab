"""
Drill 01 · Pythonic idioms  ·  Warm-up  ·  comprehensions, slicing, unpacking, zip, enumerate  ·  target 25 min

Coming from TypeScript, most of these are one-liners in Python. Aim for clean,
idiomatic code: comprehensions, slicing, zip/enumerate, unpacking. No imports needed.

1. chunk(items, size)          -> split a list into lists of `size` (last may be shorter)
2. flatten(nested)             -> flatten ONE level: [[1,2],[3],[]] -> [1,2,3]
3. dedupe(items)               -> remove duplicates, keep first-seen order
4. invert(d)                   -> {value: key}; if two keys share a value keep the LAST key
5. diffs(nums)                 -> differences between neighbours: [1,4,9] -> [3,5]
6. index_of_max(nums)          -> index of the largest value (first one on ties); -1 if empty
7. dig(data, path, default)    -> safe nested lookup: dig({"a": {"b": 2}}, "a.b") -> 2,
                                  works through dicts and lists ("items.0.name"),
                                  returns `default` (None) when any step is missing
8. word_lengths(sentence)      -> {"the": 3, ...} for each distinct lower-cased word
"""

def chunk(items: list, size: int) -> list[list]:
    raise NotImplementedError


def flatten(nested: list[list]) -> list:
    raise NotImplementedError


def dedupe(items: list) -> list:
    raise NotImplementedError


def invert(d: dict) -> dict:
    raise NotImplementedError


def diffs(nums: list[int]) -> list[int]:
    raise NotImplementedError


def index_of_max(nums: list[int]) -> int:
    raise NotImplementedError


def dig(data, path: str, default=None):
    raise NotImplementedError


def word_lengths(sentence: str) -> dict[str, int]:
    raise NotImplementedError

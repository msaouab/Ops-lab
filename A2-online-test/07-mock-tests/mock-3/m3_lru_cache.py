"""
Mock 3 · Q2 · LRU cache  ·  Medium  ·  hash map + ordering  ·  target 20 min

Implement LRUCache(capacity) with get(key) -> value or -1, and put(key, value).
When full, put evicts the least recently USED key (get and put both count as use).
Both operations must be O(1). You may use collections.OrderedDict, but be ready to
explain how you would build it with a dict + doubly linked list.

Similar public problem: https://leetcode.com/problems/lru-cache/
"""
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        raise NotImplementedError

    def get(self, key: int) -> int:
        raise NotImplementedError

    def put(self, key: int, value: int) -> None:
        raise NotImplementedError

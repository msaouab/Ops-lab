"""
Running median  ·  Hard-ish  ·  two heaps  ·  target 25 min

Implement MedianTracker with add(x) and median() -> float. Both must be O(log n) / O(1).
median() of an empty tracker raises ValueError.

Similar public problem: https://leetcode.com/problems/find-median-from-data-stream/
"""
import heapq

class MedianTracker:
    def add(self, x: int) -> None:
        raise NotImplementedError

    def median(self) -> float:
        raise NotImplementedError

"""
Longest increasing subsequence  ·  Medium  ·  DP O(n^2), then O(n log n)  ·  target 20 min

Length of the longest strictly increasing subsequence (not necessarily contiguous).
Start with O(n^2); the speed test needs O(n log n) (patience sorting with bisect).

Similar public problem: https://leetcode.com/problems/longest-increasing-subsequence/
"""
from bisect import bisect_left

def lis_length(nums: list[int]) -> int:
    raise NotImplementedError

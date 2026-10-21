"""
Run-length compression  ·  Easy  ·  strings, two pointers  ·  target 10 min

Compress consecutive repeated characters: "aabcccc" -> "a2bc4".
A run of length 1 keeps just the character. Return the ORIGINAL string when the
compressed one is not strictly shorter.

    compress("aabcccc") -> "a2bc4"
    compress("abc")     -> "abc"
    compress("aabb")    -> "aabb"      (a2b2 is not shorter)

Similar public problem: https://leetcode.com/problems/string-compression/
"""

def compress(s: str) -> str:
    raise NotImplementedError

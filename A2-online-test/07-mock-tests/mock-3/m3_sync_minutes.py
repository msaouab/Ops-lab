"""
Mock 3 · Q1 · Minutes until every server is updated  ·  Medium  ·  multi-source BFS  ·  target 25 min

Grid of servers: "U" updated, "O" outdated, "." no server. Every minute, each updated server
updates its outdated neighbours (up, down, left, right). Return the minutes until no outdated
server remains, or -1 if some can never be reached. 0 if none are outdated at the start.

Similar public problem: https://leetcode.com/problems/rotting-oranges/
"""
from collections import deque

def sync_minutes(grid: list[str]) -> int:
    raise NotImplementedError

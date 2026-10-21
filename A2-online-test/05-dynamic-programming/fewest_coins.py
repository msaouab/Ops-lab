"""
Fewest coins for change  ·  Medium  ·  unbounded knapsack  ·  target 20 min

Return the fewest coins needed to make `amount` (unlimited coins of each value), or -1.
Greedy is wrong: coins [1, 3, 4], amount 6 -> 2 (3+3), greedy gives 3 (4+1+1).
Second function: number_of_ways(coins, amount) = how many combinations (order does not matter).

Similar public problem: https://leetcode.com/problems/coin-change/
"""

def fewest_coins(coins: list[int], amount: int) -> int:
    raise NotImplementedError


def number_of_ways(coins: list[int], amount: int) -> int:
    raise NotImplementedError

import type { Module, PythonExercise } from '../../types';
import { problem } from '../problems';

const dp1dModule: Module<PythonExercise> = {
  id: 'dp-1d',
  title: '1-D Dynamic Programming',
  tags: 'state · recurrence · memo → table',
  parents: ['backtracking'],
  summary: 'When a brute-force recursion solves the same subproblem many times, store each answer once. Learn to define the state and the recurrence.',
  lesson: [
    {
      heading: 'Spot it',
      body: 'Dynamic programming fits when the problem asks for an <b>optimum or a count</b> and choices build on earlier choices:',
      list: [
        '"minimum cost / maximum value / fewest steps to reach…"',
        '"how many ways to…" (decode, climb, make change)',
        '"can we reach / can we split / can we build…" (true / false)',
        'and a recursive solution would recompute the same smaller inputs again and again',
      ],
      note: { label: 'Interview tip', body: 'Greedy ("always take the biggest coin") is tempting and often wrong. If you can find a small counter-example to greedy, that is your signal for DP.' },
    },
    {
      heading: 'Four questions that build every DP',
      body: 'Answer these in words before writing code:',
      list: [
        '<b>State</b>: what does <code>dp[i]</code> mean? ("the minimum cost to stand on stair i")',
        '<b>Recurrence</b>: how is <code>dp[i]</code> built from smaller states? (last choice: came from i−1 or i−2)',
        '<b>Base cases</b>: the smallest states you know directly (dp[0], dp[1])',
        '<b>Answer</b>: which state (or combination) is the final answer, and in which order to fill',
      ],
    },
    {
      heading: 'From recursion to memo to table',
      body: 'Start with the plain recursion: it is the recurrence, written as code. Add a cache and it becomes O(n) ("top-down"). Then fill an array from small to large ("bottom-up"). Same logic, three forms.',
      code: `from functools import cache

calls = 0
def ways_slow(n):                 # stairs, steps of 1 or 2
    global calls
    calls += 1
    return 1 if n <= 1 else ways_slow(n - 1) + ways_slow(n - 2)

@cache
def ways_memo(n):
    return 1 if n <= 1 else ways_memo(n - 1) + ways_memo(n - 2)

def ways_table(n):
    dp = [1, 1] + [0] * (n - 1)
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]

print(ways_slow(25), "plain recursion calls:", calls)
print(ways_memo(25), ways_table(25))`,
    },
    {
      heading: 'Take it or skip it',
      body: 'Many 1-D DPs decide, at each element, between "take it" and "skip it". Non-adjacent maximum: taking <code>v</code> requires that the previous one was skipped. When <code>dp[i]</code> only needs the last two states, keep two variables instead of an array.',
      code: `values = [2, 7, 9, 3, 1]
take = skip = 0                      # best total if previous was taken / skipped
for v in values:
    take, skip = skip + v, max(take, skip)
    print(f"v={v}: take={take} skip={skip}")
print("best:", max(take, skip))`,
    },
    {
      heading: 'Counting vs optimizing: coins',
      body: 'Same table, different combine step. Fewest coins: <code>dp[a] = 1 + min(dp[a - c])</code>. Number of ways: <code>dp[a] += dp[a - c]</code>, with the coin loop outside so each combination counts once regardless of order.',
      code: `coins, amount = [1, 3, 4], 6
INF = float("inf")
fewest = [0] + [INF] * amount
for a in range(1, amount + 1):
    fewest[a] = 1 + min((fewest[a - c] for c in coins if c <= a), default=INF)
print("fewest coins:", fewest[amount], " (greedy 4+1+1 would use 3)")

ways = [1] + [0] * amount
for c in coins:                      # coins outside: combinations, not orders
    for a in range(c, amount + 1):
        ways[a] += ways[a - c]
print("ways:", ways[amount])`,
      note: { label: 'Longest increasing subsequence', body: 'The textbook DP is O(n²): <code>dp[i] = 1 + max(dp[j] for j &lt; i if nums[j] &lt; nums[i])</code>. The O(n log n) version keeps <code>tails[k]</code>, the smallest tail of any increasing run of length k+1, updated with <code>bisect_left</code>.' },
    },
  ],
  exercises: [
    problem('cheapest_climb', {
      hint: 'Treat the top as stair n. The cheapest way to reach stair i is min(reach[i-1] + cost[i-1], reach[i-2] + cost[i-2]), with reach[0] = reach[1] = 0. Two variables are enough.',
      complexity: 'O(n) time · O(1) space',
    }),
    problem('rob_houses', {
      hint: 'Track two values while scanning: the best total if you took the previous value, and if you skipped it. For the circle, solve values[1:] and values[:-1] and take the max.',
      complexity: 'O(n) time · O(1) space',
    }),
    problem('fewest_coins', {
      hint: 'dp[a] = fewest coins for amount a, dp[0] = 0. For number_of_ways, put the coin loop outside the amount loop.',
      complexity: 'O(amount × coins) time · O(amount) space',
    }),
    problem('word_break', {
      hint: 'ok[i] is True when s[:i] can be split. ok[i] = some word w ends at i (s[i-len(w):i] == w) with ok[i-len(w)] True.',
      complexity: 'O(n × distinct word lengths) set lookups · O(n) space',
    }),
    problem('m1_decode_ways', {
      hint: 'ways[i] counts decodings of s[:i]. Add ways[i-1] if the last digit is not "0"; add ways[i-2] if the last two digits form 10–26.',
      complexity: 'O(n) time · O(1) space',
    }),
    problem('longest_increasing', {
      hint: 'Keep tails[k] = smallest possible tail of an increasing run of length k+1. For each x, bisect_left(tails, x) tells you where it goes: append or replace.',
      complexity: 'O(n log n) time · O(n) space',
    }),
  ],
};

export default dp1dModule;

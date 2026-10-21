import type { Module, PythonExercise } from '../../types';
import { problem } from '../problems';

const hashingModule: Module<PythonExercise> = {
  id: 'hashing',
  title: 'Arrays & Hashing',
  tags: 'dict · set · Counter · grouping',
  parents: ['think'],
  summary: 'Trade memory for speed: a dictionary or set answers "have I seen this?" in O(1), turning O(n²) searches into one pass.',
  lesson: [
    {
      heading: 'Spot it',
      body: 'Reach for a hash map or set when the problem says:',
      list: [
        '"find two items that add up to / match" (a complement)',
        '"has this appeared before?", "first duplicate", "unique"',
        '"count how many times", "most frequent"',
        '"group items that share a property" (anagrams, same category)',
      ],
    },
    {
      heading: 'The idea: remember what you have seen',
      body: 'A brute-force inner loop searches the past for something. A dictionary stores the past, keyed by what you will search for, so the search becomes one lookup. Ask: <i>what key would I look up?</i> For "two numbers summing to target", you look up <code>target - x</code>, so you store each number as a key.',
      code: `prices = [2, 7, 11, 15]
budget = 9
seen = {}                      # price -> index where we saw it
for j, p in enumerate(prices):
    need = budget - p
    print(f"j={j} price={p} need={need} seen={seen}")
    if need in seen:
        print("found:", (seen[need], j))
        break
    seen[p] = j`,
    },
    {
      heading: 'Counting with Counter and defaultdict',
      body: '<code>collections.Counter</code> counts in one line; <code>defaultdict(list)</code> builds groups without checking whether a key exists. Both are standard library and fine in interviews.',
      code: `from collections import Counter, defaultdict

words = ["eat", "tea", "tan", "ate", "nat", "bat"]
print(Counter("mississippi").most_common(2))

groups = defaultdict(list)
for w in words:
    groups["".join(sorted(w))].append(w)   # anagrams share the sorted letters
print(list(groups.values()))`,
    },
    {
      heading: 'Choose the key carefully',
      body: 'Grouping problems are really "what is the canonical form?" questions. Anagrams: sorted letters (or a 26-count tuple). Same shape: a normalized tuple. Consecutive numbers: the set itself, and start counting only where <code>x - 1</code> is missing, so each run is walked once.',
      code: `nums = [100, 4, 200, 1, 3, 2]
values = set(nums)
best = 0
for x in values:
    if x - 1 not in values:            # x starts a run
        length = 1
        while x + length in values:
            length += 1
        print(f"run from {x}: length {length}")
        best = max(best, length)
print("longest:", best)`,
      note: { label: 'Complexity', body: 'Every number is part of exactly one run and each run is walked once from its start, so the nested loop is still O(n) overall. Interviewers often ask you to justify exactly this.' },
    },
    {
      heading: 'Traps',
      body: 'Lists and dicts are not hashable, so use tuples or strings as keys. Python dicts keep insertion order, which helps when the output must follow input order. And watch for "use each element once": insert into <code>seen</code> <i>after</i> checking, so an item never pairs with itself.',
      note: { label: 'Interview tip', body: 'Say the trade-off: "I use O(n) extra memory to get O(n) time instead of O(n²)." Then ask if memory is constrained; sometimes sorting with two pointers (O(1) extra space) is the expected follow-up.' },
    },
  ],
  exercises: [
    problem('pair_for_budget', {
      hint: 'For each price p, the partner you need is budget - p. Store prices you have already passed in a dict: price -> index.',
      complexity: 'O(n) time · O(n) space',
    }),
    problem('group_anagrams', {
      hint: 'Anagrams become equal once you sort their letters. Use that as a dict key; dicts keep the order groups were first seen.',
      complexity: 'O(n · k log k) time for n words of length k · O(n·k) space',
    }),
    problem('longest_streak', {
      hint: 'Put everything in a set. Only start counting from x when x - 1 is not in the set, then extend with x + 1, x + 2, …',
      complexity: 'O(n) time · O(n) space',
    }),
  ],
};

export default hashingModule;

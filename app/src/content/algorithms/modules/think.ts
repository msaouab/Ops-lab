import type { Module, PythonExercise } from '../../types';
import { problem } from '../problems';

const thinkModule: Module<PythonExercise> = {
  id: 'think',
  title: 'How to Think',
  tags: 'UMPIRE · brute force · Big-O',
  parents: [],
  summary: 'Before any pattern: a repeatable method for unknown problems, and how to read constraints to know which complexity you need.',
  lesson: [
    {
      heading: 'Use a method, not inspiration',
      body: 'Strong candidates do not wait for the answer to appear. They run the same six steps on every problem, out loud. The steps are called <b>UMPIRE</b>:',
      list: [
        '<b>Understand</b>: restate the problem, ask about input sizes and edge cases, write 2–3 examples by hand.',
        '<b>Match</b>: which known pattern does it look like? (The rest of this track is a catalogue of patterns.)',
        '<b>Plan</b>: describe the algorithm in plain words or pseudocode, and its complexity, <i>before</i> coding.',
        '<b>Implement</b>: write clean code that follows the plan.',
        '<b>Review</b>: walk through your code line by line with one example, like a debugger.',
        '<b>Evaluate</b>: state time and space complexity, and test the edge cases.',
      ],
      note: { label: 'Interview tip', body: 'Interviewers grade the process as much as the answer. Narrating these steps turns a silent struggle into visible problem solving, and gets you hints.' },
    },
    {
      heading: 'Understand: turn the statement into examples',
      body: 'Write examples as code before solving anything. Include the normal case, the smallest inputs (empty, one element), and a case designed to break a naive idea. These become your first tests.',
      code: `def compress(s):
    ...  # not solved yet

examples = [
    ("aabcccc", "a2bc4"),   # normal case
    ("", ""),               # empty input
    ("a", "a"),             # one character
    ("aabb", "aabb"),       # a2b2 is not shorter: keep the original
]
for given, expected in examples:
    print(f"{given!r:10} -> {expected!r}")`,
    },
    {
      heading: 'Brute force first, then optimize',
      body: 'Say the obvious solution first, with its complexity. It proves you understood the problem and gives a baseline. Then ask: <i>which work is repeated?</i> Removing repeated work is what every pattern does. Here, the inner loop searches for <code>budget - price</code> again and again; a dictionary remembers what we already saw.',
      code: `def pair_brute(prices, budget):          # O(n^2): try every pair
    for j in range(len(prices)):
        for i in range(j):
            if prices[i] + prices[j] == budget:
                return (i, j)

def pair_fast(prices, budget):           # O(n): remember seen prices
    seen = {}
    for j, p in enumerate(prices):
        if budget - p in seen:
            return (seen[budget - p], j)
        seen.setdefault(p, j)

print(pair_brute([2, 7, 11, 15], 9), pair_fast([2, 7, 11, 15], 9))`,
    },
    {
      heading: 'Read the constraints to choose the complexity',
      body: 'Input size tells you which complexity is acceptable. Assume roughly 10<sup>7</sup>–10<sup>8</sup> simple steps per second, and work backwards:',
      list: [
        '<code>n ≤ 10</code>: O(n!) is fine: try every order (backtracking).',
        '<code>n ≤ 20</code>: O(2<sup>n</sup>): try every subset.',
        '<code>n ≤ 500</code>: O(n<sup>3</sup>).',
        '<code>n ≤ 5 000</code>: O(n<sup>2</sup>): nested loops, 2D DP.',
        '<code>n ≤ 10<sup>6</sup></code>: O(n log n) or O(n): sorting, hashing, two pointers, sliding window, heaps.',
        'Huge <code>n</code> or "find in sorted data": O(log n): binary search.',
      ],
      code: `import time

def count_pairs(n):          # O(n^2) on purpose
    steps = 0
    for i in range(n):
        for j in range(n):
            steps += 1
    return steps

for n in (100, 200, 400):
    t = time.perf_counter()
    count_pairs(n)
    print(f"n={n:>4}: {time.perf_counter() - t:.4f}s")  # doubling n ~ 4x the time`,
    },
    {
      heading: 'Match: from wording to pattern',
      body: 'Most interview problems are one of about fifteen patterns in disguise. Learn the trigger words:',
      list: [
        '"pair / complement / seen before / count occurrences" → <b>hashing</b>',
        '"sum of a subarray / range sum / product of the others" → <b>prefix sums</b>',
        '"sorted array, pair or triple with a target" / "palindrome" → <b>two pointers</b>',
        '"contiguous subarray or substring, longest / shortest / of size k" → <b>sliding window</b>',
        '"matching brackets / nested / undo / next greater" → <b>stack</b>',
        '"sorted / minimum value that works / O(log n)" → <b>binary search</b>',
        '"linked list, cycle, middle, reverse" → <b>fast &amp; slow pointers</b>, pointer rewiring',
        '"tree, depth, level by level" → <b>DFS / BFS on trees</b>',
        '"top k / k-th / running median / merge k sorted" → <b>heap</b>',
        '"overlapping ranges / meetings / bookings" → <b>sort + intervals</b>',
        '"all combinations / subsets / permutations" → <b>backtracking</b>',
        '"grid, islands, shortest path, dependencies" → <b>graphs</b> (BFS, DFS, topological sort, union-find)',
        '"number of ways / min cost / can we reach" with overlapping subproblems → <b>dynamic programming</b>',
      ],
    },
    {
      heading: 'Review and evaluate out loud',
      body: 'Before you say "done", trace one example through your code, checking each variable. Then run the edge cases in your head: empty input, one element, all equal, negative numbers, the largest size. Finish with "this runs in O(…) time and O(…) space because…".',
      code: `def compress(s):
    out, i = [], 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]:
            j += 1
        out.append(s[i] + (str(j - i) if j - i > 1 else ""))
        print(f"run {s[i]!r} x{j - i} -> {out}")   # the trace you would say out loud
        i = j
    packed = "".join(out)
    return packed if len(packed) < len(s) else s

print(compress("aabcccc"))`,
      note: { label: 'Complexity', body: 'Each character is visited once by <code>j</code>, so this is O(n) time even though there are two loops. Count how many times the inner loop body runs in total, not per outer step.' },
    },
  ],
  exercises: [
    problem('compress_runs', {
      hint: 'Walk with two indices: i marks the start of a run, j moves until the character changes. The run length is j - i.',
      complexity: 'O(n) time · O(n) space',
    }),
  ],
};

export default thinkModule;

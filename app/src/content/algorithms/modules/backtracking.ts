import type { Module, PythonExercise } from '../../types';
import { problem } from '../problems';

const backtrackingModule: Module<PythonExercise> = {
  id: 'backtracking',
  title: 'Backtracking',
  tags: 'choose · explore · un-choose · pruning',
  parents: ['trees'],
  summary: 'Generate every combination by walking a decision tree: make a choice, recurse, undo the choice. Prune branches that cannot lead to an answer.',
  lesson: [
    {
      heading: 'Spot it',
      body: 'The problem asks for <b>all</b> of something, and the input is small (n ≤ ~20):',
      list: [
        '"all subsets / bundles / combinations"',
        '"all permutations / orders / arrangements"',
        '"all ways to reach a target sum", n-queens, sudoku, word search',
      ],
    },
    {
      heading: 'The decision tree',
      body: 'Each level of the recursion makes one decision. For subsets, the decision at level i is "take item i or skip it": two branches per level, 2<sup>n</sup> leaves, each leaf a subset.',
      code: `items = ["a", "b", "c"]
chosen = []

def explore(i, depth=0):
    if i == len(items):
        print("  " * depth + "leaf:", chosen)
        return
    chosen.append(items[i])          # choose
    explore(i + 1, depth + 1)
    chosen.pop()                     # un-choose
    explore(i + 1, depth + 1)        # skip

explore(0)`,
    },
    {
      heading: 'The template: choose, explore, un-choose',
      body: 'Keep one shared path. Append a choice, recurse, then pop it so the path is clean for the next branch. When you record a result, record a <b>copy</b> (<code>path[:]</code>): the path keeps changing.',
      code: `def permutations(nums):
    out, path, used = [], [], [False] * len(nums)

    def explore():
        if len(path) == len(nums):
            out.append(path[:])          # copy!
            return
        for i, x in enumerate(nums):
            if used[i]:
                continue
            used[i] = True
            path.append(x)               # choose
            explore()                    # explore
            path.pop()                   # un-choose
            used[i] = False

    explore()
    return out

print(permutations([1, 2, 3]))`,
      note: { label: 'Common trap', body: 'Appending <code>path</code> instead of <code>path[:]</code> stores the same list object many times; at the end every result is empty.' },
    },
    {
      heading: 'Pruning: stop early',
      body: 'For "combinations that sum to a target", sort the values first. Once a value is bigger than what is left, every later value is too: <code>break</code> instead of exploring. To allow reuse of a value, recurse with the same start index; to avoid duplicate orderings, never go back to earlier indices.',
      code: `def combos(values, amount):
    values = sorted(values)
    out, path = [], []

    def explore(start, remaining):
        if remaining == 0:
            out.append(path[:])
            return
        for i in range(start, len(values)):
            if values[i] > remaining:
                break                         # prune: sorted, so all later fail too
            path.append(values[i])
            explore(i, remaining - values[i]) # i: the same value may repeat
            path.pop()

    explore(0, amount)
    return out

print(combos([2, 3, 6, 7], 7))`,
      note: { label: 'Complexity', body: 'Backtracking is exponential by nature: O(2<sup>n</sup>) subsets, O(n!) permutations, times the cost of copying each result. That is fine because the output itself is that large.' },
    },
  ],
  exercises: [
    problem('product_bundles', {
      hint: 'Recurse over the items with an index. At each item, explore once with it in the bundle and once without. Record a copy at the end.',
      complexity: 'O(n · 2ⁿ) time · O(n) extra space for the path',
    }),
    problem('delivery_orders', {
      hint: 'Build the route one stop at a time. Track which stops are used; try every unused one, recurse, then undo.',
      complexity: 'O(n · n!) time · O(n) extra space',
    }),
    problem('coupon_combos', {
      hint: 'Sort the values. Recurse with (start index, remaining amount); loop from start so combinations stay non-decreasing, and break when a value exceeds what remains.',
      complexity: 'Exponential in amount / smallest value · O(amount / smallest value) depth',
    }),
  ],
};

export default backtrackingModule;

import type { Module, PythonExercise } from '../../types';
import { problem } from '../problems';

const dp2dModule: Module<PythonExercise> = {
  id: 'dp-2d',
  title: '2-D Dynamic Programming',
  tags: 'grids · two strings · knapsack',
  parents: ['dp-1d'],
  summary: 'When the state needs two numbers (a cell, a position in each string, items × capacity), the table becomes a grid. Same four questions, one more dimension.',
  lesson: [
    {
      heading: 'Spot it',
      body: 'The state needs two indices when:',
      list: [
        'you move through a <b>grid</b> (right / down paths, minimum path cost)',
        'you compare <b>two strings</b>: common subsequence, edit distance',
        'you choose items under a <b>budget</b>: 0/1 knapsack, subset sum ("items considered" × "capacity used")',
      ],
    },
    {
      heading: 'Grid paths: each cell from its neighbours',
      body: '<code>paths[r][c] = paths[r-1][c] + paths[r][c-1]</code>: you arrive from above or from the left. Blocked cells are 0. Filling row by row means one row of memory is enough.',
      code: `grid = ["...",
        ".#.",
        "..."]
row = [1] + [0] * (len(grid[0]) - 1)
for r, line in enumerate(grid):
    for c, cell in enumerate(line):
        if cell == "#":
            row[c] = 0
        elif c > 0:
            row[c] += row[c - 1]        # above (already in row[c]) + left
    print(f"row {r}: {row}")
print("paths:", row[-1])`,
    },
    {
      heading: 'Two strings: dp[i][j] on prefixes',
      body: 'Let <code>dp[i][j]</code> be the answer for the first <code>i</code> letters of a and the first <code>j</code> of b. Compare the last letters: equal means extend the diagonal, different means take the best of dropping one letter (LCS) or 1 + the cheapest edit (edit distance).',
      code: `a, b = "horse", "ros"
dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
for i in range(len(a) + 1):
    dp[i][0] = i                       # delete everything
for j in range(len(b) + 1):
    dp[0][j] = j                       # insert everything
for i in range(1, len(a) + 1):
    for j in range(1, len(b) + 1):
        if a[i - 1] == b[j - 1]:
            dp[i][j] = dp[i - 1][j - 1]
        else:
            dp[i][j] = 1 + min(dp[i - 1][j],      # delete
                               dp[i][j - 1],      # insert
                               dp[i - 1][j - 1])  # replace
print("    " + "  ".join(" " + b))
for i, line in enumerate(dp):
    print((" " + a)[i], line)
print("edit distance:", dp[-1][-1])`,
    },
    {
      heading: '0/1 knapsack: items × capacity',
      body: '<code>best[c]</code> = best value using capacity <code>c</code> with the items seen so far. For each item, update capacities from <b>high to low</b>: going backwards guarantees each item is used at most once. Subset sum ("can we split into equal halves?") is the same loop with booleans.',
      code: `items, capacity = [(1, 1), (3, 4), (4, 5), (5, 7)], 7   # (weight, value)
best = [0] * (capacity + 1)
for weight, value in items:
    for c in range(capacity, weight - 1, -1):        # backwards: once per item
        best[c] = max(best[c], best[c - weight] + value)
    print(f"after item {(weight, value)}: {best}")
print("best value:", best[capacity])`,
      note: { label: 'Common trap', body: 'Looping capacities forwards in 0/1 knapsack lets the same item be counted again in the same pass, which is the <i>unbounded</i> knapsack (like coins). Direction is the whole difference.' },
    },
  ],
  exercises: [
    problem('grid_paths', {
      hint: 'One row of counts is enough: for each cell, count = from above (current value) + from the left. Blocked cells reset to 0.',
      complexity: 'O(rows × cols) time · O(cols) space',
    }),
    problem('common_subsequence', {
      hint: 'dp[i][j] = LCS of a[i:] and b[j:]. Equal letters: 1 + dp[i+1][j+1]; otherwise max(dp[i+1][j], dp[i][j+1]). Walk the table from (0, 0) to rebuild one subsequence.',
      complexity: 'O(n × m) time and space',
    }),
    problem('edit_distance', {
      hint: 'dp[i][j] = edits to turn a[:i] into b[:j]. Base rows are i and j. Equal letters copy the diagonal; otherwise 1 + min(delete, insert, replace).',
      complexity: 'O(n × m) time · O(m) space with two rows',
    }),
    problem('equal_split', {
      hint: 'If the total is odd, no. Otherwise ask: can some subset reach total // 2? Boolean array reachable[s], updated backwards for each number.',
      complexity: 'O(n × sum) time · O(sum) space',
    }),
    problem('truck_loading', {
      hint: 'best[c] = best value with capacity c. For each item, loop c from capacity down to its weight: best[c] = max(best[c], best[c - w] + v).',
      complexity: 'O(items × capacity) time · O(capacity) space',
    }),
  ],
};

export default dp2dModule;

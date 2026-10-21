import type { Module, PythonExercise } from '../../types';
import { problem } from '../problems';

const binarySearchModule: Module<PythonExercise> = {
  id: 'binary-search',
  title: 'Binary Search',
  tags: 'halving · first true · search the answer',
  parents: ['two-pointers'],
  summary: 'Halve the search space each step for O(log n). Works on sorted arrays, and on any yes/no question that flips from "no" to "yes" exactly once.',
  lesson: [
    {
      heading: 'Spot it',
      body: 'Binary search applies when:',
      list: [
        'the data is <b>sorted</b> (or sorted then rotated) and you must beat O(n)',
        'you look for the <b>first</b> position where something becomes true ("first failing build")',
        'the question is "<b>smallest value that works</b>": capacity, speed, time. Search over the answer itself.',
      ],
    },
    {
      heading: 'The invariant decides everything',
      body: 'Off-by-one bugs disappear when you state an invariant and keep it. Here: the answer is always inside <code>[lo, hi]</code>. Each step looks at <code>mid</code> and throws away the half that cannot contain it.',
      code: `def search(nums, target):
    lo, hi = 0, len(nums) - 1          # answer is inside [lo, hi]
    while lo <= hi:
        mid = (lo + hi) // 2
        print(f"lo={lo} hi={hi} mid={mid} ({nums[mid]})")
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1               # mid and everything left is too small
        else:
            hi = mid - 1
    return -1

print(search([1, 3, 5, 7, 9, 11, 13], 11))`,
    },
    {
      heading: 'Find the first "yes"',
      body: 'Many problems are a monotonic predicate: <code>False False False True True</code>. Binary search finds the boundary: when <code>mid</code> is a yes, remember it and look left for an earlier one.',
      code: `failing_from = 37
calls = 0
def is_failing(v):
    global calls
    calls += 1
    return v >= failing_from

lo, hi, first = 1, 100, -1
while lo <= hi:
    mid = (lo + hi) // 2
    if is_failing(mid):
        first, hi = mid, mid - 1        # a yes: try to find an earlier one
    else:
        lo = mid + 1
print("first failing:", first, "in", calls, "calls")   # about log2(100) = 7`,
      note: { label: 'Interview tip', body: 'Python ships this for sorted lists: <code>bisect.bisect_left(a, x)</code> returns the first index where <code>a[i] >= x</code>. Use it, but be ready to write the loop by hand.' },
    },
    {
      heading: 'Search the answer, not the array',
      body: '"Smallest truck capacity that ships everything in D days": if capacity C works, any bigger capacity works too. So binary-search C between <code>max(weights)</code> and <code>sum(weights)</code>, and test each guess with a greedy O(n) check.',
      code: `weights, days = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5

def days_needed(cap):
    used, load = 1, 0
    for w in weights:
        if load + w > cap:
            used, load = used + 1, 0
        load += w
    return used

lo, hi = max(weights), sum(weights)
while lo < hi:                       # find the first capacity that works
    mid = (lo + hi) // 2
    if days_needed(mid) <= days:
        hi = mid
    else:
        lo = mid + 1
print("min capacity:", lo)`,
    },
    {
      heading: 'Rotated arrays: one half is always sorted',
      body: 'In a rotated sorted array, compare <code>nums[lo]</code> with <code>nums[mid]</code> to see which half is in order. If the target lies inside that ordered half, search there; otherwise search the other half.',
      note: { label: 'Common trap', body: 'Mixing up <code>lo &lt;= hi</code> (search for an exact value, exits when empty) and <code>lo &lt; hi</code> (search for a boundary, exits when lo == hi). Pick one style per problem and keep its invariant.' },
    },
  ],
  exercises: [
    problem('first_failing_build', {
      hint: 'The builds go pass, pass, …, fail, fail. When mid fails, record it and continue left (hi = mid - 1); otherwise go right.',
      complexity: 'O(log n) calls · O(1) space',
    }),
    problem('search_rotated', {
      hint: 'At each step one half of [lo, mid, hi] is sorted. Check whether the target falls inside that sorted half to decide where to go.',
      complexity: 'O(log n) time · O(1) space',
    }),
    problem('min_truck_capacity', {
      hint: 'Binary search over the capacity, from max(weights) to sum(weights). For a guess, simulate the days greedily and check the count.',
      complexity: 'O(n log(sum of weights)) time · O(1) space',
    }),
  ],
};

export default binarySearchModule;

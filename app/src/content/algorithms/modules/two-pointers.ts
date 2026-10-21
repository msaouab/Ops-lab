import type { Module, PythonExercise } from '../../types';
import { problem } from '../problems';

const twoPointersModule: Module<PythonExercise> = {
  id: 'two-pointers',
  title: 'Two Pointers',
  tags: 'opposite ends · same direction · expand from centre',
  parents: ['hashing'],
  summary: 'Two indices moving through the data replace a nested loop. Works best on sorted input and symmetric problems like palindromes.',
  lesson: [
    {
      heading: 'Spot it',
      body: 'Two pointers fit when:',
      list: [
        'the input is <b>sorted</b> (or you may sort it) and you look for a pair or triple with a target sum',
        'you compare elements from both ends: palindromes, reversing, "container" problems',
        'you rewrite an array in place: remove duplicates, move zeros (a slow writer and a fast reader)',
      ],
    },
    {
      heading: 'The idea: every move discards impossible answers',
      body: 'On a sorted array with <code>lo</code> at the start and <code>hi</code> at the end: if the sum is too small, moving <code>hi</code> left can only make it smaller, so <code>lo</code> must move right. Each step rules out a whole row of pairs, so the search is O(n) instead of O(n²).',
      code: `nums = sorted([8, -1, 3, 5, 1, 12])
target = 13
lo, hi = 0, len(nums) - 1
while lo < hi:
    s = nums[lo] + nums[hi]
    print(f"lo={nums[lo]:>2} hi={nums[hi]:>2} sum={s}")
    if s == target:
        print("pair:", nums[lo], nums[hi])
        break
    if s < target:
        lo += 1          # need a bigger sum
    else:
        hi -= 1          # need a smaller sum`,
    },
    {
      heading: 'Template: fix one, two-pointer the rest',
      body: 'For triples (3Sum), sort once, fix the first element with a loop, and run the pair search on the rest. Skip equal neighbours so each triple appears once. Total O(n²), better than O(n³).',
      code: `def three_sum(nums):
    nums = sorted(nums)
    out = []
    for i in range(len(nums) - 2):
        if i and nums[i] == nums[i - 1]:
            continue                       # same first number: same triples
        lo, hi = i + 1, len(nums) - 1
        while lo < hi:
            s = nums[i] + nums[lo] + nums[hi]
            if s < 0: lo += 1
            elif s > 0: hi -= 1
            else:
                out.append([nums[i], nums[lo], nums[hi]])
                lo += 1
                while lo < hi and nums[lo] == nums[lo - 1]:
                    lo += 1                # skip duplicates
                hi -= 1
    return out

print(three_sum([-1, 0, 1, 2, -1, -4]))`,
    },
    {
      heading: 'Expand from the centre',
      body: 'For palindromes, start two pointers at the same spot (odd length) or neighbours (even length) and move outwards while the characters match. There are 2n − 1 centres and each expansion is O(n), so O(n²) total with O(1) memory.',
      code: `def expand(s, lo, hi):
    while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
        lo -= 1
        hi += 1
    return s[lo + 1:hi]

s = "forgeeksskeegfor"
best = max((expand(s, c, c2) for c in range(len(s)) for c2 in (c, c + 1)), key=len)
print(best)`,
      note: { label: 'Common trap', body: 'Forgetting even-length palindromes ("abba" has no single middle character). Always try both centres.' },
    },
  ],
  exercises: [
    problem('three_sum_zero', {
      hint: 'Sort first. Fix nums[i], then find pairs in the rest with lo/hi pointers. Skip a value equal to the previous one to avoid duplicate triples.',
      complexity: 'O(n²) time · O(1) extra space (besides the output)',
    }),
    problem('longest_palindrome', {
      hint: 'Every palindrome mirrors around a centre. Try each index as an odd centre and each gap as an even centre, expanding while both ends match.',
      complexity: 'O(n²) time · O(1) space',
    }),
  ],
};

export default twoPointersModule;

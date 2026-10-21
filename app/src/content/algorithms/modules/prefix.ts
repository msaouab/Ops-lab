import type { Module, PythonExercise } from '../../types';
import { problem } from '../problems';

const prefixModule: Module<PythonExercise> = {
  id: 'prefix',
  title: 'Prefix Sums',
  tags: 'running totals · prefix + hash map',
  parents: ['hashing'],
  summary: 'Precompute running totals once, then answer any range question by subtraction. Combine with a hash map to count subarrays.',
  lesson: [
    {
      heading: 'Spot it',
      body: 'Prefix sums fit when the problem talks about:',
      list: [
        '"sum of elements between i and j", many range queries',
        '"number of subarrays whose sum is k", especially with negative numbers (where a sliding window breaks)',
        '"product of all other elements": prefix and suffix products',
      ],
    },
    {
      heading: 'The idea: sum(i..j) = prefix[j+1] - prefix[i]',
      body: '<code>prefix[k]</code> is the sum of the first <code>k</code> elements. Any range is a difference of two prefixes, so after one O(n) pass every range sum is O(1).',
      code: `nums = [3, 1, 4, 1, 5, 9]
prefix = [0]
for x in nums:
    prefix.append(prefix[-1] + x)
print("prefix:", prefix)

i, j = 2, 4                          # sum of nums[2..4] = 4 + 1 + 5
print(prefix[j + 1] - prefix[i])`,
    },
    {
      heading: 'Counting subarrays with a hash map',
      body: 'A subarray ending at <code>j</code> sums to <code>k</code> when some earlier prefix equals <code>prefix_j - k</code>. So walk once, and for each running total ask a dictionary "how many earlier prefixes had the value I need?". Start with <code>{0: 1}</code> for the empty prefix.',
      code: `nums, k = [1, 2, 3, -2, 2], 3
seen = {0: 1}          # prefix value -> how many times seen
prefix = count = 0
for x in nums:
    prefix += x
    count += seen.get(prefix - k, 0)
    seen[prefix] = seen.get(prefix, 0) + 1
    print(f"x={x:>2} prefix={prefix} need={prefix - k} count={count}")
print("subarrays summing to", k, "->", count)`,
      note: { label: 'Common trap', body: 'With negative numbers, a sliding window cannot decide when to shrink, because adding an element can make the sum smaller. Prefix sums + hash map work for any sign.' },
    },
    {
      heading: 'Prefix and suffix: "everything except me"',
      body: 'The product of all elements except <code>i</code> is (product of everything left of i) × (product of everything right of i). Two passes, no division, so zeros are no problem.',
      code: `nums = [1, 2, 3, 4]
out = [1] * len(nums)
left = 1
for i in range(len(nums)):
    out[i] = left              # product of nums[:i]
    left *= nums[i]
right = 1
for i in reversed(range(len(nums))):
    out[i] *= right            # times product of nums[i+1:]
    right *= nums[i]
print(out)`,
      note: { label: 'Interview tip', body: 'If asked for O(1) extra space, note that the output array does not count, and reuse it for the left products as above.' },
    },
  ],
  exercises: [
    problem('product_except_self', {
      hint: 'out[i] = (product of everything before i) × (product of everything after i). Fill the left products in one pass, multiply in the right products in a backwards pass.',
      complexity: 'O(n) time · O(1) extra space (besides the output)',
    }),
    problem('count_subarrays_sum', {
      hint: 'Keep a running prefix sum and a dict counting how often each prefix value appeared. A subarray ending here sums to k when prefix - k appeared before.',
      complexity: 'O(n) time · O(n) space',
    }),
  ],
};

export default prefixModule;

import type { Module, PythonExercise } from '../../types';
import { problem } from '../problems';

const slidingWindowModule: Module<PythonExercise> = {
  id: 'sliding-window',
  title: 'Sliding Window',
  tags: 'fixed size · grow & shrink · window counts',
  parents: ['two-pointers'],
  summary: 'For contiguous subarrays and substrings: keep a window [left, right], update it in O(1) per step instead of recomputing it.',
  lesson: [
    {
      heading: 'Spot it',
      body: 'The words <b>contiguous</b>, <b>subarray</b>, <b>substring</b> together with:',
      list: [
        '"of size k": a <b>fixed</b> window',
        '"longest / shortest such that…": a <b>variable</b> window that grows and shrinks',
        '"anagram / permutation of a pattern inside a text": a fixed window of character counts',
      ],
    },
    {
      heading: 'Fixed window: add the new, remove the old',
      body: 'Compute the first window, then slide: add <code>nums[right]</code>, subtract <code>nums[right - k]</code>. Each step is O(1), so the whole scan is O(n), not O(n·k).',
      code: `sales, k = [1, 12, -5, -6, 50, 3], 4
window = sum(sales[:k])
best, start = window, 0
for right in range(k, len(sales)):
    window += sales[right] - sales[right - k]
    print(f"window {sales[right - k + 1:right + 1]} = {window}")
    if window > best:
        best, start = window, right - k + 1
print("best start:", start, "total:", best)`,
    },
    {
      heading: 'Variable window: expand right, shrink left while invalid',
      body: 'Move <code>right</code> every step. When the window breaks the rule (a repeated character, a sum too large), move <code>left</code> until it is valid again. Both pointers only move forward, so the total work is O(n).',
      code: `def longest_unique(s):
    last = {}                 # char -> last index
    left = best = 0
    for right, ch in enumerate(s):
        if last.get(ch, -1) >= left:
            left = last[ch] + 1           # jump past the previous copy
        last[ch] = right
        best = max(best, right - left + 1)
        print(f"{s[left:right + 1]:<8} len={right - left + 1}")
    return best

print(longest_unique("abcabcbb"))`,
      note: { label: 'Template', body: '<code>for right in range(n): add(right); while invalid(): remove(left); left += 1; update answer</code>. Fill in "add", "remove" and "invalid" for each problem.' },
    },
    {
      heading: 'Window of counts',
      body: 'To find anagrams of a word inside a text, slide a window of the word\'s length and keep a <code>Counter</code> of its letters. Compare with the word\'s counter; drop letters whose count hits zero so the comparison stays exact.',
      code: `from collections import Counter

text, word = "cbaebabacd", "abc"
need, k = Counter(word), len(word)
window = Counter(text[:k])
hits = [0] if window == need else []
for right in range(k, len(text)):
    window[text[right]] += 1
    out = text[right - k]
    window[out] -= 1
    if not window[out]:
        del window[out]
    if window == need:
        hits.append(right - k + 1)
print(hits)`,
      note: { label: 'Common trap', body: 'Sliding windows assume that growing the window only makes things "worse" (more repeats, bigger sum). With negative numbers that is false; use prefix sums instead.' },
    },
  ],
  exercises: [
    problem('best_k_day_sales', {
      hint: 'Sum the first k days, then slide one day at a time: add the day entering, subtract the day leaving. Only replace the best on a strictly greater total.',
      complexity: 'O(n) time · O(1) space',
    }),
    problem('longest_unique_window', {
      hint: 'Grow the window with right. Remember each character\'s last index; when you meet a repeat inside the window, move left just past it.',
      complexity: 'O(n) time · O(min(n, alphabet)) space',
    }),
    problem('m2_anagram_starts', {
      hint: 'A fixed window of len(word) characters. Keep letter counts for the window and compare them with the word\'s counts as you slide.',
      complexity: 'O(n) time (26-letter alphabet) · O(1) space',
    }),
  ],
};

export default slidingWindowModule;

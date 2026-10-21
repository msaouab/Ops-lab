/** The Python scratchpad's text, kept for the whole visit. "Edit in scratchpad" writes here. */
export const scratchpad = {
  code: `# A scratchpad with real Python 3.14. Run it with Cmd/Ctrl+Enter.
from collections import Counter, deque
import heapq, bisect

nums = [5, 1, 4, 1, 5, 9, 2, 6]
print(sorted(nums))
print(Counter(nums).most_common(2))
print(heapq.nsmallest(3, nums))`,
};

// Imported once from the stubs in A2-online-test (statement, starter) plus a
// reference solution for each problem. This file is now the source of the
// app's copy: edit it to change a statement, starter or solution.
// Tests are not copied: problems.ts reads them from the repo at build time,
// and `npm test` checks every solution against them.

export interface ProblemSource {
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  /** Pattern tags from the stub header, e.g. "sliding window". */
  tags: string;
  targetMinutes: number;
  /** Set when the problem comes from a timed mock test. */
  mock?: string;
  similar?: string;
  /** Path of the stub in this repo. */
  source: string;
  prompt: string;
  starter: string;
  solution: string;
}

export const PROBLEM_SOURCES: Record<string, ProblemSource> = {
  compress_runs: {
    title: "Run-length compression",
    difficulty: "Easy",
    tags: "strings, two pointers",
    targetMinutes: 10,
    similar: "https://leetcode.com/problems/string-compression/",
    source: "A2-online-test/01-strings-stack/compress_runs.py",
    prompt: "<p>Compress consecutive repeated characters: \"aabcccc\" -&gt; \"a2bc4\". A run of length 1 keeps just the character. Return the ORIGINAL string when the compressed one is not strictly shorter.</p><pre class=\"io\">compress(\"aabcccc\") -&gt; \"a2bc4\"\ncompress(\"abc\")     -&gt; \"abc\"\ncompress(\"aabb\")    -&gt; \"aabb\"      (a2b2 is not shorter)</pre>",
    starter: `def compress(s: str) -> str:
    raise NotImplementedError
`,
    solution: `def compress(s: str) -> str:
    out = []
    i = 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]:
            j += 1
        run = j - i
        out.append(s[i] + (str(run) if run > 1 else ''))
        i = j
    packed = ''.join(out)
    return packed if len(packed) < len(s) else s
`,
  },
  decode_repeat: {
    title: "Decode repeated blocks",
    difficulty: "Medium",
    tags: "stack, strings",
    targetMinutes: 25,
    similar: "https://leetcode.com/problems/decode-string/",
    source: "A2-online-test/01-strings-stack/decode_repeat.py",
    prompt: "<p>Decode strings where k[block] means <code>block</code> repeated k times. Blocks can nest. k is a positive integer (may have several digits). Input is always valid.</p><pre class=\"io\">decode(\"3[a]2[bc]\")     -&gt; \"aaabcbc\"\ndecode(\"3[a2[c]]\")      -&gt; \"accaccacc\"\ndecode(\"2[abc]3[cd]ef\") -&gt; \"abcabccdcdcdef\"</pre>",
    starter: `def decode(s: str) -> str:
    raise NotImplementedError
`,
    solution: `def decode(s: str) -> str:
    stack = []          # (text before the block, repeat count)
    text, num = '', 0
    for ch in s:
        if ch.isdigit():
            num = num * 10 + int(ch)
        elif ch == '[':
            stack.append((text, num))
            text, num = '', 0
        elif ch == ']':
            before, k = stack.pop()
            text = before + text * k
        else:
            text += ch
    return text
`,
  },
  eval_rpn: {
    title: "RPN calculator",
    difficulty: "Medium",
    tags: "stack",
    targetMinutes: 15,
    similar: "https://leetcode.com/problems/evaluate-reverse-polish-notation/",
    source: "A2-online-test/01-strings-stack/eval_rpn.py",
    prompt: "<p>Reported in a technical interview. Evaluate an expression in Reverse Polish Notation given as a space-separated string. Operators: + - * / Division truncates toward zero (like int(a / b)). Raise ValueError for an invalid expression (not enough operands, or leftover operands).</p><pre class=\"io\">eval_rpn(\"2 1 + 3 *\")        -&gt; 9\neval_rpn(\"4 13 5 / +\")       -&gt; 6\neval_rpn(\"-7 2 /\")           -&gt; -3</pre>",
    starter: `def eval_rpn(expr: str) -> int:
    raise NotImplementedError
`,
    solution: `def eval_rpn(expr: str) -> int:
    stack = []
    for tok in expr.split():
        if tok in ('+', '-', '*', '/'):
            if len(stack) < 2:
                raise ValueError('not enough operands')
            b, a = stack.pop(), stack.pop()
            if tok == '+':
                stack.append(a + b)
            elif tok == '-':
                stack.append(a - b)
            elif tok == '*':
                stack.append(a * b)
            else:
                stack.append(int(a / b))
        else:
            stack.append(int(tok))
    if len(stack) != 1:
        raise ValueError('leftover operands')
    return stack[0]
`,
  },
  group_anagrams: {
    title: "Group anagrams",
    difficulty: "Medium",
    tags: "hashing, strings",
    targetMinutes: 15,
    similar: "https://leetcode.com/problems/group-anagrams/",
    source: "A2-online-test/01-strings-stack/group_anagrams.py",
    prompt: "<p>Group words that are anagrams of each other. Inside each group keep input order; order groups by the position of their first word in the input.</p><pre class=\"io\">group_anagrams([\"eat\", \"tea\", \"tan\", \"ate\", \"nat\", \"bat\"])\n  -&gt; [[\"eat\", \"tea\", \"ate\"], [\"tan\", \"nat\"], [\"bat\"]]</pre>",
    starter: `def group_anagrams(words: list[str]) -> list[list[str]]:
    raise NotImplementedError
`,
    solution: `def group_anagrams(words: list[str]) -> list[list[str]]:
    groups: dict[str, list[str]] = {}
    for w in words:
        groups.setdefault(''.join(sorted(w)), []).append(w)
    return list(groups.values())  # dicts keep insertion order
`,
  },
  longest_palindrome: {
    title: "Longest palindromic substring",
    difficulty: "Medium",
    tags: "strings, expand around centre / DP",
    targetMinutes: 25,
    similar: "https://leetcode.com/problems/longest-palindromic-substring/",
    source: "A2-online-test/01-strings-stack/longest_palindrome.py",
    prompt: "<p>Return the longest substring that reads the same backwards. If several have the same maximum length, return the one that starts first. O(n^2) is fine; O(n^3) will time out.</p><pre class=\"io\">longest_palindrome(\"babad\") -&gt; \"bab\"\nlongest_palindrome(\"cbbd\")  -&gt; \"bb\"</pre>",
    starter: `def longest_palindrome(s: str) -> str:
    raise NotImplementedError
`,
    solution: `def longest_palindrome(s: str) -> str:
    best_start, best_len = 0, 0
    for centre in range(len(s)):
        for lo, hi in ((centre, centre), (centre, centre + 1)):
            while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
                lo -= 1
                hi += 1
            length = hi - lo - 1
            if length > best_len:
                best_start, best_len = lo + 1, length
    return s[best_start:best_start + best_len]
`,
  },
  next_warmer_day: {
    title: "Days until a warmer day",
    difficulty: "Medium",
    tags: "monotonic stack",
    targetMinutes: 20,
    similar: "https://leetcode.com/problems/daily-temperatures/",
    source: "A2-online-test/01-strings-stack/next_warmer_day.py",
    prompt: "<p>For each day, how many days until a strictly warmer temperature? 0 if never. Must be O(n): a nested loop will time out on the big test.</p><pre class=\"io\">next_warmer([73, 74, 75, 71, 69, 72, 76, 73]) -&gt; [1, 1, 4, 2, 1, 1, 0, 0]</pre>",
    starter: `def next_warmer(temps: list[int]) -> list[int]:
    raise NotImplementedError
`,
    solution: `def next_warmer(temps: list[int]) -> list[int]:
    answer = [0] * len(temps)
    stack = []  # indices of days still waiting, temperatures decreasing
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer
`,
  },
  valid_markup: {
    title: "Valid markup",
    difficulty: "Easy",
    tags: "stack, strings",
    targetMinutes: 15,
    similar: "https://leetcode.com/problems/valid-parentheses/",
    source: "A2-online-test/01-strings-stack/valid_markup.py",
    prompt: "<p>Reported in an online test: check that HTML-like tags are correctly nested.</p><p>Given a string containing tags like &lt;b&gt;, &lt;/b&gt;, &lt;div&gt;, &lt;/div&gt; and plain text, return True when every opening tag is closed in the right order.</p><ul><li>Tag names are lowercase letters only.</li><li>Self-closing tags like &lt;br/&gt; are always valid and need no closing tag.</li><li>Text between tags is ignored.</li></ul><pre class=\"io\">is_valid_markup(\"&lt;div&gt;&lt;b&gt;hi&lt;/b&gt;&lt;/div&gt;\")   -&gt; True\nis_valid_markup(\"&lt;div&gt;&lt;b&gt;hi&lt;/div&gt;&lt;/b&gt;\")   -&gt; False\nis_valid_markup(\"&lt;p&gt;line&lt;br/&gt;next&lt;/p&gt;\")   -&gt; True\nis_valid_markup(\"&lt;/p&gt;\")                   -&gt; False</pre>",
    starter: `import re

def is_valid_markup(s: str) -> bool:
    raise NotImplementedError
`,
    solution: `import re

def is_valid_markup(s: str) -> bool:
    stack = []
    for closing, name, self_closing in re.findall(r'<(/?)([a-z]+)(/?)>', s):
        if self_closing:
            continue
        if not closing:
            stack.append(name)
        elif not stack or stack.pop() != name:
            return False
    return not stack
`,
  },
  best_k_day_sales: {
    title: "Best k consecutive days",
    difficulty: "Easy",
    tags: "fixed sliding window",
    targetMinutes: 10,
    similar: "https://leetcode.com/problems/maximum-average-subarray-i/",
    source: "A2-online-test/02-arrays-window-search/best_k_day_sales.py",
    prompt: "<p>sales[i] is the revenue of day i. Return the start index of the k consecutive days with the highest total (earliest on ties). Return -1 when k &gt; len(sales) or k &lt;= 0. O(n).</p><pre class=\"io\">best_window([1, 12, -5, -6, 50, 3], 4) -&gt; 1    (12-5-6+50 = 51)</pre>",
    starter: `def best_window(sales: list[int], k: int) -> int:
    raise NotImplementedError
`,
    solution: `def best_window(sales: list[int], k: int) -> int:
    if k <= 0 or k > len(sales):
        return -1
    window = sum(sales[:k])
    best, best_start = window, 0
    for right in range(k, len(sales)):
        window += sales[right] - sales[right - k]
        if window > best:
            best, best_start = window, right - k + 1
    return best_start
`,
  },
  count_subarrays_sum: {
    title: "Count subarrays with a given sum",
    difficulty: "Medium",
    tags: "prefix sums + hashing",
    targetMinutes: 25,
    similar: "https://leetcode.com/problems/subarray-sum-equals-k/",
    source: "A2-online-test/02-arrays-window-search/count_subarrays_sum.py",
    prompt: "<p>Count the contiguous subarrays whose sum equals k. Values can be negative, so a sliding window does not work. O(n) with prefix sums.</p><pre class=\"io\">count_subarrays([1, 1, 1], 2) -&gt; 2\ncount_subarrays([1, 2, 3], 3) -&gt; 2</pre>",
    starter: `def count_subarrays(nums: list[int], k: int) -> int:
    raise NotImplementedError
`,
    solution: `def count_subarrays(nums: list[int], k: int) -> int:
    seen = {0: 1}   # prefix sum -> how many times we have seen it
    prefix = count = 0
    for x in nums:
        prefix += x
        count += seen.get(prefix - k, 0)
        seen[prefix] = seen.get(prefix, 0) + 1
    return count
`,
  },
  first_failing_build: {
    title: "First failing build",
    difficulty: "Easy",
    tags: "binary search on answer",
    targetMinutes: 10,
    similar: "https://leetcode.com/problems/first-bad-version/",
    source: "A2-online-test/02-arrays-window-search/first_failing_build.py",
    prompt: "<p>Builds 1..n were run; from some build on, every build fails. <code>is_failing(v)</code> tells you whether build v fails. Return the first failing build, or -1 if none fail. You may call is_failing at most ~log2(n) + 2 times (the test counts the calls).</p>",
    starter: `def first_failing(n: int, is_failing) -> int:
    raise NotImplementedError
`,
    solution: `def first_failing(n: int, is_failing) -> int:
    lo, hi = 1, n
    answer = -1
    while lo <= hi:
        mid = (lo + hi) // 2
        if is_failing(mid):
            answer, hi = mid, mid - 1
        else:
            lo = mid + 1
    return answer
`,
  },
  longest_streak: {
    title: "Longest consecutive streak",
    difficulty: "Medium",
    tags: "hash set",
    targetMinutes: 20,
    similar: "https://leetcode.com/problems/longest-consecutive-sequence/",
    source: "A2-online-test/02-arrays-window-search/longest_streak.py",
    prompt: "<p>Given unsorted integers, return the length of the longest run of consecutive values (e.g. 1,2,3,4). Sorting gives O(n log n); the interviewer will ask for the O(n) set-based approach, so write that one.</p><pre class=\"io\">longest_streak([100, 4, 200, 1, 3, 2]) -&gt; 4</pre>",
    starter: `def longest_streak(nums: list[int]) -> int:
    raise NotImplementedError
`,
    solution: `def longest_streak(nums: list[int]) -> int:
    values = set(nums)
    best = 0
    for x in values:
        if x - 1 not in values:          # only start counting at the start of a run
            length = 1
            while x + length in values:
                length += 1
            best = max(best, length)
    return best
`,
  },
  longest_unique_window: {
    title: "Longest substring without repeats",
    difficulty: "Medium",
    tags: "sliding window",
    targetMinutes: 20,
    similar: "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
    source: "A2-online-test/02-arrays-window-search/longest_unique_window.py",
    prompt: "<p>Return the length of the longest substring with no repeated character.</p><pre class=\"io\">longest_unique(\"abcabcbb\") -&gt; 3   (\"abc\")\nlongest_unique(\"pwwkew\")   -&gt; 3   (\"wke\")</pre>",
    starter: `def longest_unique(s: str) -> int:
    raise NotImplementedError
`,
    solution: `def longest_unique(s: str) -> int:
    last = {}       # char -> last index seen
    left = best = 0
    for right, ch in enumerate(s):
        if last.get(ch, -1) >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best
`,
  },
  min_truck_capacity: {
    title: "Smallest truck capacity",
    difficulty: "Medium",
    tags: "binary search on answer",
    targetMinutes: 25,
    similar: "https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/",
    source: "A2-online-test/02-arrays-window-search/min_truck_capacity.py",
    prompt: "<p>Packages must leave the warehouse in the given order. Each day one truck takes a prefix of the remaining packages without exceeding its capacity. Return the smallest capacity that ships everything within <code>days</code> days.</p><pre class=\"io\">min_capacity([1,2,3,4,5,6,7,8,9,10], 5) -&gt; 15</pre>",
    starter: `def min_capacity(weights: list[int], days: int) -> int:
    raise NotImplementedError
`,
    solution: `def min_capacity(weights: list[int], days: int) -> int:
    def days_needed(cap: int) -> int:
        used, load = 1, 0
        for w in weights:
            if load + w > cap:
                used += 1
                load = 0
            load += w
        return used

    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = (lo + hi) // 2
        if days_needed(mid) <= days:
            hi = mid
        else:
            lo = mid + 1
    return lo
`,
  },
  pair_for_budget: {
    title: "Two products for a budget",
    difficulty: "Easy",
    tags: "hashing",
    targetMinutes: 10,
    similar: "https://leetcode.com/problems/two-sum/",
    source: "A2-online-test/02-arrays-window-search/pair_for_budget.py",
    prompt: "<p>prices[i] is the price of product i. Return the indices (i, j) with i &lt; j of the two products whose prices add up exactly to <code>budget</code>. If several pairs work, return the one whose j is smallest (then the smallest i). Return None when no pair exists. O(n).</p><pre class=\"io\">pair_for_budget([2, 7, 11, 15], 9) -&gt; (0, 1)</pre>",
    starter: `def pair_for_budget(prices: list[int], budget: int) -> tuple[int, int] | None:
    raise NotImplementedError
`,
    solution: `def pair_for_budget(prices: list[int], budget: int) -> tuple[int, int] | None:
    first_seen = {}  # price -> smallest index
    for j, p in enumerate(prices):
        i = first_seen.get(budget - p)
        if i is not None:
            return (i, j)
        first_seen.setdefault(p, j)
    return None
`,
  },
  product_except_self: {
    title: "Product of all other items",
    difficulty: "Medium",
    tags: "prefix / suffix",
    targetMinutes: 20,
    similar: "https://leetcode.com/problems/product-of-array-except-self/",
    source: "A2-online-test/02-arrays-window-search/product_except_self.py",
    prompt: "<p>Return a list where out[i] is the product of every element except nums[i]. Do it in O(n) WITHOUT using division (zeros must work).</p><pre class=\"io\">product_except_self([1, 2, 3, 4]) -&gt; [24, 12, 8, 6]</pre>",
    starter: `def product_except_self(nums: list[int]) -> list[int]:
    raise NotImplementedError
`,
    solution: `def product_except_self(nums: list[int]) -> list[int]:
    out = [1] * len(nums)
    left = 1
    for i in range(len(nums)):
        out[i] = left
        left *= nums[i]
    right = 1
    for i in range(len(nums) - 1, -1, -1):
        out[i] *= right
        right *= nums[i]
    return out
`,
  },
  search_rotated: {
    title: "Search a rotated sorted list",
    difficulty: "Medium",
    tags: "binary search",
    targetMinutes: 20,
    similar: "https://leetcode.com/problems/search-in-rotated-sorted-array/",
    source: "A2-online-test/02-arrays-window-search/search_rotated.py",
    prompt: "<p>A sorted list of DISTINCT integers was rotated at an unknown pivot ([0,1,2,4,5,6,7] -&gt; [4,5,6,7,0,1,2]). Return the index of target or -1. O(log n).</p>",
    starter: `def search_rotated(nums: list[int], target: int) -> int:
    raise NotImplementedError
`,
    solution: `def search_rotated(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:                      # left half is sorted
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:                                          # right half is sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
`,
  },
  three_sum_zero: {
    title: "Three numbers summing to zero",
    difficulty: "Medium",
    tags: "sort + two pointers",
    targetMinutes: 25,
    similar: "https://leetcode.com/problems/3sum/",
    source: "A2-online-test/02-arrays-window-search/three_sum_zero.py",
    prompt: "<p>Return all UNIQUE triplets [a, b, c] (a &lt;= b &lt;= c) from nums with a + b + c == 0, sorted ascending as lists. O(n^2).</p><pre class=\"io\">three_sum([-1, 0, 1, 2, -1, -4]) -&gt; [[-1, -1, 2], [-1, 0, 1]]</pre>",
    starter: `def three_sum(nums: list[int]) -> list[list[int]]:
    raise NotImplementedError
`,
    solution: `def three_sum(nums: list[int]) -> list[list[int]]:
    nums = sorted(nums)
    out = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        lo, hi = i + 1, len(nums) - 1
        while lo < hi:
            total = nums[i] + nums[lo] + nums[hi]
            if total < 0:
                lo += 1
            elif total > 0:
                hi -= 1
            else:
                out.append([nums[i], nums[lo], nums[hi]])
                lo += 1
                while lo < hi and nums[lo] == nums[lo - 1]:
                    lo += 1
                hi -= 1
    return out
`,
  },
  has_cycle: {
    title: "Detect a cycle",
    difficulty: "Easy",
    tags: "fast / slow pointers",
    targetMinutes: 10,
    similar: "https://leetcode.com/problems/linked-list-cycle/",
    source: "A2-online-test/03-lists-trees-heaps/has_cycle.py",
    prompt: "<p>Return True if the linked list contains a cycle. O(1) extra space (Floyd's tortoise and hare).</p>",
    starter: `from structures import ListNode

def has_cycle(head: ListNode | None) -> bool:
    raise NotImplementedError
`,
    solution: `from structures import ListNode

def has_cycle(head: ListNode | None) -> bool:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False
`,
  },
  k_closest_depots: {
    title: "K closest depots",
    difficulty: "Medium",
    tags: "heap",
    targetMinutes: 15,
    similar: "https://leetcode.com/problems/k-closest-points-to-origin/",
    source: "A2-online-test/03-lists-trees-heaps/k_closest_depots.py",
    prompt: "<p>points are (x, y) depot coordinates. Return the k closest to the origin (Euclidean), sorted by distance, ties broken by (x, y). Use a heap: O(n log k).</p>",
    starter: `import heapq

def k_closest(points: list[tuple[int, int]], k: int) -> list[tuple[int, int]]:
    raise NotImplementedError
`,
    solution: `import heapq

def k_closest(points: list[tuple[int, int]], k: int) -> list[tuple[int, int]]:
    if k <= 0:
        return []
    heap = []  # max-heap of the k best so far, via negated keys
    for x, y in points:
        key = (-(x * x + y * y), -x, -y)
        if len(heap) < k:
            heapq.heappush(heap, (key, (x, y)))
        elif key > heap[0][0]:
            heapq.heapreplace(heap, (key, (x, y)))
    return [p for _, p in sorted(heap, reverse=True)]
`,
  },
  merge_bookings: {
    title: "Merge overlapping bookings",
    difficulty: "Medium",
    tags: "intervals, sorting",
    targetMinutes: 15,
    similar: "https://leetcode.com/problems/merge-intervals/",
    source: "A2-online-test/03-lists-trees-heaps/merge_bookings.py",
    prompt: "<p>Bookings are [start, end] pairs. Merge overlapping ones (touching counts as overlapping: [1,4] and [4,5] -&gt; [1,5]). Return them sorted by start.</p>",
    starter: `def merge_bookings(bookings: list[list[int]]) -> list[list[int]]:
    raise NotImplementedError
`,
    solution: `def merge_bookings(bookings: list[list[int]]) -> list[list[int]]:
    merged = []
    for start, end in sorted(bookings):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged
`,
  },
  merge_k_sorted: {
    title: "Merge k sorted feeds",
    difficulty: "Hard",
    tags: "heap",
    targetMinutes: 20,
    similar: "https://leetcode.com/problems/merge-k-sorted-lists/",
    source: "A2-online-test/03-lists-trees-heaps/merge_k_sorted.py",
    prompt: "<p>Merge k sorted Python lists into one sorted list in O(N log k). Do not just concatenate and sort.</p>",
    starter: `import heapq

def merge_k(lists: list[list[int]]) -> list[int]:
    raise NotImplementedError
`,
    solution: `import heapq

def merge_k(lists: list[list[int]]) -> list[int]:
    heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
    heapq.heapify(heap)
    out = []
    while heap:
        value, i, j = heapq.heappop(heap)
        out.append(value)
        if j + 1 < len(lists[i]):
            heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
    return out
`,
  },
  merge_sorted_lists: {
    title: "Merge two sorted linked lists",
    difficulty: "Easy",
    tags: "linked list",
    targetMinutes: 10,
    similar: "https://leetcode.com/problems/merge-two-sorted-lists/",
    source: "A2-online-test/03-lists-trees-heaps/merge_sorted_lists.py",
    prompt: "<p>Merge two sorted linked lists into one sorted list by relinking the nodes. Return the head.</p>",
    starter: `from structures import ListNode

def merge(a: ListNode | None, b: ListNode | None) -> ListNode | None:
    raise NotImplementedError
`,
    solution: `from structures import ListNode

def merge(a: ListNode | None, b: ListNode | None) -> ListNode | None:
    dummy = tail = ListNode()
    while a and b:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b
    return dummy.next
`,
  },
  reverse_linked: {
    title: "Reverse a linked list",
    difficulty: "Easy",
    tags: "linked list",
    targetMinutes: 10,
    similar: "https://leetcode.com/problems/reverse-linked-list/",
    source: "A2-online-test/03-lists-trees-heaps/reverse_linked.py",
    prompt: "<p>Reverse a singly linked list in place and return the new head. Iteratively, O(1) extra space. Helpers in structures.py: ListNode, to_linked([1,2,3]), to_list(head).</p>",
    starter: `from structures import ListNode

def reverse(head: ListNode | None) -> ListNode | None:
    raise NotImplementedError
`,
    solution: `from structures import ListNode

def reverse(head: ListNode | None) -> ListNode | None:
    prev = None
    while head:
        head.next, prev, head = prev, head, head.next
    return prev
`,
  },
  rooms_needed: {
    title: "Meeting rooms needed",
    difficulty: "Medium",
    tags: "intervals, heap / sweep",
    targetMinutes: 20,
    similar: "https://leetcode.com/problems/meeting-rooms-ii/",
    source: "A2-online-test/03-lists-trees-heaps/rooms_needed.py",
    prompt: "<p>Meetings are (start, end) with end exclusive: a meeting ending at 10 frees its room for one starting at 10. Return the minimum number of rooms needed.</p>",
    starter: `def rooms_needed(meetings: list[tuple[int, int]]) -> int:
    raise NotImplementedError
`,
    solution: `import heapq

def rooms_needed(meetings: list[tuple[int, int]]) -> int:
    ends = []  # end times of meetings currently using a room
    for start, end in sorted(meetings):
        if ends and ends[0] <= start:
            heapq.heapreplace(ends, end)   # reuse the room that frees up first
        else:
            heapq.heappush(ends, end)
    return len(ends)
`,
  },
  running_median: {
    title: "Running median",
    difficulty: "Hard",
    tags: "two heaps",
    targetMinutes: 25,
    similar: "https://leetcode.com/problems/find-median-from-data-stream/",
    source: "A2-online-test/03-lists-trees-heaps/running_median.py",
    prompt: "<p>Implement MedianTracker with add(x) and median() -&gt; float. Both must be O(log n) / O(1). median() of an empty tracker raises ValueError.</p>",
    starter: `import heapq

class MedianTracker:
    def add(self, x: int) -> None:
        raise NotImplementedError

    def median(self) -> float:
        raise NotImplementedError
`,
    solution: `import heapq

class MedianTracker:
    def __init__(self):
        self.low = []   # max-heap (negated): the smaller half
        self.high = []  # min-heap: the larger half

    def add(self, x: int) -> None:
        heapq.heappush(self.low, -x)
        heapq.heappush(self.high, -heapq.heappop(self.low))
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def median(self) -> float:
        if not self.low:
            raise ValueError('no values yet')
        if len(self.low) > len(self.high):
            return float(-self.low[0])
        return (-self.low[0] + self.high[0]) / 2
`,
  },
  same_tree: {
    title: "Same tree",
    difficulty: "Easy",
    tags: "binary tree, recursion",
    targetMinutes: 10,
    similar: "https://leetcode.com/problems/same-tree/",
    source: "A2-online-test/03-lists-trees-heaps/same_tree.py",
    prompt: "<p>Reported in a 2026 final technical round. Return True when two binary trees have the same shape and the same values. Then be ready to answer: what is the complexity, and how would you do it iteratively?</p>",
    starter: `from structures import TreeNode

def same_tree(a: TreeNode | None, b: TreeNode | None) -> bool:
    raise NotImplementedError
`,
    solution: `from structures import TreeNode

def same_tree(a: TreeNode | None, b: TreeNode | None) -> bool:
    if a is None or b is None:
        return a is b
    return a.val == b.val and same_tree(a.left, b.left) and same_tree(a.right, b.right)
`,
  },
  tree_levels: {
    title: "Tree level by level",
    difficulty: "Medium",
    tags: "BFS",
    targetMinutes: 15,
    similar: "https://leetcode.com/problems/binary-tree-level-order-traversal/",
    source: "A2-online-test/03-lists-trees-heaps/tree_levels.py",
    prompt: "<p>Return the values of a binary tree level by level: [[root], [children], ...]. Also return the maximum depth with a second function.</p>",
    starter: `from collections import deque
from structures import TreeNode

def levels(root: TreeNode | None) -> list[list[int]]:
    raise NotImplementedError


def max_depth(root: TreeNode | None) -> int:
    raise NotImplementedError
`,
    solution: `from collections import deque
from structures import TreeNode

def levels(root: TreeNode | None) -> list[list[int]]:
    if root is None:
        return []
    out, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):        # exactly the nodes of this level
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        out.append(level)
    return out

def max_depth(root: TreeNode | None) -> int:
    if root is None:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))
`,
  },
  valid_bst: {
    title: "Validate a search tree",
    difficulty: "Medium",
    tags: "DFS with bounds",
    targetMinutes: 15,
    similar: "https://leetcode.com/problems/validate-binary-search-tree/",
    source: "A2-online-test/03-lists-trees-heaps/valid_bst.py",
    prompt: "<p>Return True if the tree is a valid binary search tree: every node is strictly greater than all values in its left subtree and strictly smaller than all values in its right subtree. Careful: checking only direct children is the classic wrong answer.</p>",
    starter: `from structures import TreeNode

def is_bst(root: TreeNode | None) -> bool:
    raise NotImplementedError
`,
    solution: `from structures import TreeNode

def is_bst(root: TreeNode | None) -> bool:
    def check(node, low, high):
        if node is None:
            return True
        if not (low < node.val < high):
            return False
        return check(node.left, low, node.val) and check(node.right, node.val, high)
    return check(root, float('-inf'), float('inf'))
`,
  },
  count_zones: {
    title: "Count delivery zones",
    difficulty: "Medium",
    tags: "grid DFS / BFS",
    targetMinutes: 15,
    similar: "https://leetcode.com/problems/number-of-islands/",
    source: "A2-online-test/04-graphs/count_zones.py",
    prompt: "<p>A map is a list of strings: \"#\" is a built-up cell, \".\" is empty. Cells connect up, down, left and right (not diagonally). Count the separate built-up zones. Do not modify the input.</p><pre class=\"io\">count_zones([\"##..\", \"##..\", \"..#.\", \"...#\"]) -&gt; 3</pre>",
    starter: `def count_zones(grid: list[str]) -> int:
    raise NotImplementedError
`,
    solution: `def count_zones(grid: list[str]) -> int:
    rows, cols = len(grid), len(grid[0]) if grid else 0
    seen = set()
    zones = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != '#' or (r, c) in seen:
                continue
            zones += 1
            stack = [(r, c)]
            seen.add((r, c))
            while stack:
                y, x = stack.pop()
                for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= ny < rows and 0 <= nx < cols and grid[ny][nx] == '#' and (ny, nx) not in seen:
                        seen.add((ny, nx))
                        stack.append((ny, nx))
    return zones
`,
  },
  fastest_delivery: {
    title: "Fastest delivery time",
    difficulty: "Medium",
    tags: "Dijkstra",
    targetMinutes: 25,
    similar: "https://leetcode.com/problems/network-delay-time/",
    source: "A2-online-test/04-graphs/fastest_delivery.py",
    prompt: "<p>roads is a list of (from, to, minutes) one-way roads between depots 1..n. Return the minimum minutes to reach <code>target</code> from <code>source</code>, or -1 if unreachable.</p>",
    starter: `import heapq

def fastest(n: int, roads: list[tuple[int, int, int]], source: int, target: int) -> int:
    raise NotImplementedError
`,
    solution: `import heapq

def fastest(n: int, roads: list[tuple[int, int, int]], source: int, target: int) -> int:
    graph = {v: [] for v in range(1, n + 1)}
    for a, b, minutes in roads:
        graph[a].append((b, minutes))
    best = {source: 0}
    heap = [(0, source)]
    while heap:
        d, v = heapq.heappop(heap)
        if v == target:
            return d
        if d > best[v]:
            continue                      # stale entry
        for w, minutes in graph[v]:
            nd = d + minutes
            if nd < best.get(w, float('inf')):
                best[w] = nd
                heapq.heappush(heap, (nd, w))
    return -1
`,
  },
  install_order: {
    title: "Module install order",
    difficulty: "Medium",
    tags: "topological sort",
    targetMinutes: 25,
    similar: "https://leetcode.com/problems/course-schedule-ii/",
    source: "A2-online-test/04-graphs/install_order.py",
    prompt: "<p>Very ERP: modules declare dependencies in their manifest (\"depends\"). deps maps each module to the list of modules it depends on. Return an install order where every module comes after all its dependencies. Among modules that are ready at the same time, pick the alphabetically smallest first (so the answer is unique). Modules that appear only as dependencies must be included too. Raise ValueError if there is a circular dependency.</p><pre class=\"io\">install_order({\"sale\": [\"base\", \"product\"], \"product\": [\"base\"], \"base\": []})\n  -&gt; [\"base\", \"product\", \"sale\"]</pre>",
    starter: `import heapq

def install_order(deps: dict[str, list[str]]) -> list[str]:
    raise NotImplementedError
`,
    solution: `import heapq

def install_order(deps: dict[str, list[str]]) -> list[str]:
    modules = set(deps) | {d for ds in deps.values() for d in ds}
    waiting = {m: 0 for m in modules}          # unmet dependencies
    users = {m: [] for m in modules}           # who depends on m
    for m, ds in deps.items():
        for d in set(ds):
            waiting[m] += 1
            users[d].append(m)
    ready = [m for m in modules if waiting[m] == 0]
    heapq.heapify(ready)
    order = []
    while ready:
        m = heapq.heappop(ready)
        order.append(m)
        for u in users[m]:
            waiting[u] -= 1
            if waiting[u] == 0:
                heapq.heappush(ready, u)
    if len(order) != len(modules):
        raise ValueError('circular dependency')
    return order
`,
  },
  partner_groups: {
    title: "Group partners into companies",
    difficulty: "Medium",
    tags: "union-find",
    targetMinutes: 20,
    similar: "https://leetcode.com/problems/number-of-provinces/",
    source: "A2-online-test/04-graphs/partner_groups.py",
    prompt: "<p>Contacts 0..n-1 and a list of links (a, b) meaning \"same company\". Return the number of companies, and with a second function the size of the largest one. Use union-find (with path compression).</p>",
    starter: `def count_groups(n: int, links: list[tuple[int, int]]) -> int:
    raise NotImplementedError


def largest_group(n: int, links: list[tuple[int, int]]) -> int:
    raise NotImplementedError
`,
    solution: `def _roots(n: int, links: list[tuple[int, int]]) -> list[int]:
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]   # path compression (halving)
            x = parent[x]
        return x

    for a, b in links:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
    return [find(x) for x in range(n)]

def count_groups(n: int, links: list[tuple[int, int]]) -> int:
    return len(set(_roots(n, links)))

def largest_group(n: int, links: list[tuple[int, int]]) -> int:
    if n == 0:
        return 0
    sizes = {}
    for r in _roots(n, links):
        sizes[r] = sizes.get(r, 0) + 1
    return max(sizes.values())
`,
  },
  shortest_route: {
    title: "Shortest route on a grid",
    difficulty: "Medium",
    tags: "BFS",
    targetMinutes: 20,
    similar: "https://leetcode.com/problems/shortest-path-in-binary-matrix/",
    source: "A2-online-test/04-graphs/shortest_route.py",
    prompt: "<p>A bus moves on a grid (\".\" road, \"#\" blocked) in 4 directions. Return the minimum number of moves from start (row, col) to goal, or -1 if unreachable.</p>",
    starter: `from collections import deque

def shortest_route(grid: list[str], start: tuple[int, int], goal: tuple[int, int]) -> int:
    raise NotImplementedError
`,
    solution: `from collections import deque

def shortest_route(grid: list[str], start: tuple[int, int], goal: tuple[int, int]) -> int:
    rows, cols = len(grid), len(grid[0])
    if grid[start[0]][start[1]] == '#' or grid[goal[0]][goal[1]] == '#':
        return -1
    queue = deque([(start, 0)])
    seen = {start}
    while queue:
        (r, c), dist = queue.popleft()
        if (r, c) == goal:
            return dist
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != '#' and (nr, nc) not in seen:
                seen.add((nr, nc))
                queue.append(((nr, nc), dist + 1))
    return -1
`,
  },
  cheapest_climb: {
    title: "Cheapest way up the stairs",
    difficulty: "Easy",
    tags: "1D DP",
    targetMinutes: 10,
    similar: "https://leetcode.com/problems/min-cost-climbing-stairs/",
    source: "A2-online-test/05-dynamic-programming/cheapest_climb.py",
    prompt: "<p>cost[i] is paid when you step on stair i. You start on stair 0 or 1 and climb 1 or 2 stairs at a time. Return the minimum cost to reach the top (just past the last stair).</p><pre class=\"io\">cheapest_climb([10, 15, 20]) -&gt; 15</pre>",
    starter: `def cheapest_climb(cost: list[int]) -> int:
    raise NotImplementedError
`,
    solution: `def cheapest_climb(cost: list[int]) -> int:
    # a, b = cheapest cost to stand on the stair two back / one back
    a = b = 0
    for i in range(2, len(cost) + 1):
        a, b = b, min(b + cost[i - 1], a + cost[i - 2])
    return b
`,
  },
  common_subsequence: {
    title: "Longest common subsequence",
    difficulty: "Medium",
    tags: "2D DP",
    targetMinutes: 20,
    similar: "https://leetcode.com/problems/longest-common-subsequence/",
    source: "A2-online-test/05-dynamic-programming/common_subsequence.py",
    prompt: "<p>Return the length of the longest subsequence common to both strings, then with a second function return one such subsequence (any valid one of maximum length).</p>",
    starter: `def lcs_length(a: str, b: str) -> int:
    raise NotImplementedError


def lcs(a: str, b: str) -> str:
    raise NotImplementedError
`,
    solution: `def _table(a: str, b: str) -> list[list[int]]:
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) - 1, -1, -1):
        for j in range(len(b) - 1, -1, -1):
            if a[i] == b[j]:
                dp[i][j] = 1 + dp[i + 1][j + 1]
            else:
                dp[i][j] = max(dp[i + 1][j], dp[i][j + 1])
    return dp

def lcs_length(a: str, b: str) -> int:
    return _table(a, b)[0][0]

def lcs(a: str, b: str) -> str:
    dp = _table(a, b)
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] == b[j]:
            out.append(a[i])
            i += 1
            j += 1
        elif dp[i + 1][j] >= dp[i][j + 1]:
            i += 1
        else:
            j += 1
    return ''.join(out)
`,
  },
  edit_distance: {
    title: "Edit distance",
    difficulty: "Medium",
    tags: "2D DP",
    targetMinutes: 25,
    similar: "https://leetcode.com/problems/edit-distance/",
    source: "A2-online-test/05-dynamic-programming/edit_distance.py",
    prompt: "<p>Minimum number of single-character inserts, deletes or replacements to turn a into b. Useful for \"did you mean\" on partner names.</p><pre class=\"io\">edit_distance(\"horse\", \"ros\") -&gt; 3</pre>",
    starter: `def edit_distance(a: str, b: str) -> int:
    raise NotImplementedError
`,
    solution: `def edit_distance(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))         # distance from '' to b[:j]
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                cur[j] = prev[j - 1]
            else:
                cur[j] = 1 + min(prev[j],      # delete
                                 cur[j - 1],   # insert
                                 prev[j - 1])  # replace
        prev = cur
    return prev[-1]
`,
  },
  equal_split: {
    title: "Split into two equal halves",
    difficulty: "Medium",
    tags: "subset-sum DP",
    targetMinutes: 20,
    similar: "https://leetcode.com/problems/partition-equal-subset-sum/",
    source: "A2-online-test/05-dynamic-programming/equal_split.py",
    prompt: "<p>Can the positive integers be split into two groups with equal sums?</p>",
    starter: `def can_split_equal(nums: list[int]) -> bool:
    raise NotImplementedError
`,
    solution: `def can_split_equal(nums: list[int]) -> bool:
    total = sum(nums)
    if total % 2:
        return False
    target = total // 2
    reachable = [True] + [False] * target   # reachable[s]: some subset sums to s
    for x in nums:
        for s in range(target, x - 1, -1):  # backwards: each number used once
            reachable[s] = reachable[s] or reachable[s - x]
    return reachable[target]
`,
  },
  fewest_coins: {
    title: "Fewest coins for change",
    difficulty: "Medium",
    tags: "unbounded knapsack",
    targetMinutes: 20,
    similar: "https://leetcode.com/problems/coin-change/",
    source: "A2-online-test/05-dynamic-programming/fewest_coins.py",
    prompt: "<p>Return the fewest coins needed to make <code>amount</code> (unlimited coins of each value), or -1. Greedy is wrong: coins [1, 3, 4], amount 6 -&gt; 2 (3+3), greedy gives 3 (4+1+1). Second function: number_of_ways(coins, amount) = how many combinations (order does not matter).</p>",
    starter: `def fewest_coins(coins: list[int], amount: int) -> int:
    raise NotImplementedError


def number_of_ways(coins: list[int], amount: int) -> int:
    raise NotImplementedError
`,
    solution: `def fewest_coins(coins: list[int], amount: int) -> int:
    INF = amount + 1
    best = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and best[a - c] + 1 < best[a]:
                best[a] = best[a - c] + 1
    return best[amount] if best[amount] != INF else -1

def number_of_ways(coins: list[int], amount: int) -> int:
    ways = [1] + [0] * amount
    for c in coins:                  # coin loop outside: combinations, not orderings
        for a in range(c, amount + 1):
            ways[a] += ways[a - c]
    return ways[amount]
`,
  },
  grid_paths: {
    title: "Paths through a warehouse",
    difficulty: "Medium",
    tags: "2D DP",
    targetMinutes: 15,
    similar: "https://leetcode.com/problems/unique-paths-ii/",
    source: "A2-online-test/05-dynamic-programming/grid_paths.py",
    prompt: "<p>A forklift goes from the top-left to the bottom-right cell moving only right or down. \"#\" cells are blocked. Count the distinct paths.</p>",
    starter: `def count_paths(grid: list[str]) -> int:
    raise NotImplementedError
`,
    solution: `def count_paths(grid: list[str]) -> int:
    if not grid or grid[0][0] == '#':
        return 0
    cols = len(grid[0])
    row = [0] * cols                 # paths into each cell of the current row
    row[0] = 1
    for r in range(len(grid)):
        for c in range(cols):
            if grid[r][c] == '#':
                row[c] = 0
            elif c > 0:
                row[c] += row[c - 1]  # from above (already in row[c]) + from the left
    return row[-1]
`,
  },
  longest_increasing: {
    title: "Longest increasing subsequence",
    difficulty: "Medium",
    tags: "DP O(n^2), then O(n log n)",
    targetMinutes: 20,
    similar: "https://leetcode.com/problems/longest-increasing-subsequence/",
    source: "A2-online-test/05-dynamic-programming/longest_increasing.py",
    prompt: "<p>Length of the longest strictly increasing subsequence (not necessarily contiguous). Start with O(n^2); the speed test needs O(n log n) (patience sorting with bisect).</p>",
    starter: `from bisect import bisect_left

def lis_length(nums: list[int]) -> int:
    raise NotImplementedError
`,
    solution: `from bisect import bisect_left

def lis_length(nums: list[int]) -> int:
    tails = []  # tails[k]: smallest possible tail of an increasing run of length k+1
    for x in nums:
        k = bisect_left(tails, x)
        if k == len(tails):
            tails.append(x)
        else:
            tails[k] = x
    return len(tails)
`,
  },
  rob_houses: {
    title: "Non-adjacent maximum",
    difficulty: "Medium",
    tags: "1D DP",
    targetMinutes: 15,
    similar: "https://leetcode.com/problems/house-robber/",
    source: "A2-online-test/05-dynamic-programming/rob_houses.py",
    prompt: "<p>You can take values from a list but never two neighbours. Return the maximum total. Then circular version: the first and last elements are neighbours too.</p>",
    starter: `def best_non_adjacent(values: list[int]) -> int:
    raise NotImplementedError


def best_non_adjacent_circle(values: list[int]) -> int:
    raise NotImplementedError
`,
    solution: `def best_non_adjacent(values: list[int]) -> int:
    take = skip = 0          # best total if we took / skipped the previous value
    for v in values:
        take, skip = skip + v, max(take, skip)
    return max(take, skip)

def best_non_adjacent_circle(values: list[int]) -> int:
    if len(values) == 1:
        return max(values[0], 0)
    # first and last cannot both be taken: solve both straight lines
    return max(best_non_adjacent(values[1:]), best_non_adjacent(values[:-1]))
`,
  },
  truck_loading: {
    title: "Load the most valuable truck",
    difficulty: "Medium",
    tags: "0/1 knapsack",
    targetMinutes: 25,
    similar: "https://www.geeksforgeeks.org/0-1-knapsack-problem-dp-10/",
    source: "A2-online-test/05-dynamic-programming/truck_loading.py",
    prompt: "<p>items are (weight, value). Each item can be loaded at most once. Return the maximum value that fits within capacity.</p>",
    starter: `def best_load(items: list[tuple[int, int]], capacity: int) -> int:
    raise NotImplementedError
`,
    solution: `def best_load(items: list[tuple[int, int]], capacity: int) -> int:
    best = [0] * (capacity + 1)        # best[c]: best value with capacity c
    for weight, value in items:
        for c in range(capacity, weight - 1, -1):   # backwards: each item once
            best[c] = max(best[c], best[c - weight] + value)
    return best[capacity]
`,
  },
  word_break: {
    title: "Split text into known words",
    difficulty: "Medium",
    tags: "DP over prefixes",
    targetMinutes: 20,
    similar: "https://leetcode.com/problems/word-break/",
    source: "A2-online-test/05-dynamic-programming/word_break.py",
    prompt: "<p>Return True if s can be split into a sequence of dictionary words (words can be reused).</p><pre class=\"io\">can_split(\"erpsale\", [\"erp\", \"sale\"])  -&gt; True\ncan_split(\"catsandog\", [\"cats\", \"dog\", \"sand\", \"and\", \"cat\"]) -&gt; False</pre>",
    starter: `def can_split(s: str, words: list[str]) -> bool:
    raise NotImplementedError
`,
    solution: `def can_split(s: str, words: list[str]) -> bool:
    vocab = set(words)
    lengths = {len(w) for w in vocab}
    ok = [True] + [False] * len(s)      # ok[i]: s[:i] can be split
    for i in range(1, len(s) + 1):
        ok[i] = any(L <= i and ok[i - L] and s[i - L:i] in vocab for L in lengths)
    return ok[len(s)]
`,
  },
  m1_decode_ways: {
    title: "Decode a numeric message",
    difficulty: "Medium",
    tags: "1D DP",
    targetMinutes: 25,
    mock: "Mock 1",
    similar: "https://leetcode.com/problems/decode-ways/",
    source: "A2-online-test/07-mock-tests/mock-1/m1_decode_ways.py",
    prompt: "<p>Letters were encoded as numbers: A=1, B=2, ..., Z=26 and concatenated. Given the digit string, return how many ways it can be decoded. \"06\" is not valid (no leading zeros).</p><pre class=\"io\">decode_ways(\"12\")  -&gt; 2   (\"AB\", \"L\")\ndecode_ways(\"226\") -&gt; 3\ndecode_ways(\"06\")  -&gt; 0</pre>",
    starter: `def decode_ways(s: str) -> int:
    raise NotImplementedError
`,
    solution: `def decode_ways(s: str) -> int:
    if not s:
        return 0
    prev2, prev1 = 1, 1          # ways to decode s[:i-2] and s[:i-1]
    for i in range(1, len(s) + 1):
        cur = 0
        if s[i - 1] != '0':
            cur += prev1
        if i >= 2 and s[i - 2] != '0' and int(s[i - 2:i]) <= 26:
            cur += prev2
        prev2, prev1 = prev1, cur
    return prev1
`,
  },
  m1_fix_brackets: {
    title: "Fix the brackets",
    difficulty: "Easy",
    tags: "stack / counting",
    targetMinutes: 12,
    mock: "Mock 1",
    similar: "https://leetcode.com/problems/minimum-add-to-make-parentheses-valid/",
    source: "A2-online-test/07-mock-tests/mock-1/m1_fix_brackets.py",
    prompt: "<p>s contains only \"(\" and \")\". Return the minimum number of brackets you must insert (anywhere) to make it balanced.</p><pre class=\"io\">min_insertions(\"())\")  -&gt; 1\nmin_insertions(\"(((\")  -&gt; 3\nmin_insertions(\"()))((\") -&gt; 4</pre>",
    starter: `def min_insertions(s: str) -> int:
    raise NotImplementedError
`,
    solution: `def min_insertions(s: str) -> int:
    open_count = inserted = 0
    for ch in s:
        if ch == '(':
            open_count += 1
        elif open_count:
            open_count -= 1
        else:
            inserted += 1          # a ')' with nothing to close: add a '('
    return inserted + open_count   # every unclosed '(' needs a ')'
`,
  },
  m2_anagram_starts: {
    title: "Find all anagram positions",
    difficulty: "Medium",
    tags: "fixed sliding window + counts",
    targetMinutes: 20,
    mock: "Mock 2",
    similar: "https://leetcode.com/problems/find-all-anagrams-in-a-string/",
    source: "A2-online-test/07-mock-tests/mock-2/m2_anagram_starts.py",
    prompt: "<p>Return every start index i where text[i:i+len(word)] is an anagram of word. O(len(text)).</p><pre class=\"io\">anagram_starts(\"cbaebabacd\", \"abc\") -&gt; [0, 6]</pre>",
    starter: `def anagram_starts(text: str, word: str) -> list[int]:
    raise NotImplementedError
`,
    solution: `from collections import Counter

def anagram_starts(text: str, word: str) -> list[int]:
    k = len(word)
    if k == 0 or k > len(text):
        return []
    need = Counter(word)
    window = Counter(text[:k])
    out = [0] if window == need else []
    for right in range(k, len(text)):
        window[text[right]] += 1
        left_ch = text[right - k]
        window[left_ch] -= 1
        if window[left_ch] == 0:
            del window[left_ch]
        if window == need:
            out.append(right - k + 1)
    return out
`,
  },
  m2_fifo_cost: {
    title: "FIFO cost of goods sold",
    difficulty: "Medium",
    tags: "queue, simulation (ERP inventory valuation)",
    targetMinutes: 25,
    mock: "Mock 2",
    source: "A2-online-test/07-mock-tests/mock-2/m2_fifo_cost.py",
    prompt: "<p>ERPs can value stock with FIFO: deliveries consume the OLDEST received units first. receipts: list of (qty, unit_cost) in arrival order. deliveries: list of quantities, in order. Return the total cost of all delivered units, rounded to 2 decimals. Raise ValueError when a delivery needs more units than are in stock.</p><pre class=\"io\">fifo_cost([(10, 5.0), (5, 7.0)], [8, 4]) -&gt; 8*5 + (2*5 + 2*7) = 64.0</pre>",
    starter: `from collections import deque

def fifo_cost(receipts: list[tuple[float, float]], deliveries: list[float]) -> float:
    raise NotImplementedError
`,
    solution: `from collections import deque

def fifo_cost(receipts: list[tuple[float, float]], deliveries: list[float]) -> float:
    lots = deque([qty, cost] for qty, cost in receipts)
    total = 0.0
    for need in deliveries:
        while need > 0:
            if not lots:
                raise ValueError('not enough stock')
            take = min(need, lots[0][0])
            total += take * lots[0][1]
            lots[0][0] -= take
            need -= take
            if lots[0][0] == 0:
                lots.popleft()
    return round(total, 2)
`,
  },
  m3_lru_cache: {
    title: "LRU cache",
    difficulty: "Medium",
    tags: "hash map + ordering",
    targetMinutes: 20,
    mock: "Mock 3",
    similar: "https://leetcode.com/problems/lru-cache/",
    source: "A2-online-test/07-mock-tests/mock-3/m3_lru_cache.py",
    prompt: "<p>Implement LRUCache(capacity) with get(key) -&gt; value or -1, and put(key, value). When full, put evicts the least recently USED key (get and put both count as use). Both operations must be O(1). You may use collections.OrderedDict, but be ready to explain how you would build it with a dict + doubly linked list.</p>",
    starter: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        raise NotImplementedError

    def get(self, key: int) -> int:
        raise NotImplementedError

    def put(self, key: int, value: int) -> None:
        raise NotImplementedError
`,
    solution: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.items: OrderedDict[int, int] = OrderedDict()   # oldest first

    def get(self, key: int) -> int:
        if key not in self.items:
            return -1
        self.items.move_to_end(key)
        return self.items[key]

    def put(self, key: int, value: int) -> None:
        if key in self.items:
            self.items.move_to_end(key)
        self.items[key] = value
        if len(self.items) > self.capacity:
            self.items.popitem(last=False)
`,
  },
  m3_sync_minutes: {
    title: "Minutes until every server is updated",
    difficulty: "Medium",
    tags: "multi-source BFS",
    targetMinutes: 25,
    mock: "Mock 3",
    similar: "https://leetcode.com/problems/rotting-oranges/",
    source: "A2-online-test/07-mock-tests/mock-3/m3_sync_minutes.py",
    prompt: "<p>Grid of servers: \"U\" updated, \"O\" outdated, \".\" no server. Every minute, each updated server updates its outdated neighbours (up, down, left, right). Return the minutes until no outdated server remains, or -1 if some can never be reached. 0 if none are outdated at the start.</p>",
    starter: `from collections import deque

def sync_minutes(grid: list[str]) -> int:
    raise NotImplementedError
`,
    solution: `from collections import deque

def sync_minutes(grid: list[str]) -> int:
    rows, cols = len(grid), len(grid[0]) if grid else 0
    queue = deque()
    outdated = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 'U':
                queue.append((r, c, 0))        # every updated server starts at minute 0
            elif grid[r][c] == 'O':
                outdated += 1
    seen = {(r, c) for r, c, _ in queue}
    minutes = 0
    while queue:
        r, c, t = queue.popleft()
        minutes = max(minutes, t)
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 'O' and (nr, nc) not in seen:
                seen.add((nr, nc))
                outdated -= 1
                queue.append((nr, nc, t + 1))
    return minutes if outdated == 0 else -1
`,
  },
  coupon_combos: {
    title: "Pay with coupons",
    difficulty: "Medium",
    tags: "backtracking with pruning",
    targetMinutes: 20,
    similar: "https://leetcode.com/problems/combination-sum/",
    source: "A2-online-test/09-backtracking/coupon_combos.py",
    prompt: "<p>Coupons come in distinct positive values and each value can be used any number of times. Return every combination of values that adds up exactly to <code>amount</code>. Each combination is listed in non-decreasing order and appears once. Any order of combinations is accepted.</p><pre class=\"io\">coupon_combos([2, 3, 6, 7], 7) -&gt; [[2, 2, 3], [7]]</pre>",
    starter: `def coupon_combos(values: list[int], amount: int) -> list[list[int]]:
    raise NotImplementedError
`,
    solution: `def coupon_combos(values: list[int], amount: int) -> list[list[int]]:
    values = sorted(values)
    out = []
    combo = []

    def explore(start: int, remaining: int) -> None:
        if remaining == 0:
            out.append(combo[:])
            return
        for i in range(start, len(values)):
            if values[i] > remaining:
                break                      # sorted: every later value is too big too
            combo.append(values[i])
            explore(i, remaining - values[i])   # i, not i + 1: values can repeat
            combo.pop()

    explore(0, amount)
    return out
`,
  },
  delivery_orders: {
    title: "Every delivery order",
    difficulty: "Medium",
    tags: "backtracking, permutations",
    targetMinutes: 15,
    similar: "https://leetcode.com/problems/permutations/",
    source: "A2-online-test/09-backtracking/delivery_orders.py",
    prompt: "<p>A driver must visit every stop exactly once. Return every possible visiting order (all permutations of the distinct stops). Any order of the routes is accepted.</p><pre class=\"io\">delivery_orders([1, 2, 3]) -&gt; [[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]</pre>",
    starter: `def delivery_orders(stops: list[int]) -> list[list[int]]:
    raise NotImplementedError
`,
    solution: `def delivery_orders(stops: list[int]) -> list[list[int]]:
    out = []
    route = []
    used = [False] * len(stops)

    def explore() -> None:
        if len(route) == len(stops):
            out.append(route[:])
            return
        for i, stop in enumerate(stops):
            if used[i]:
                continue
            used[i] = True
            route.append(stop)
            explore()
            route.pop()
            used[i] = False

    explore()
    return out
`,
  },
  product_bundles: {
    title: "All product bundles",
    difficulty: "Easy",
    tags: "backtracking, subsets",
    targetMinutes: 15,
    similar: "https://leetcode.com/problems/subsets/",
    source: "A2-online-test/09-backtracking/product_bundles.py",
    prompt: "<p>Given distinct product codes, return every possible bundle (subset), including the empty one. Each bundle lists products in their input order. Any order of bundles is accepted.</p><pre class=\"io\">bundles([\"a\", \"b\"]) -&gt; [[], [\"a\"], [\"a\", \"b\"], [\"b\"]]</pre>",
    starter: `def bundles(items: list[str]) -> list[list[str]]:
    raise NotImplementedError
`,
    solution: `def bundles(items: list[str]) -> list[list[str]]:
    out = []
    chosen = []

    def explore(i: int) -> None:
        if i == len(items):
            out.append(chosen[:])          # copy: chosen keeps changing
            return
        chosen.append(items[i])            # choose items[i]
        explore(i + 1)
        chosen.pop()                       # un-choose
        explore(i + 1)                     # skip items[i]

    explore(0)
    return out
`,
  },
};

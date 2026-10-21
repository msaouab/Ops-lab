import type { Module, PythonExercise } from '../../types';
import { problem } from '../problems';

const stackModule: Module<PythonExercise> = {
  id: 'stack',
  title: 'Stacks & Queues',
  tags: 'matching · nesting · monotonic stack · deque',
  parents: ['hashing'],
  summary: 'A stack remembers what is still open, waiting for its match. A queue processes things in arrival order. Both are a list or a deque in Python.',
  lesson: [
    {
      heading: 'Spot it',
      body: 'Use a <b>stack</b> (last in, first out) when:',
      list: [
        'things open and close: brackets, tags, nested blocks like <code>3[a2[c]]</code>',
        'you evaluate expressions (postfix / RPN) or need "undo"',
        'you want the <b>next greater / smaller</b> element: a monotonic stack',
      ],
    },
    {
      heading: 'Matching: push openers, pop on closers',
      body: 'Every closer must match the most recent unmatched opener, which is exactly the top of the stack. At the end, anything left on the stack was never closed.',
      code: `PAIRS = {")": "(", "]": "[", "}": "{"}

def balanced(s):
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in PAIRS:
            if not stack or stack.pop() != PAIRS[ch]:
                return False
        print(f"{ch} -> {stack}")
    return not stack

print(balanced("{[()]}"), balanced("([)]"))`,
    },
    {
      heading: 'Nesting: save the outer state on the stack',
      body: 'For nested structures, push the state of the outer level when you enter a new level, and combine when you leave it. Decoding <code>3[a2[c]]</code>: on <code>[</code> push (text so far, repeat count); on <code>]</code> pop and build <code>before + inner * k</code>.',
      code: `def decode(s):
    stack, text, num = [], "", 0
    for ch in s:
        if ch.isdigit():
            num = num * 10 + int(ch)
        elif ch == "[":
            stack.append((text, num))
            text, num = "", 0
        elif ch == "]":
            before, k = stack.pop()
            text = before + text * k
        else:
            text += ch
    return text

print(decode("3[a2[c]]"), decode("2[abc]3[cd]ef"))`,
    },
    {
      heading: 'Monotonic stack: the next greater element',
      body: 'Keep indices whose answer is still unknown, with values decreasing from bottom to top. When a bigger value arrives, it is the answer for every smaller value on top: pop them all. Each index is pushed and popped once, so O(n).',
      code: `temps = [73, 74, 75, 71, 69, 72, 76, 73]
answer = [0] * len(temps)
stack = []                                 # waiting days, temps decreasing
for i, t in enumerate(temps):
    while stack and temps[stack[-1]] < t:
        j = stack.pop()
        answer[j] = i - j
    stack.append(i)
    print(f"day {i} ({t}): waiting {[temps[k] for k in stack]}")
print(answer)`,
      note: { label: 'Complexity', body: 'A while loop inside a for loop looks like O(n²), but every index enters and leaves the stack at most once: O(n) total. Say this out loud in interviews.' },
    },
    {
      heading: 'Queues: first in, first out',
      body: 'When order of arrival matters (FIFO stock, BFS, task processing), use <code>collections.deque</code>: <code>popleft()</code> is O(1), while <code>list.pop(0)</code> is O(n).',
      code: `from collections import deque

lots = deque([[10, 5.0], [5, 7.0]])   # [qty, unit cost], oldest first
need, cost = 12, 0.0
while need:
    take = min(need, lots[0][0])
    cost += take * lots[0][1]
    lots[0][0] -= take
    need -= take
    if lots[0][0] == 0:
        lots.popleft()
print(cost, list(lots))`,
    },
  ],
  exercises: [
    problem('valid_markup', {
      hint: 'Find the tags with a regex like <(/?)([a-z]+)(/?)>. Push opening names, pop on closing ones and compare; skip self-closing tags.',
      complexity: 'O(n) time · O(n) space',
    }),
    problem('eval_rpn', {
      hint: 'Numbers go on the stack. An operator pops the right operand first, then the left. int(a / b) truncates toward zero.',
      complexity: 'O(n) time · O(n) space',
    }),
    problem('m1_fix_brackets', {
      hint: 'You only need a counter of unmatched "(". A ")" with nothing open costs one insertion; whatever is still open at the end costs one each.',
      complexity: 'O(n) time · O(1) space',
    }),
    problem('decode_repeat', {
      hint: 'On "[" push (text so far, number); on "]" pop and set text = before + text * k. Numbers can have several digits.',
      complexity: 'O(output length) time · O(n) space',
    }),
    problem('next_warmer_day', {
      hint: 'Keep a stack of day indices still waiting for a warmer day. A warmer day pops (and answers) every colder day on top.',
      complexity: 'O(n) time · O(n) space',
    }),
    problem('m2_fifo_cost', {
      hint: 'A deque of [qty, cost] lots, oldest first. Each delivery takes from the front lot until satisfied; raise ValueError when the deque runs out.',
      complexity: 'O(receipts + deliveries) time · O(receipts) space',
    }),
  ],
};

export default stackModule;

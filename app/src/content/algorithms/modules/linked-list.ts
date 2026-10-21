import type { Module, PythonExercise } from '../../types';
import { problem } from '../problems';

const linkedListModule: Module<PythonExercise> = {
  id: 'linked-list',
  title: 'Linked Lists',
  tags: 'pointer rewiring · dummy node · fast & slow',
  parents: ['two-pointers'],
  summary: 'Problems about rewiring next pointers without losing nodes, plus the fast and slow pointer trick for cycles and middles.',
  lesson: [
    {
      heading: 'Spot it',
      body: 'Linked-list problems ask you to reverse, merge, reorder or inspect a chain of nodes, usually in O(1) extra space. The helpers available in the exercises (from <code>structures.py</code>):',
      list: [
        '<code>ListNode(val, next)</code>: one node',
        '<code>to_linked([1, 2, 3])</code>: build a list from Python values',
        '<code>to_list(head)</code>: read it back as a Python list',
      ],
    },
    {
      heading: 'Rewire without losing the rest',
      body: 'Before changing <code>node.next</code>, save where it pointed. Reversing a list keeps three pointers: the reversed part (<code>prev</code>), the current node, and the rest of the list.',
      code: `class ListNode:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

def show(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

head = ListNode(1, ListNode(2, ListNode(3, ListNode(4))))
prev = None
while head:
    rest = head.next        # save the rest
    head.next = prev        # point backwards
    prev, head = head, rest
    print("reversed so far:", show(prev))`,
    },
    {
      heading: 'The dummy node',
      body: 'Building a new list usually needs a special case for the first node. Start with a placeholder <code>dummy</code> node, append behind a <code>tail</code> pointer, and return <code>dummy.next</code>. No special cases.',
      code: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def build(values):
    dummy = tail = ListNode()
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def merge(a, b):
    dummy = tail = ListNode()
    while a and b:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b          # append whatever is left
    return dummy.next

node, out = merge(build([1, 4, 6]), build([2, 3, 7])), []
while node:
    out.append(node.val)
    node = node.next
print(out)`,
    },
    {
      heading: 'Fast and slow pointers',
      body: 'Move <code>slow</code> one step and <code>fast</code> two steps. If there is a cycle, fast laps slow and they meet; if not, fast reaches the end. When fast reaches the end, slow is at the middle. O(n) time, O(1) memory.',
      code: `class ListNode:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

nodes = [ListNode(i) for i in range(6)]
for a, b in zip(nodes, nodes[1:]):
    a.next = b
nodes[-1].next = nodes[2]          # make a cycle: 5 -> 2

slow = fast = nodes[0]
step = 0
while fast and fast.next:
    slow, fast = slow.next, fast.next.next
    step += 1
    print(f"step {step}: slow={slow.val} fast={fast.val}")
    if slow is fast:
        print("cycle detected")
        break`,
      note: { label: 'Interview tip', body: 'LRU cache is a classic design question built on this module: a dict for O(1) lookup plus a doubly linked list for O(1) "move to front" and "evict oldest". In Python, <code>OrderedDict</code> is exactly that combination.' },
    },
  ],
  exercises: [
    problem('reverse_linked', {
      hint: 'Keep prev (reversed part), head (current) and the saved rest. Point head.next at prev, then advance both.',
      complexity: 'O(n) time · O(1) space',
    }),
    problem('merge_sorted_lists', {
      hint: 'Use a dummy node and a tail pointer. Attach the smaller head each time; when one list runs out, attach the other.',
      complexity: 'O(n + m) time · O(1) space',
    }),
    problem('has_cycle', {
      hint: 'Two pointers, one step and two steps. They meet only if there is a cycle; fast reaching None means there is none.',
      complexity: 'O(n) time · O(1) space',
    }),
    problem('m3_lru_cache', {
      hint: 'OrderedDict keeps keys in order of use: move_to_end on every get and put, and popitem(last=False) to evict the oldest.',
      complexity: 'O(1) per get / put · O(capacity) space',
    }),
  ],
};

export default linkedListModule;

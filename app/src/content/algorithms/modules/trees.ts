import type { Module, PythonExercise } from '../../types';
import { problem } from '../problems';

const treesModule: Module<PythonExercise> = {
  id: 'trees',
  title: 'Trees',
  tags: 'recursion · DFS · BFS by level · BST bounds',
  parents: ['binary-search', 'linked-list'],
  summary: 'Think of a tree problem as "what does each node need from its children?" (DFS), or "process one level at a time" (BFS).',
  lesson: [
    {
      heading: 'Spot it',
      body: 'Binary-tree questions usually fall into one of these shapes:',
      list: [
        'compute something from the subtrees: depth, size, sum, "are they equal?": <b>recursive DFS</b>',
        'level by level, "nearest", "minimum depth": <b>BFS with a queue</b>',
        'search trees: every node bounds its whole subtree, so pass <b>(low, high)</b> limits down',
      ],
      note: { label: 'Helpers', body: 'Exercises provide <code>TreeNode(val, left, right)</code> and <code>to_tree([1, 2, 3, None, 4])</code>, which builds a tree from level-order values with <code>None</code> for gaps.' },
    },
    {
      heading: 'Recursive DFS: trust the recursion',
      body: 'Write the answer for one node assuming the calls on its children already work. Then handle the base case (an empty tree). Max depth: an empty tree has depth 0; otherwise 1 + the deeper child.',
      code: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def depth(node, indent=0):
    if node is None:
        return 0
    d = 1 + max(depth(node.left, indent + 1), depth(node.right, indent + 1))
    print("  " * indent + f"node {node.val}: depth {d}")
    return d

root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
print("max depth:", depth(root))`,
    },
    {
      heading: 'Comparing two trees at once',
      body: 'Recurse on pairs: two trees are the same if both are empty, or both have the same value and the same left and right subtrees. The base case <code>a is None or b is None</code> handles every shape mismatch.',
      code: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def same(a, b):
    if a is None or b is None:
        return a is b                     # True only if both are None
    return a.val == b.val and same(a.left, b.left) and same(a.right, b.right)

t1 = TreeNode(1, TreeNode(2), TreeNode(3))
t2 = TreeNode(1, TreeNode(2), TreeNode(3))
t3 = TreeNode(1, TreeNode(2))
print(same(t1, t2), same(t1, t3))`,
    },
    {
      heading: 'BFS: one level at a time',
      body: 'Put the root in a queue. At the start of each round the queue holds exactly one level: read <code>len(queue)</code> nodes, collect their values, and enqueue their children.',
      code: `from collections import deque

class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
queue, levels = deque([root]), []
while queue:
    level = []
    for _ in range(len(queue)):           # exactly this level's nodes
        node = queue.popleft()
        level.append(node.val)
        queue.extend(c for c in (node.left, node.right) if c)
    levels.append(level)
    print("level:", level)`,
    },
    {
      heading: 'Search trees: pass the bounds down',
      body: 'In a BST, every node in the left subtree is smaller than the node, not just its direct child. Checking only parent and child is the classic wrong answer. Pass an allowed range down: going left tightens the upper bound, going right tightens the lower bound.',
      code: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def valid(node, low=float("-inf"), high=float("inf")):
    if node is None:
        return True
    if not low < node.val < high:
        print(f"{node.val} is outside ({low}, {high})")
        return False
    return valid(node.left, low, node.val) and valid(node.right, node.val, high)

# 3 < 7 looks fine locally, but 3 sits in 5's right subtree, so it must be > 5
bad = TreeNode(5, TreeNode(1), TreeNode(7, TreeNode(3), TreeNode(8)))
print(valid(bad))`,
      note: { label: 'Complexity', body: 'Every node is visited once: O(n) time. Space is the recursion depth: O(h), which is O(log n) for a balanced tree and O(n) for a chain.' },
    },
  ],
  exercises: [
    problem('same_tree', {
      hint: 'Recurse on both trees together. If either is None, they are equal only if both are. Otherwise compare values and both pairs of children.',
      complexity: 'O(n) time · O(h) space for the recursion',
    }),
    problem('valid_bst', {
      hint: 'Pass (low, high) bounds down the recursion. Left child: high becomes the parent value. Right child: low becomes the parent value.',
      complexity: 'O(n) time · O(h) space',
    }),
    problem('tree_levels', {
      hint: 'BFS with a deque. Each round, pop exactly len(queue) nodes: that is one level. max_depth is a one-line recursion.',
      complexity: 'O(n) time · O(n) space',
    }),
  ],
};

export default treesModule;

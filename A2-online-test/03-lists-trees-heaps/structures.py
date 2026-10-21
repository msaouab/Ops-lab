"""Shared helpers. Do not edit: the tests rely on them."""
from collections import deque


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def to_linked(values):
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head


def to_list(head, limit=10_000):
    out = []
    while head and len(out) < limit:
        out.append(head.val)
        head = head.next
    return out


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def to_tree(values):
    """Build a tree from level-order values, None for gaps: [1, 2, 3, None, 4]."""
    if not values or values[0] is None:
        return None
    nodes = [None if v is None else TreeNode(v) for v in values]
    kids = deque(nodes[1:])
    for node in nodes:
        if node is None:
            continue
        if kids:
            node.left = kids.popleft()
        if kids:
            node.right = kids.popleft()
    return nodes[0]

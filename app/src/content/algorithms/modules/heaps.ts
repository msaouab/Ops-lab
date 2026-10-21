import type { Module, PythonExercise } from '../../types';
import { problem } from '../problems';

const heapsModule: Module<PythonExercise> = {
  id: 'heaps',
  title: 'Heaps',
  tags: 'top k · k-way merge · two heaps',
  parents: ['trees'],
  summary: 'A heap gives you the smallest item in O(1) and adds or removes in O(log n): ideal for "top k", merging sorted streams and running medians.',
  lesson: [
    {
      heading: 'Spot it',
      body: 'Use a heap when the problem keeps asking for the current minimum or maximum while data changes:',
      list: [
        '"k largest / k smallest / k closest", "k-th largest"',
        '"merge k sorted lists / streams"',
        '"median of a stream", scheduling by earliest end time',
      ],
    },
    {
      heading: 'heapq in 30 seconds',
      body: 'Python\'s <code>heapq</code> works on a plain list and is a <b>min-heap</b>: <code>heap[0]</code> is the smallest. For a max-heap, push negated values. Tuples compare element by element, which gives free tie-breaking.',
      code: `import heapq

heap = []
for x in [5, 1, 8, 3, 9, 2]:
    heapq.heappush(heap, x)
print("smallest:", heap[0])
print("pop order:", [heapq.heappop(heap) for _ in range(3)])

max_heap = [-x for x in [5, 1, 8]]
heapq.heapify(max_heap)
print("largest:", -max_heap[0])`,
    },
    {
      heading: 'Top k: keep a heap of size k',
      body: 'To keep the k <i>smallest</i> items, keep a <b>max</b>-heap of size k: its top is the worst of the best. A new item replaces it only if it is better. O(n log k), better than sorting everything when k is small.',
      code: `import heapq

points = [(3, 3), (5, -1), (-2, 4), (1, 1), (0, 2)]
k = 2
heap = []                                 # (-distance, point): a max-heap
for x, y in points:
    d = x * x + y * y
    if len(heap) < k:
        heapq.heappush(heap, (-d, (x, y)))
    elif -d > heap[0][0]:                 # closer than the worst kept point
        heapq.heapreplace(heap, (-d, (x, y)))
    print(f"after {(x, y)}: keep {sorted(p for _, p in heap)}")
print(sorted((-negd, p) for negd, p in heap))`,
    },
    {
      heading: 'K-way merge',
      body: 'Put the first element of each sorted list in a heap, as <code>(value, list index, position)</code>. Pop the smallest, then push the next element from the same list. The heap never holds more than k items, so O(N log k).',
      code: `import heapq

lists = [[1, 4, 9], [2, 3, 10], [5]]
heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
heapq.heapify(heap)
out = []
while heap:
    value, i, j = heapq.heappop(heap)
    out.append(value)
    if j + 1 < len(lists[i]):
        heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
print(out)`,
    },
    {
      heading: 'Two heaps: the running median',
      body: 'Split the numbers into a lower half (a max-heap) and an upper half (a min-heap) of equal size, or lower one bigger. The median is then at the tops. Each insert rebalances with at most two pushes and pops: O(log n).',
      note: { label: 'Common trap', body: 'Pushing tuples whose first values tie compares the second element, which may not be comparable (two dicts, two nodes). Add a unique counter or index as the second element to break ties.' },
    },
  ],
  exercises: [
    problem('k_closest_depots', {
      hint: 'Keep a max-heap of size k keyed by (-distance, -x, -y). Replace the top when a closer point arrives; sort the k survivors at the end.',
      complexity: 'O(n log k) time · O(k) space',
    }),
    problem('merge_k_sorted', {
      hint: 'Heap of (value, list index, position). Pop the smallest, then push the next item from that same list.',
      complexity: 'O(N log k) time · O(k) space',
    }),
    problem('running_median', {
      hint: 'A max-heap for the lower half (store negatives) and a min-heap for the upper half. Push into lower, move its top to upper, and rebalance so lower is never smaller.',
      complexity: 'O(log n) per add · O(1) per median · O(n) space',
    }),
  ],
};

export default heapsModule;

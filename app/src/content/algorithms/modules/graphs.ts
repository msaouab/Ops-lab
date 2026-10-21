import type { Module, PythonExercise } from '../../types';
import { problem } from '../problems';

const graphsModule: Module<PythonExercise> = {
  id: 'graphs',
  title: 'Graphs',
  tags: 'grid DFS · BFS · topo sort · union-find · Dijkstra',
  parents: ['backtracking', 'heaps'],
  summary: 'Grids, routes and dependencies are graphs. Pick the traversal by the question: connected parts, fewest steps, an order, or the cheapest path.',
  lesson: [
    {
      heading: 'Spot it, and pick the tool',
      body: 'Nodes and connections, explicit or hidden in a grid. The question decides the algorithm:',
      list: [
        '"how many islands / zones / groups?": <b>DFS or BFS</b> flood fill, or <b>union-find</b>',
        '"fewest moves / steps" with equal step costs: <b>BFS</b>',
        '"spreads from several sources at once" (rot, fire, updates): <b>multi-source BFS</b>',
        '"order with dependencies", "is there a cycle?": <b>topological sort</b>',
        '"cheapest / fastest path" with weights ≥ 0: <b>Dijkstra</b> (BFS with a heap)',
      ],
    },
    {
      heading: 'Flood fill on a grid',
      body: 'Each unseen land cell starts a new zone; then visit everything connected to it, marking cells as seen so they are never counted twice. An explicit stack avoids Python\'s recursion limit on large grids.',
      code: `grid = ["##..",
        "##..",
        "..#.",
        "...#"]
rows, cols = len(grid), len(grid[0])
seen, zones = set(), 0
for r in range(rows):
    for c in range(cols):
        if grid[r][c] == "#" and (r, c) not in seen:
            zones += 1
            stack = [(r, c)]
            seen.add((r, c))
            while stack:
                y, x = stack.pop()
                for ny, nx in ((y+1, x), (y-1, x), (y, x+1), (y, x-1)):
                    if 0 <= ny < rows and 0 <= nx < cols and grid[ny][nx] == "#" and (ny, nx) not in seen:
                        seen.add((ny, nx))
                        stack.append((ny, nx))
            print(f"zone {zones} starts at {(r, c)}")
print("zones:", zones)`,
    },
    {
      heading: 'BFS gives the fewest steps',
      body: 'BFS explores in rings: all cells 1 step away, then 2, then 3. The first time it reaches the goal, that is the shortest distance. Mark cells as seen when you <b>enqueue</b> them, not when you dequeue, or the queue fills with duplicates.',
      code: `from collections import deque

grid = ["..#.",
        "..#.",
        "....",
        ".#.."]
start, goal = (0, 0), (0, 3)
queue, seen = deque([(start, 0)]), {start}
while queue:
    (r, c), dist = queue.popleft()
    if (r, c) == goal:
        print("fewest moves:", dist)
        break
    for nr, nc in ((r+1, c), (r-1, c), (r, c+1), (r, c-1)):
        if 0 <= nr < 4 and 0 <= nc < 4 and grid[nr][nc] == "." and (nr, nc) not in seen:
            seen.add((nr, nc))
            queue.append(((nr, nc), dist + 1))`,
      note: { label: 'Multi-source BFS', body: 'When something spreads from several starting points at once, put <i>all</i> of them in the queue at distance 0. The BFS then computes, for every cell, the time from its nearest source.' },
    },
    {
      heading: 'Topological sort (Kahn\'s algorithm)',
      body: 'Count unmet dependencies per node. Nodes with zero are ready; installing one decrements its dependents. If some nodes never become ready, there is a cycle. Using a heap for the ready set gives the alphabetically smallest valid order.',
      code: `import heapq

deps = {"sale": ["base", "product"], "product": ["base"], "stock": ["product"], "base": []}
waiting = {m: len(d) for m, d in deps.items()}
users = {m: [] for m in deps}
for m, ds in deps.items():
    for d in ds:
        users[d].append(m)
ready = [m for m, n in waiting.items() if n == 0]
order = []
while ready:
    m = heapq.heappop(ready)
    order.append(m)
    for u in users[m]:
        waiting[u] -= 1
        if waiting[u] == 0:
            heapq.heappush(ready, u)
print(order if len(order) == len(deps) else "cycle!")`,
    },
    {
      heading: 'Union-find and Dijkstra',
      body: '<b>Union-find</b> keeps groups that only ever merge: <code>find(x)</code> follows parent links to a root (compress the path as you go), <code>union(a, b)</code> joins two roots. <b>Dijkstra</b> is BFS where the queue is a heap ordered by distance so far; skip stale heap entries whose distance is outdated.',
      code: `import heapq

roads = {1: [(2, 7), (3, 2)], 2: [(4, 1)], 3: [(2, 3), (4, 8)], 4: []}
best, heap = {1: 0}, [(0, 1)]
while heap:
    d, v = heapq.heappop(heap)
    if d > best[v]:
        continue                        # an older, longer entry
    for w, minutes in roads[v]:
        if d + minutes < best.get(w, float("inf")):
            best[w] = d + minutes
            heapq.heappush(heap, (best[w], w))
print(best)                             # 1 -> 3 -> 2 -> 4 costs 2 + 3 + 1 = 6`,
      note: { label: 'Complexity', body: 'DFS / BFS: O(V + E). Topological sort: O(V + E) (plus log V with a heap). Dijkstra: O(E log V). Union-find: almost O(1) per operation with path compression.' },
    },
  ],
  exercises: [
    problem('count_zones', {
      hint: 'Loop over every cell. Each "#" not seen yet starts a new zone; flood-fill from it (stack or queue) marking connected "#" cells as seen.',
      complexity: 'O(rows × cols) time and space',
    }),
    problem('shortest_route', {
      hint: 'BFS from start with (cell, distance) in a deque; mark cells seen when you enqueue them. Return the distance the first time you pop the goal.',
      complexity: 'O(rows × cols) time and space',
    }),
    problem('m3_sync_minutes', {
      hint: 'Multi-source BFS: queue every "U" at minute 0, spread to "O" neighbours one minute later, and count how many outdated servers remain.',
      complexity: 'O(rows × cols) time and space',
    }),
    problem('install_order', {
      hint: 'Kahn\'s algorithm: count each module\'s unmet dependencies, pop ready modules from a heap (alphabetical), and raise ValueError if not all get installed.',
      complexity: 'O((V + E) log V) time · O(V + E) space',
    }),
    problem('partner_groups', {
      hint: 'Union-find: parent = list(range(n)); find with path compression; union the roots for each link. Count distinct roots, or count members per root.',
      complexity: 'O((n + links) · α(n)) time · O(n) space',
    }),
    problem('fastest_delivery', {
      hint: 'Dijkstra: a heap of (minutes so far, depot). Pop the closest, skip it if a better time is already known, relax its outgoing roads.',
      complexity: 'O(E log V) time · O(V + E) space',
    }),
  ],
};

export default graphsModule;

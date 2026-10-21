import type { Module, PythonExercise } from '../../types';
import { problem } from '../problems';

const intervalsModule: Module<PythonExercise> = {
  id: 'intervals',
  title: 'Intervals',
  tags: 'sort by start · merge · sweep line',
  parents: ['heaps'],
  summary: 'Overlapping ranges become easy once they are sorted by start: then you only ever compare with the last interval you kept.',
  lesson: [
    {
      heading: 'Spot it',
      body: 'Anything with start and end times: bookings, meetings, shifts, IP ranges. Typical questions:',
      list: [
        '"merge overlapping ranges", "total covered time"',
        '"how many rooms / machines at once?", "maximum overlap"',
        '"can one person attend all meetings?", "insert a new range"',
      ],
    },
    {
      heading: 'Sort by start, then compare with the last one',
      body: 'After sorting by start, an interval can only overlap the one you kept last. If it starts before that one ends, extend the end; otherwise start a new group.',
      code: `bookings = [[8, 10], [1, 3], [2, 6], [15, 18], [6, 7]]
merged = []
for start, end in sorted(bookings):
    if merged and start <= merged[-1][1]:       # overlaps (touching counts)
        merged[-1][1] = max(merged[-1][1], end)
    else:
        merged.append([start, end])
    print(f"[{start},{end}] -> {merged}")`,
      note: { label: 'Common trap', body: 'Use <code>max(last_end, end)</code>, not just <code>end</code>: an interval can sit entirely inside the previous one, like [1, 10] then [2, 3].' },
    },
    {
      heading: 'How many at once: a heap of end times',
      body: 'Process meetings by start time and keep a min-heap of the end times of meetings in progress. If the earliest end is before the new start, that room is free: reuse it. The heap size at the end is the number of rooms needed.',
      code: `import heapq

meetings = [(0, 30), (5, 10), (15, 20), (10, 15)]
ends = []
for start, end in sorted(meetings):
    if ends and ends[0] <= start:
        heapq.heapreplace(ends, end)        # reuse the room freed first
    else:
        heapq.heappush(ends, end)           # open a new room
    print(f"({start},{end}) rooms busy until {sorted(ends)}")
print("rooms needed:", len(ends))`,
    },
    {
      heading: 'Sweep line: events in time order',
      body: 'Another view of the same question: turn every interval into two events, +1 at its start and −1 at its end, sort them, and track the running count. Put ends before starts at the same time when "ending at 10 frees the room for 10".',
      code: `meetings = [(0, 30), (5, 10), (15, 20), (10, 15)]
events = sorted([(s, 1) for s, _ in meetings] + [(e, -1) for _, e in meetings])
busy = peak = 0
for t, delta in events:                  # (10, -1) sorts before (10, 1)
    busy += delta
    peak = max(peak, busy)
print("peak overlap:", peak)`,
    },
  ],
  exercises: [
    problem('merge_bookings', {
      hint: 'Sort by start. For each booking, if it starts at or before the last merged end, extend that end with max; otherwise append it.',
      complexity: 'O(n log n) time · O(n) space',
    }),
    problem('rooms_needed', {
      hint: 'Sort by start and keep a min-heap of end times. If the smallest end is <= the new start, replace it; otherwise push. Answer: heap size.',
      complexity: 'O(n log n) time · O(n) space',
    }),
  ],
};

export default intervalsModule;

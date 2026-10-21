# A1 · Python fluency  (weeks 1–2)

You write TypeScript every day; these drills make Python just as automatic.
The target stack is Python, and the online test is timed, so idioms you don't have to think about save minutes.

| Drill | Covers | Target |
|---|---|---|
| `d01_idioms.py` | comprehensions, slicing, zip, unpacking | 25 min |
| `d02_collections.py` | Counter, defaultdict, deque, heapq, bisect, sorted(key=) | 30 min |
| `d03_oop.py` | properties, dunders, inheritance, super() chains, a mini model registry | 40 min |
| `d04_functions.py` | closures, decorators, generators, context managers | 40 min |
| `d05_dataclasses_state.py` | dataclasses, Enum, a sale-order state machine | 35 min |

```bash
.venv/bin/pytest A1-python-fluency                      # all drills
.venv/bin/pytest A1-python-fluency/test_d01_idioms.py   # one drill
```

Drill 03 and 05 are deliberately ERP-shaped: `super()` chains are how model overrides
work in Python ERP frameworks, and states (draft → sent → sale) are everywhere in business apps.

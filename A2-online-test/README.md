# A2 · Online coding test  (weeks 1–4, every day)

The first filter: about 1 hour on Coderbyte or HackerRank, 2–4 easy/medium problems,
often one SQL question; then logic and English tests. Practise in **Python**.

| Folder | What | Count |
|---|---|---|
| `01-strings-stack` | valid markup (reported!), RPN calculator (reported!), monotonic stack, decoding | 7 |
| `02-arrays-window-search` | hashing, prefix sums, sliding windows, two pointers, binary search | 10 |
| `03-lists-trees-heaps` | linked lists, Same Tree (reported!), BFS levels, BST, heaps, intervals | 11 |
| `04-graphs` | grid DFS, **module install order** (topological sort), BFS, Dijkstra, union-find | 5 |
| `05-dynamic-programming` | reportedly a favourite topic: 10 classics from climbing stairs to edit distance | 10 |
| `06-sql` | 15 queries + 3 mock queries on an ERP-shaped PostgreSQL database | 18 |
| `07-mock-tests` | three timed 60-minute tests | 3 × 3 |
| `08-aptitude-english-mcq` | 28-question aptitude set, client emails, web MCQ | — |
| `09-backtracking` | subsets, permutations, combination sum (choose · explore · un-choose) | 3 |

## Suggested order

Week 1: `01`, `02` and SQL q01–q06 · Week 2: `03`, `04`, SQL q07–q12 ·
Week 3: `05`, SQL q13–q15, aptitude + MCQ · Week 4: the three mocks, one every other day.

## SQL setup

```bash
make db                                   # PostgreSQL 16 on port 5433
.venv/bin/pytest A2-online-test/06-sql    # loads schema.sql + seed.sql fresh every run
psql postgresql://ops_lab:ops_lab@localhost:5433/ops_lab -c "SET search_path TO prep" -c "\dt"
```

Read `06-sql/schema.sql` first: the tables copy real ERP naming (`res_partner`, `sale_order`,
`sale_order_line`, `product_product`, `stock_move`, `hr_employee`).

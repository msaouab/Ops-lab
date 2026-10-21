# Timed mock tests

Each mock is a full online test: **60 minutes, 3 questions, no internet, no hints.**
Start a timer, do them in order, and stop when the time is up even if you're not finished.

| Mock | Q1 | Q2 | Q3 (SQL, in `../06-sql/`) |
|---|---|---|---|
| mock-1 | `m1_fix_brackets` | `m1_decode_ways` | `m1_best_seller_per_month.sql` |
| mock-2 | `m2_fifo_cost` | `m2_anagram_starts` | `m2_inventory_valuation.sql` |
| mock-3 | `m3_sync_minutes` | `m3_lru_cache` | `m3_lost_customers.sql` |

Then run the tests and write the result in the journal:

```bash
.venv/bin/pytest A2-online-test/07-mock-tests/mock-1 A2-online-test/06-sql/test_m1_best_seller_per_month.py
```

Score: 3/3 green within 60 min means you're ready for the real one. After each mock, send
Claude your code and ask for a review of complexity and code style, like an interviewer would.

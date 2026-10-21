"""
Drill 02 · The collections toolbox  ·  Warm-up  ·  Counter, defaultdict, deque, heapq, bisect, sorted(key=)  ·  target 30 min

The standard library saves you minutes in a timed test. Use it.

1. top_words(text, k)              -> k most common lower-cased words as [(word, count)],
                                      ties broken alphabetically
2. group_by_route(rows)            -> rows of (student, route) -> {route: [students in input order]}
3. merge_stock(*warehouses)        -> each arg is {product: qty}; return total qty per product,
                                      dropping products whose total is 0 or less
4. last_n(stream, n)               -> the last n items of an iterable, oldest first (use a deque)
5. k_cheapest(products, k)         -> products is [(name, price)]; the k cheapest names,
                                      cheapest first, ties by name (use heapq)
6. sort_orders(orders)             -> list of dicts {"id", "total"}; sort by total DESC, then id ASC
7. grade(score, cutoffs, labels)   -> bisect: cutoffs [50, 70, 85], labels "FCBA"
                                      -> 45:"F", 50:"C", 84:"B", 85:"A"
"""
from collections import Counter, defaultdict, deque
import heapq
from bisect import bisect_right

def top_words(text: str, k: int) -> list[tuple[str, int]]:
    raise NotImplementedError


def group_by_route(rows: list[tuple[str, str]]) -> dict[str, list[str]]:
    raise NotImplementedError


def merge_stock(*warehouses: dict[str, int]) -> dict[str, int]:
    raise NotImplementedError


def last_n(stream, n: int) -> list:
    raise NotImplementedError


def k_cheapest(products: list[tuple[str, float]], k: int) -> list[str]:
    raise NotImplementedError


def sort_orders(orders: list[dict]) -> list[dict]:
    raise NotImplementedError


def grade(score: int, cutoffs: list[int], labels: str) -> str:
    raise NotImplementedError

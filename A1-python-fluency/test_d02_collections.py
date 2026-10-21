from d02_collections import *  # noqa: F401,F403

def test_top_words():
    text = "owl erp python erp OWL erp orm"
    assert top_words(text, 2) == [("erp", 3), ("owl", 2)]
    assert top_words("b a", 2) == [("a", 1), ("b", 1)]


def test_group_by_route():
    rows = [("amine", "R1"), ("sara", "R2"), ("yassine", "R1")]
    assert group_by_route(rows) == {"R1": ["amine", "yassine"], "R2": ["sara"]}
    assert group_by_route([]) == {}


def test_merge_stock():
    a = {"desk": 3, "chair": 2}
    b = {"desk": 1, "chair": -2, "lamp": 4}
    assert merge_stock(a, b) == {"desk": 4, "lamp": 4}
    assert merge_stock() == {}


def test_last_n():
    assert last_n(range(10), 3) == [7, 8, 9]
    assert last_n(iter("ab"), 5) == ["a", "b"]


def test_k_cheapest():
    products = [("desk", 120.0), ("pen", 2.5), ("cup", 2.5), ("lamp", 30.0)]
    assert k_cheapest(products, 3) == ["cup", "pen", "lamp"]
    assert k_cheapest(products, 0) == []


def test_sort_orders():
    orders = [{"id": 3, "total": 120}, {"id": 1, "total": 300}, {"id": 2, "total": 120}]
    assert [o["id"] for o in sort_orders(orders)] == [1, 2, 3]


def test_grade():
    cut, lab = [50, 70, 85], "FCBA"
    assert [grade(s, cut, lab) for s in (0, 45, 50, 69, 70, 84, 85, 100)] == list("FFCCBBAA")

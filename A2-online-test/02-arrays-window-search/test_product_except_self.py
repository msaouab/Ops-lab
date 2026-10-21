from product_except_self import *  # noqa: F401,F403

def test_examples():
    assert product_except_self([1, 2, 3, 4]) == [24, 12, 8, 6]
    assert product_except_self([-1, 1, 0, -3, 3]) == [0, 0, 9, 0, 0]
    assert product_except_self([0, 0]) == [0, 0]
    assert product_except_self([5, 2]) == [2, 5]

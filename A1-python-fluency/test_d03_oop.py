from d03_oop import *  # noqa: F401,F403

import pytest


def test_product_basics():
    p = Product("Desk", 120)
    assert repr(p) == "Product('Desk', 120.0)"
    assert p.price_with_tax() == 145.2
    assert p.price_with_tax(0.06) == 127.2
    with pytest.raises(ValueError):
        p.price = -1
    with pytest.raises(ValueError):
        Product("Bad", -5)


def test_product_equality_and_hash():
    assert Product("Desk", 1) == Product("Desk", 99)
    assert len({Product("Desk", 1), Product("Desk", 2), Product("Lamp", 3)}) == 2


def test_from_dict():
    p = Product.from_dict({"name": "Lamp", "price": 30})
    assert isinstance(p, Product) and p.price == 30.0


def test_discounted():
    d = DiscountedProduct("Chair", 100, 0.5)
    assert isinstance(d, Product)
    assert d.price == 100.0
    assert d.price_with_tax() == 60.5


def test_registry():
    REGISTRY.clear()

    @register("sale.order")
    class SaleOrder:
        pass

    assert REGISTRY["sale.order"] is SaleOrder
    assert SaleOrder._name == "sale.order"
    assert isinstance(env("sale.order"), SaleOrder)
    with pytest.raises(KeyError):
        env("res.partner")


def test_super_chain():
    assert Order().confirm() == ["confirmed"]
    assert LoggedOrder().confirm() == ["logged", "confirmed"]
    assert CheckedOrder().confirm() == ["checked", "logged", "confirmed"]

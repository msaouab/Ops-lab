from install_order import *  # noqa: F401,F403

import pytest


def test_order():
    assert install_order({"sale": ["base", "product"], "product": ["base"], "base": []}) == [
        "base", "product", "sale"]
    deps = {"sale_stock": ["sale", "stock"], "sale": ["product"], "stock": ["product"],
            "product": ["base"], "mail": ["base"]}
    assert install_order(deps) == ["base", "mail", "product", "sale", "stock", "sale_stock"]


def test_implicit_and_empty():
    assert install_order({"web": ["base"]}) == ["base", "web"]
    assert install_order({}) == []


def test_cycle():
    with pytest.raises(ValueError):
        install_order({"a": ["b"], "b": ["c"], "c": ["a"]})

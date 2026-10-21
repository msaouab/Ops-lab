"""
Drill 03 · Classes the ERP-framework way  ·  Core  ·  classes, inheritance, super(), properties, dunder methods, class registry  ·  target 40 min

ERP framework models are Python classes extended through inheritance and super() chains.
This drill rehearses exactly those mechanics, without any framework.

1. Product(name, price)
   - `price` is a property; setting a negative price raises ValueError
   - __repr__ -> "Product('Desk', 120.0)"
   - equality and hashing by name (two Products with the same name are equal)
   - classmethod from_dict({"name": ..., "price": ...})
   - price_with_tax(rate=0.21) -> rounded to 2 decimals

2. DiscountedProduct(Product) with an extra `discount` (0..1)
   - price_with_tax() applies the discount BEFORE tax, calling super() for the tax part
     (hint: compute on the discounted price, keep tax logic in the parent)

3. A tiny model registry, like an ERP framework's:
   - REGISTRY: dict[str, type]
   - decorator @register("sale.order") stores the class in REGISTRY under that name
     and sets cls._name = "sale.order"; returns the class unchanged otherwise
   - env(name) -> a new instance of the registered class; KeyError if unknown

4. Extending behaviour with super() chains (this is how model-inheritance overrides work):
   - Base `Order` has confirm() returning ["confirmed"]
   - `LoggedOrder(Order)` confirm() returns ["logged"] + super().confirm()
   - `CheckedOrder(LoggedOrder)` confirm() returns ["checked"] + super().confirm()
   so CheckedOrder().confirm() == ["checked", "logged", "confirmed"]
"""

REGISTRY: dict[str, type] = {}


class Product:
    def __init__(self, name: str, price: float):
        raise NotImplementedError


class DiscountedProduct(Product):
    def __init__(self, name: str, price: float, discount: float):
        raise NotImplementedError


def register(name: str):
    raise NotImplementedError


def env(name: str):
    raise NotImplementedError


class Order:
    def confirm(self) -> list[str]:
        raise NotImplementedError


class LoggedOrder(Order):
    pass


class CheckedOrder(LoggedOrder):
    pass

"""
Drill 05 · Dataclasses, enums and a state machine  ·  Core  ·  dataclasses, Enum, typing, exceptions  ·  target 35 min

ERP documents (sale orders, invoices) move through states. Model a tiny one.

- State: Enum with DRAFT="draft", SENT="sent", SALE="sale", CANCEL="cancel"
- Line: dataclass(product: str, qty: float, price: float), property subtotal = qty * price
- SaleOrder: dataclass(name: str, lines: list[Line] = empty list, state: State = DRAFT)
    - total (property): sum of line subtotals, rounded to 2 decimals
    - add_line(product, qty, price): only in DRAFT, else raise InvalidTransition;
      qty must be > 0 else ValueError
    - send():    DRAFT -> SENT
    - confirm(): DRAFT or SENT -> SALE; an order with no lines cannot be confirmed (ValueError)
    - cancel():  anything except SALE -> CANCEL
    - any other transition raises InvalidTransition (subclass of Exception)
- orders_by_state(orders) -> {State: count} including states with 0
"""
from dataclasses import dataclass, field
from enum import Enum

class InvalidTransition(Exception):
    pass


class State(Enum):
    DRAFT = "draft"
    # add the other states


@dataclass
class Line:
    product: str
    qty: float
    price: float


@dataclass
class SaleOrder:
    name: str


def orders_by_state(orders: list) -> dict:
    raise NotImplementedError

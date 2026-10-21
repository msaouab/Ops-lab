from d05_dataclasses_state import *  # noqa: F401,F403

import pytest


def test_states():
    assert [s.value for s in State] == ["draft", "sent", "sale", "cancel"]


def test_lines_and_total():
    so = SaleOrder("S001")
    assert so.state is State.DRAFT and so.lines == []
    so.add_line("Desk", 2, 120.10)
    so.add_line("Lamp", 1, 29.99)
    assert so.lines[0].subtotal == pytest.approx(240.2)
    assert so.total == 270.19
    with pytest.raises(ValueError):
        so.add_line("Pen", 0, 1)


def test_default_lists_not_shared():
    a, b = SaleOrder("A"), SaleOrder("B")
    a.add_line("Desk", 1, 1)
    assert b.lines == []


def test_happy_path():
    so = SaleOrder("S002")
    so.add_line("Desk", 1, 100)
    so.send()
    assert so.state is State.SENT
    so.confirm()
    assert so.state is State.SALE
    with pytest.raises(InvalidTransition):
        so.add_line("Lamp", 1, 10)
    with pytest.raises(InvalidTransition):
        so.cancel()


def test_invalid_transitions():
    so = SaleOrder("S003")
    with pytest.raises(ValueError):
        so.confirm()
    so.cancel()
    assert so.state is State.CANCEL
    with pytest.raises(InvalidTransition):
        so.send()
    with pytest.raises(InvalidTransition):
        so.confirm()
    assert issubclass(InvalidTransition, Exception)


def test_orders_by_state():
    a, b, c = SaleOrder("A"), SaleOrder("B"), SaleOrder("C")
    b.send()
    c.cancel()
    assert orders_by_state([a, b, c]) == {State.DRAFT: 1, State.SENT: 1, State.SALE: 0, State.CANCEL: 1}

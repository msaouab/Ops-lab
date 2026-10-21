"""
Mock 2 · Q1 · FIFO cost of goods sold  ·  Medium  ·  queue, simulation (ERP inventory valuation)  ·  target 25 min

ERPs can value stock with FIFO: deliveries consume the OLDEST received units first.
receipts: list of (qty, unit_cost) in arrival order. deliveries: list of quantities, in order.
Return the total cost of all delivered units, rounded to 2 decimals.
Raise ValueError when a delivery needs more units than are in stock.

    fifo_cost([(10, 5.0), (5, 7.0)], [8, 4]) -> 8*5 + (2*5 + 2*7) = 64.0
"""
from collections import deque

def fifo_cost(receipts: list[tuple[float, float]], deliveries: list[float]) -> float:
    raise NotImplementedError

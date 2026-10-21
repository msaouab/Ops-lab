def test_m2_inventory_valuation(run_query):
    cols, rows = run_query('m2_inventory_valuation')
    assert cols == ['product', 'on_hand', 'avg_cost', 'value']
    assert rows == [
        ['Desk', 21.0, 180.0, 3780.0],
        ['Desk Lamp', 52.0, 17.89, 930.22],
        ['Office Chair', 8.0, 68.0, 544.0],
        ['Whiteboard', 5.0, 40.0, 200.0],
        ['LED Panel', 3.0, 58.0, 174.0],
    ]

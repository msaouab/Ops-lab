def test_q13_stock_on_hand(run_query):
    cols, rows = run_query('q13_stock_on_hand')
    assert cols == ['product', 'on_hand']
    assert rows == [
        ['Cabinet', 0.0],
        ['Desk', 21.0],
        ['Desk Lamp', 52.0],
        ['ERP Training Day', 0.0],
        ['Installation (1h)', 0.0],
        ['LED Panel', 3.0],
        ['Notebook A5', 0.0],
        ['Office Chair', 8.0],
        ['Whiteboard', 5.0],
    ]

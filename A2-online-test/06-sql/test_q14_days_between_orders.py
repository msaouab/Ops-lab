def test_q14_days_between_orders(run_query):
    cols, rows = run_query('q14_days_between_orders')
    assert cols == ['customer', 'avg_days']
    assert rows == [
        ['Acme Corp', 38.0],
        ['Atlas Logistics', 86.0],
        ['Dutch Bikes BV', 56.0],
        ['Marrakech Tiles', 36.0],
    ]

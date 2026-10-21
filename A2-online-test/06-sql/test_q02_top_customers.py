def test_q02_top_customers(run_query):
    cols, rows = run_query('q02_top_customers')
    assert cols == ['customer', 'revenue']
    assert rows == [
        ['Acme Corp', 8849.0],
        ['Atlas Logistics', 2895.0],
        ['Marrakech Tiles', 2400.0],
    ]

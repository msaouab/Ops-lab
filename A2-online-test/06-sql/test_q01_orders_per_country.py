def test_q01_orders_per_country(run_query):
    cols, rows = run_query('q01_orders_per_country')
    assert cols == ['country', 'orders']
    assert rows == [
        ['Belgium', 6],
        ['Morocco', 6],
        ['Netherlands', 2],
        ['France', 1],
    ]

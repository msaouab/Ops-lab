def test_m3_lost_customers(run_query):
    cols, rows = run_query('m3_lost_customers')
    assert cols == ['customer', 'last_order']
    assert rows == [
        ['Café Paris', '2026-01-20'],
        ['Brasserie Lune', '2026-02-20'],
        ['ACME corp', '2026-03-10'],
        ['Marrakech Tiles', '2026-03-22'],
        ['Dutch Bikes BV', '2026-03-30'],
    ]

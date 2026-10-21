def test_m1_best_seller_per_month(run_query):
    cols, rows = run_query('m1_best_seller_per_month')
    assert cols == ['month', 'product', 'units']
    assert rows == [
        ['2026-01', 'Notebook A5', 50.0],
        ['2026-02', 'Notebook A5', 100.0],
        ['2026-03', 'Notebook A5', 200.0],
        ['2026-04', 'Desk', 9.0],
    ]

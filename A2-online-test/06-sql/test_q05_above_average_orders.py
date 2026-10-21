def test_q05_above_average_orders(run_query):
    cols, rows = run_query('q05_above_average_orders')
    assert cols == ['name', 'total']
    assert rows == [
        ['S00020', 3039.0],
        ['S00011', 2430.0],
        ['S00001', 2000.0],
        ['S00016', 1860.0],
        ['S00015', 1440.0],
        ['S00009', 1380.0],
        ['S00005', 1380.0],
    ]

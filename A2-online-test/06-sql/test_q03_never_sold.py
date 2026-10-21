def test_q03_never_sold(run_query):
    cols, rows = run_query('q03_never_sold')
    assert cols == ['product']
    assert rows == [
        ['Whiteboard'],
    ]

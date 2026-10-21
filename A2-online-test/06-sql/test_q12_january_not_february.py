def test_q12_january_not_february(run_query):
    cols, rows = run_query('q12_january_not_february')
    assert cols == ['customer']
    assert rows == [
        ['Acme Corp'],
        ['Atlas Logistics'],
        ['Café Paris'],
    ]

def test_q06_duplicate_partners(run_query):
    cols, rows = run_query('q06_duplicate_partners')
    assert cols == ['name', 'copies']
    assert rows == [
        ['acme corp', 2],
        ['atlas logistics', 2],
    ]

def test_q15_conversion_rate(run_query):
    cols, rows = run_query('q15_conversion_rate')
    assert cols == ['salesperson', 'total', 'confirmed', 'rate']
    assert rows == [
        ['Hamza', 7, 6, 85.7],
        ['Lea', 6, 5, 83.3],
        ['Omar', 6, 4, 66.7],
    ]

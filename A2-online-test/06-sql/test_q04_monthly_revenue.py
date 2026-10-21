def test_q04_monthly_revenue(run_query):
    cols, rows = run_query('q04_monthly_revenue')
    assert cols == ['month', 'revenue']
    assert rows == [
        ['2026-01', 4985.0],
        ['2026-02', 3490.0],
        ['2026-03', 6285.0],
        ['2026-04', 5514.0],
    ]

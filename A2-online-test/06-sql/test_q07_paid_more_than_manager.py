def test_q07_paid_more_than_manager(run_query):
    cols, rows = run_query('q07_paid_more_than_manager')
    assert cols == ['employee', 'manager', 'salary', 'manager_salary']
    assert rows == [
        ['Ines', 'Pieter', 8000.0, 7500.0],
        ['Omar', 'Hamza', 4600.0, 4300.0],
    ]

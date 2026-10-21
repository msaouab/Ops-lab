def test_q10_second_highest_salary(run_query):
    cols, rows = run_query('q10_second_highest_salary')
    assert cols == ['department', 'salary']
    assert rows == [
        ['R&D', 7500.0],
        ['Sales', 4600.0],
    ]

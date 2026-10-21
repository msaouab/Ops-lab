def test_q11_org_chart(run_query):
    cols, rows = run_query('q11_org_chart')
    assert cols == ['name', 'level']
    assert rows == [
        ['Fabien', 1],
        ['Nadia', 2],
        ['Pieter', 2],
        ['Hamza', 3],
        ['Ines', 3],
        ['Julie', 3],
        ['Karim', 3],
        ['Lea', 3],
        ['Omar', 4],
        ['Sofie', 4],
    ]

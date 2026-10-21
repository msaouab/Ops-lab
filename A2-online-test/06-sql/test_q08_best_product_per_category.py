def test_q08_best_product_per_category(run_query):
    cols, rows = run_query('q08_best_product_per_category')
    assert cols == ['category', 'product', 'revenue']
    assert rows == [
        ['Furniture', 'Desk', 4704.0],
        ['Lighting', 'LED Panel', 2580.0],
        ['Office supplies', 'Notebook A5', 1575.0],
        ['Services', 'ERP Training Day', 3510.0],
    ]

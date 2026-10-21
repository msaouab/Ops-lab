SET search_path TO prep;

INSERT INTO res_country (code, name) VALUES
 ('BE', 'Belgium'), ('MA', 'Morocco'), ('FR', 'France'), ('NL', 'Netherlands'), ('LU', 'Luxembourg');

INSERT INTO res_partner (name, email, country_id, is_company, parent_id, create_date) VALUES
 ('Acme Corp',        'info@acme.be',      1, true,  NULL, '2025-11-02'),  -- 1
 ('Atlas Logistics',  'hello@atlas.ma',    2, true,  NULL, '2025-11-20'),  -- 2
 ('Brasserie Lune',   'contact@lune.be',   1, true,  NULL, '2025-12-05'),  -- 3
 ('Café Paris',       'bonjour@cafe.fr',   3, true,  NULL, '2026-01-03'),  -- 4
 ('Dutch Bikes BV',   'sales@dbikes.nl',   4, true,  NULL, '2026-01-10'),  -- 5
 ('ACME corp',        'billing@acme.be',   1, true,  NULL, '2026-01-15'),  -- 6 duplicate of 1
 ('Sara El Amrani',   'sara@atlas.ma',     2, false, 2,    '2025-11-21'),  -- 7 contact of Atlas
 ('Tom Peeters',      'tom@lune.be',       1, false, 3,    '2025-12-06'),  -- 8 contact of Lune
 ('Marrakech Tiles',  'shop@mtiles.ma',    2, true,  NULL, '2026-02-01'),  -- 9
 ('Lux Finance',      NULL,                5, true,  NULL, '2026-02-14'),  -- 10 never ordered
 ('atlas logistics',  'ops@atlas.ma',      2, true,  NULL, '2026-03-01'),  -- 11 duplicate of 2
 ('Youssef Benali',   'youssef@gmail.com', 2, false, NULL, '2026-03-09');  -- 12 individual

INSERT INTO hr_employee (name, department, job_title, manager_id, hire_date, salary) VALUES
 ('Fabien',  'Management', 'CEO',             NULL, '2015-01-01', 9000),  -- 1
 ('Nadia',   'Sales',      'Sales Director',  1,    '2017-03-15', 7200),  -- 2
 ('Pieter',  'R&D',        'R&D Director',    1,    '2016-06-01', 7500),  -- 3
 ('Hamza',   'Sales',      'Account Manager', 2,    '2021-09-01', 4300),  -- 4
 ('Lea',     'Sales',      'Account Manager', 2,    '2022-02-01', 4300),  -- 5
 ('Omar',    'Sales',      'Sales Rep',       4,    '2024-05-01', 4600),  -- 6 earns more than manager Hamza
 ('Julie',   'R&D',        'Developer',       3,    '2020-01-10', 5200),  -- 7
 ('Karim',   'R&D',        'Developer',       3,    '2023-07-03', 4100),  -- 8
 ('Sofie',   'R&D',        'Developer',       7,    '2025-09-01', 3600),  -- 9
 ('Ines',    'R&D',        'Tech Lead',       3,    '2019-04-01', 8000);  -- 10 earns more than manager Pieter

INSERT INTO product_category (name) VALUES ('Furniture'), ('Lighting'), ('Services'), ('Office supplies');

INSERT INTO product_product (name, categ_id, list_price, standard_price, active) VALUES
 ('Desk',               1, 320.00, 180.00, true),   -- 1
 ('Office Chair',       1, 150.00,  70.00, true),   -- 2
 ('Cabinet',            1, 210.00, 120.00, true),   -- 3
 ('Desk Lamp',          2,  45.00,  18.00, true),   -- 4
 ('LED Panel',          2, 120.00,  60.00, true),   -- 5
 ('Installation (1h)',  3,  60.00,   0.00, true),   -- 6
 ('ERP Training Day',   3, 900.00, 300.00, true),   -- 7
 ('Notebook A5',        4,   4.50,   1.20, true),   -- 8
 ('Whiteboard',         4,  85.00,  40.00, true),   -- 9  never sold
 ('Fax Machine',        4, 199.00, 150.00, false);  -- 10 archived, never sold

INSERT INTO sale_order (name, partner_id, user_id, date_order, state) VALUES
 ('S00001', 1,  4, '2026-01-05', 'sale'),    -- 1
 ('S00002', 2,  5, '2026-01-08', 'sale'),    -- 2
 ('S00003', 3,  4, '2026-01-12', 'cancel'),  -- 3
 ('S00004', 4,  6, '2026-01-20', 'sale'),    -- 4
 ('S00005', 1,  4, '2026-01-28', 'sale'),    -- 5
 ('S00006', 5,  5, '2026-02-02', 'sale'),    -- 6
 ('S00007', 2,  5, '2026-02-09', 'sent'),    -- 7
 ('S00008', 9,  6, '2026-02-14', 'sale'),    -- 8
 ('S00009', 3,  4, '2026-02-20', 'sale'),    -- 9
 ('S00010', 12, 6, '2026-02-25', 'draft'),   -- 10
 ('S00011', 1,  4, '2026-03-03', 'sale'),    -- 11
 ('S00012', 6,  5, '2026-03-10', 'sale'),    -- 12
 ('S00013', 4,  6, '2026-03-15', 'cancel'),  -- 13
 ('S00014', 9,  6, '2026-03-22', 'sale'),    -- 14
 ('S00015', 5,  5, '2026-03-30', 'sale'),    -- 15
 ('S00016', 2,  5, '2026-04-04', 'sale'),    -- 16
 ('S00017', 11, 4, '2026-04-11', 'sale'),    -- 17
 ('S00018', 12, 6, '2026-04-18', 'sale'),    -- 18
 ('S00019', 3,  NULL, '2026-04-25', 'draft'),-- 19
 ('S00020', 1,  4, '2026-04-29', 'sale');    -- 20

INSERT INTO sale_order_line (order_id, product_id, qty, price_unit, discount) VALUES
 (1, 1, 4, 320.00, 0), (1, 2, 4, 150.00, 0), (1, 6, 2, 60.00, 0),
 (2, 7, 1, 900.00, 10), (2, 8, 50, 4.50, 0),
 (3, 3, 2, 210.00, 0),
 (4, 4, 6, 45.00, 0), (4, 2, 2, 150.00, 0),
 (5, 5, 10, 120.00, 5), (5, 6, 4, 60.00, 0),
 (6, 1, 2, 320.00, 0), (6, 3, 1, 210.00, 0),
 (7, 7, 2, 900.00, 0),
 (8, 4, 20, 45.00, 10), (8, 8, 100, 4.50, 0),
 (9, 2, 6, 150.00, 0), (9, 5, 4, 120.00, 0),
 (10, 1, 1, 320.00, 0),
 (11, 7, 2, 900.00, 0), (11, 3, 3, 210.00, 0),
 (12, 2, 10, 150.00, 15),
 (13, 1, 5, 320.00, 0),
 (14, 5, 8, 120.00, 0), (14, 6, 3, 60.00, 0),
 (15, 4, 12, 45.00, 0), (15, 8, 200, 4.50, 0),
 (16, 1, 3, 320.00, 0), (16, 7, 1, 900.00, 0),
 (17, 3, 2, 210.00, 0),
 (18, 2, 1, 150.00, 0), (18, 4, 1, 45.00, 0),
 (19, 5, 6, 120.00, 0),
 (20, 1, 6, 320.00, 5), (20, 2, 6, 150.00, 5), (20, 6, 6, 60.00, 0);

INSERT INTO stock_move (product_id, date, qty, unit_cost) VALUES
 (1, '2025-12-15',  20, 175.00),
 (1, '2026-01-05',  -4, 175.00),
 (1, '2026-02-01',  10, 190.00),
 (1, '2026-02-02',  -2, 175.00),
 (1, '2026-04-04',  -3, 175.00),
 (2, '2025-12-15',  30,  68.00),
 (2, '2026-01-05',  -4,  68.00),
 (2, '2026-01-20',  -2,  68.00),
 (2, '2026-02-20',  -6,  68.00),
 (2, '2026-03-10', -10,  68.00),
 (4, '2026-01-02',  50,  17.00),
 (4, '2026-01-20',  -6,  17.00),
 (4, '2026-02-14', -20,  17.00),
 (4, '2026-03-01',  40,  19.00),
 (4, '2026-03-30', -12,  17.00),
 (5, '2026-01-10',  25,  58.00),
 (5, '2026-01-28', -10,  58.00),
 (5, '2026-02-20',  -4,  58.00),
 (5, '2026-03-22',  -8,  58.00),
 (9, '2026-02-01',   5,  40.00);

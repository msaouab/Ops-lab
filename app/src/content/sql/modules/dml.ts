import type { Module, SqlExercise } from '../../types';

const dmlModule: Module<SqlExercise> = {
  id: "dml",
  title: "Changing Data",
  tags: "INSERT · UPDATE · DELETE · UPSERT",
  parents: ["cte"],
  summary: "Add, change and remove rows. Every exercise here runs on a fresh copy of the database, so experiment freely.",
  lesson: [
    {
      heading: "INSERT",
      body: "Name the columns, then give the values in the same order. Columns you leave out get their default or NULL.",
      code: `INSERT INTO res_partner (id, name, city, country, is_company)
VALUES (11, 'Agadir Surf Shop', 'Agadir', 'Morocco', 1);

SELECT * FROM res_partner WHERE id = 11;`,
    },
    {
      heading: "Several rows, or rows from a query",
      body: "Separate value lists with commas, or use <code>INSERT … SELECT</code> to copy rows produced by a query.",
      code: `INSERT INTO hr_department (id, name, budget) VALUES (6, 'Marketing', 70000), (7, 'Finance', 90000);

INSERT INTO hr_department (id, name, budget)
SELECT 8, name || ' Archive', 0 FROM hr_department WHERE id = 5;

SELECT * FROM hr_department;`,
    },
    {
      heading: "UPDATE",
      body: "<code>SET</code> new values on the rows that match <code>WHERE</code>. Run the same <code>WHERE</code> as a <code>SELECT</code> first to see what you will change.",
      code: `UPDATE product_product
SET list_price = list_price * 1.05
WHERE category = 'Office';

SELECT name, list_price FROM product_product WHERE category = 'Office';`,
    },
    {
      heading: "DELETE",
      body: "Removes the rows that match. Without a <code>WHERE</code> it removes every row in the table.",
      code: `DELETE FROM sale_order WHERE state = 'draft';

SELECT state, COUNT(*) FROM sale_order GROUP BY state;`,
    },
    {
      heading: "RETURNING",
      body: "Get the affected rows back from the same statement.",
      code: `UPDATE hr_employee SET salary = salary + 300 WHERE job_title = 'Support Agent'
RETURNING name, salary;`,
    },
    {
      heading: "UPSERT",
      body: "<code>ON CONFLICT</code> turns a failing insert into an update (or into nothing). <code>excluded</code> holds the row you tried to insert.",
      code: `INSERT INTO product_product (id, name, category, list_price, cost)
VALUES (3, 'Desk Lamp', 'Office', 45, 15)
ON CONFLICT(id) DO UPDATE SET list_price = excluded.list_price;

SELECT * FROM product_product WHERE id = 3;`,
      note: { label: 'PostgreSQL', body: "PostgreSQL uses the same <code>ON CONFLICT … DO UPDATE / DO NOTHING</code> syntax and also supports <code>RETURNING</code>. In an ORM, methods like <code>create()</code>, <code>write()</code> and <code>unlink()</code> generate these statements for you." },
    },
  ],
  exercises: [
    {
      slug: "hire-a-developer",
      kind: 'sql',
      mode: "mutate",
      title: "Hire a developer",
      difficulty: "Easy",
      tables: ["hr_employee"],
      prompt: "Add employee id <code>15</code>: <code>Yassine Haddad</code>, job <code>Developer</code>, department 3, manager 4, salary 5200, hired <code>2026-10-01</code>, email <code>yassine.haddad@erp-demo.ma</code>.",
      check: "SELECT * FROM hr_employee WHERE id = 15;",
      hint: "INSERT INTO hr_employee (…) VALUES (…);",
      solution: `INSERT INTO hr_employee (id, name, job_title, department_id, manager_id, salary, hire_date, email)
VALUES (15, 'Yassine Haddad', 'Developer', 3, 4, 5200, '2026-10-01', 'yassine.haddad@erp-demo.ma');`,
    },
    {
      slug: "raise-for-r-and-d",
      kind: 'sql',
      mode: "mutate",
      title: "Raise for R&D",
      difficulty: "Easy",
      tables: ["hr_employee"],
      prompt: "Give everyone in department 3 a 10% raise. Nobody else changes.",
      check: "SELECT id, salary FROM hr_employee ORDER BY id;",
      hint: "UPDATE … SET salary = salary * 1.1 WHERE …",
      solution: "UPDATE hr_employee SET salary = salary * 1.1 WHERE department_id = 3;",
    },
    {
      slug: "clear-cancelled-orders",
      kind: 'sql',
      mode: "mutate",
      title: "Clear cancelled orders",
      difficulty: "Medium",
      tables: ["sale_order", "sale_order_line"],
      prompt: "Delete every cancelled order and its order lines. Lines must not be left pointing at deleted orders.",
      check: "SELECT (SELECT COUNT(*) FROM sale_order) AS orders, (SELECT COUNT(*) FROM sale_order_line) AS lines, (SELECT group_concat(id) FROM sale_order) AS ids;",
      hint: "Delete the lines first, using a subquery on sale_order.",
      solution: `DELETE FROM sale_order_line WHERE order_id IN (SELECT id FROM sale_order WHERE state = 'cancel');
DELETE FROM sale_order WHERE state = 'cancel';`,
    },
    {
      slug: "catalog-sync",
      kind: 'sql',
      mode: "mutate",
      title: "Catalog sync",
      difficulty: "Medium",
      tables: ["product_product"],
      prompt: "In one <code>INSERT</code> statement, write two products: id 4 (<code>Monitor 27 inch</code>, Electronics, price 299, cost 250) which already exists and must have its price updated, and id 11 (<code>Monitor Arm</code>, Office, price 89, cost 40), which is new.",
      check: "SELECT * FROM product_product WHERE id IN (4, 11) ORDER BY id;",
      hint: "INSERT … VALUES (…), (…) ON CONFLICT(id) DO UPDATE SET list_price = excluded.list_price",
      solution: `INSERT INTO product_product (id, name, category, list_price, cost)
VALUES (4, 'Monitor 27 inch', 'Electronics', 299, 250), (11, 'Monitor Arm', 'Office', 89, 40)
ON CONFLICT(id) DO UPDATE SET list_price = excluded.list_price;`,
    },
  ],
};

export default dmlModule;

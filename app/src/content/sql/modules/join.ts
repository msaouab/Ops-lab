import type { Module, SqlExercise } from '../../types';

const joinModule: Module<SqlExercise> = {
  id: "join",
  title: "Joins",
  tags: "INNER · LEFT · self join",
  parents: ["expr"],
  summary: "Real data lives in many tables linked by ids. Joins put the pieces back together.",
  lesson: [
    {
      heading: "Foreign keys link tables",
      body: "<code>sale_order.partner_id</code> holds the <code>id</code> of a row in <code>res_partner</code>. ERP frameworks build every many-to-one field this way.",
      code: "SELECT id, name, partner_id FROM sale_order LIMIT 4;",
    },
    {
      heading: "INNER JOIN",
      body: "Pairs each row of the left table with matching rows of the right table. Rows without a match disappear. Short table aliases keep the query readable.",
      code: `SELECT o.name AS order_ref, p.name AS customer
FROM sale_order o
JOIN res_partner p ON p.id = o.partner_id;`,
    },
    {
      heading: "LEFT JOIN",
      body: "Keeps every row of the left table. Where nothing matches, the right side is NULL. Here, Legal has no staff but still appears.",
      code: `SELECT d.name, e.name AS employee
FROM hr_department d
LEFT JOIN hr_employee e ON e.department_id = d.id
ORDER BY d.id;`,
    },
    {
      heading: "Finding what is missing",
      body: "A <code>LEFT JOIN</code> followed by <code>WHERE right.id IS NULL</code> returns the left rows that have no match. This is called an anti-join.",
      code: `SELECT p.name
FROM res_partner p
LEFT JOIN sale_order o ON o.partner_id = p.id
WHERE o.id IS NULL;`,
    },
    {
      heading: "Self join",
      body: "A table can join to itself. Give each copy its own alias.",
      code: `SELECT e.name, m.name AS manager
FROM hr_employee e
JOIN hr_employee m ON m.id = e.manager_id;`,
    },
    {
      heading: "Many tables",
      body: "Chain joins to walk from one table to the next.",
      code: `SELECT o.name, p.name AS customer, pr.name AS product, l.qty
FROM sale_order_line l
JOIN sale_order o ON o.id = l.order_id
JOIN res_partner p ON p.id = o.partner_id
JOIN product_product pr ON pr.id = l.product_id
LIMIT 6;`,
      note: { label: 'PostgreSQL', body: "<code>RIGHT JOIN</code> and <code>FULL OUTER JOIN</code> exist in PostgreSQL (and SQLite 3.39+). <code>CROSS JOIN</code> pairs every row with every row. With a <code>LEFT JOIN</code>, a condition on the right table belongs in <code>ON</code>; putting it in <code>WHERE</code> turns it back into an inner join." },
    },
  ],
  exercises: [
    {
      slug: "employee-departments",
      kind: 'sql',
      mode: "query",
      title: "Employee departments",
      difficulty: "Easy",
      tables: ["hr_employee", "hr_department"],
      prompt: "Return each employee's <code>name</code> and the <code>name</code> of their department. Employees without a department are left out.",
      hint: "INNER JOIN on department_id.",
      solution: `SELECT e.name, d.name
FROM hr_employee e
JOIN hr_department d ON d.id = e.department_id;`,
    },
    {
      slug: "headcount-for-every-department",
      kind: 'sql',
      mode: "query",
      title: "Headcount for every department",
      difficulty: "Medium",
      tables: ["hr_department", "hr_employee"],
      prompt: "Return every department's <code>name</code> and how many employees it has. Departments with nobody show 0.",
      hint: "LEFT JOIN, then COUNT(e.id), not COUNT(*).",
      solution: `SELECT d.name, COUNT(e.id)
FROM hr_department d
LEFT JOIN hr_employee e ON e.department_id = d.id
GROUP BY d.id, d.name;`,
    },
    {
      slug: "never-sold",
      kind: 'sql',
      mode: "query",
      title: "Never sold",
      difficulty: "Medium",
      tables: ["product_product", "sale_order_line"],
      prompt: "Return the <code>name</code> of products that appear on no order line.",
      hint: "Anti-join: LEFT JOIN … WHERE l.id IS NULL.",
      solution: `SELECT p.name
FROM product_product p
LEFT JOIN sale_order_line l ON l.product_id = p.id
WHERE l.id IS NULL;`,
    },
    {
      slug: "who-is-your-manager",
      kind: 'sql',
      mode: "query",
      title: "Who is your manager",
      difficulty: "Medium",
      tables: ["hr_employee"],
      prompt: "Return every employee's <code>name</code> and their manager's <code>name</code>. The CEO has no manager and must still appear, with NULL.",
      hint: "Self join, LEFT so nobody is dropped.",
      solution: `SELECT e.name, m.name AS manager
FROM hr_employee e
LEFT JOIN hr_employee m ON m.id = e.manager_id;`,
    },
    {
      slug: "revenue-by-customer",
      kind: 'sql',
      mode: "query",
      title: "Revenue by customer",
      difficulty: "Hard",
      tables: ["res_partner", "sale_order", "sale_order_line"],
      ordered: true,
      prompt: "For orders in state <code>sale</code> or <code>done</code>, return partner <code>name</code> and total revenue (<code>qty × price_unit × (1 − discount/100)</code>, rounded to 2), highest revenue first.",
      hint: "Join three tables, filter, GROUP BY the partner, ORDER BY the sum.",
      solution: `SELECT p.name, ROUND(SUM(l.qty * l.price_unit * (1 - l.discount / 100.0)), 2) AS revenue
FROM sale_order o
JOIN res_partner p ON p.id = o.partner_id
JOIN sale_order_line l ON l.order_id = o.id
WHERE o.state IN ('sale', 'done')
GROUP BY p.id, p.name
ORDER BY revenue DESC;`,
    },
  ],
};

export default joinModule;

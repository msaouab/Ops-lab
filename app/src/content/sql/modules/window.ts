import type { Module, SqlExercise } from '../../types';

const windowModule: Module<SqlExercise> = {
  id: "window",
  title: "Window Functions",
  tags: "OVER · PARTITION BY · RANK · LAG",
  parents: ["sub"],
  summary: "Compute across related rows without collapsing them: rankings, running totals, and previous/next values.",
  lesson: [
    {
      heading: "Aggregates that keep the rows",
      body: "Add <code>OVER ()</code> to an aggregate and every row keeps its identity while also seeing the aggregate.",
      code: `SELECT name, salary, ROUND(AVG(salary) OVER ()) AS company_avg
FROM hr_employee;`,
    },
    {
      heading: "PARTITION BY",
      body: "Splits the window into groups, like <code>GROUP BY</code>, but without merging rows.",
      code: `SELECT name, department_id, salary,
       MAX(salary) OVER (PARTITION BY department_id) AS dept_max
FROM hr_employee;`,
    },
    {
      heading: "ROW_NUMBER, RANK, DENSE_RANK",
      body: "All three number rows by the window's <code>ORDER BY</code>. On ties: <code>ROW_NUMBER</code> still counts 1, 2, 3; <code>RANK</code> gives 1, 1, 3; <code>DENSE_RANK</code> gives 1, 1, 2.",
      code: `SELECT name, salary,
  ROW_NUMBER() OVER (ORDER BY salary) AS rn,
  RANK()       OVER (ORDER BY salary) AS rnk,
  DENSE_RANK() OVER (ORDER BY salary) AS dense
FROM hr_employee WHERE department_id = 4;`,
    },
    {
      heading: "Running totals",
      body: "With an <code>ORDER BY</code> inside <code>OVER</code>, <code>SUM</code> adds up everything from the first row to the current one.",
      code: `SELECT date_order, name,
  COUNT(*) OVER (ORDER BY date_order, id) AS orders_so_far
FROM sale_order;`,
    },
    {
      heading: "LAG and LEAD",
      body: "Read a value from the previous or next row in the window.",
      code: `SELECT name, date_order,
  LAG(date_order) OVER (ORDER BY date_order) AS previous,
  LEAD(date_order) OVER (ORDER BY date_order) AS next
FROM sale_order;`,
    },
    {
      heading: "Filtering on a window",
      body: "Window functions run after <code>WHERE</code>, so you cannot filter on them directly. Compute them in a CTE, then filter. This is the classic “top N per group” pattern.",
      code: `WITH ranked AS (
  SELECT name, category, list_price,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY list_price DESC) AS rn
  FROM product_product
)
SELECT category, name, list_price FROM ranked WHERE rn = 1;`,
    },
  ],
  exercises: [
    {
      slug: "rank-by-salary",
      kind: 'sql',
      mode: "query",
      title: "Rank by salary",
      difficulty: "Easy",
      tables: ["hr_employee"],
      prompt: "Return <code>name</code>, <code>salary</code> and <code>RANK()</code> by salary, highest = 1.",
      hint: "RANK() OVER (ORDER BY salary DESC)",
      solution: "SELECT name, salary, RANK() OVER (ORDER BY salary DESC) FROM hr_employee;",
    },
    {
      slug: "rank-inside-the-department",
      kind: 'sql',
      mode: "query",
      title: "Rank inside the department",
      difficulty: "Medium",
      tables: ["hr_employee"],
      prompt: "Return <code>name</code>, <code>department_id</code>, <code>salary</code> and a dense rank of salary within the department, highest = 1.",
      hint: "DENSE_RANK() OVER (PARTITION BY … ORDER BY … DESC)",
      solution: `SELECT name, department_id, salary,
  DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC)
FROM hr_employee;`,
    },
    {
      slug: "previous-order-date",
      kind: 'sql',
      mode: "query",
      title: "Previous order date",
      difficulty: "Medium",
      tables: ["sale_order"],
      ordered: true,
      prompt: "Return every order's <code>name</code>, <code>date_order</code>, and the date of the order placed just before it (NULL for the first). Sort by date.",
      hint: "LAG(date_order) OVER (ORDER BY date_order)",
      solution: `SELECT name, date_order, LAG(date_order) OVER (ORDER BY date_order) AS prev_date
FROM sale_order ORDER BY date_order;`,
    },
    {
      slug: "priciest-per-category",
      kind: 'sql',
      mode: "query",
      title: "Priciest per category",
      difficulty: "Medium",
      tables: ["product_product"],
      prompt: "Return <code>category</code> and <code>name</code> of the most expensive product in each category, using a window function.",
      hint: "ROW_NUMBER in a CTE, then WHERE rn = 1.",
      solution: `WITH r AS (
  SELECT category, name, ROW_NUMBER() OVER (PARTITION BY category ORDER BY list_price DESC) AS rn
  FROM product_product
)
SELECT category, name FROM r WHERE rn = 1;`,
    },
    {
      slug: "running-revenue",
      kind: 'sql',
      mode: "query",
      title: "Running revenue",
      difficulty: "Hard",
      tables: ["sale_order", "sale_order_line"],
      ordered: true,
      prompt: "For confirmed orders (<code>sale</code>, <code>done</code>) sorted by <code>date_order</code>, return <code>name</code>, the order total (<code>qty × price_unit × (1 − discount/100)</code>, rounded to 2) and the running total of revenue so far (rounded to 2).",
      hint: "CTE of totals, then SUM(total) OVER (ORDER BY date_order).",
      solution: `WITH t AS (
  SELECT o.id, o.name, o.date_order, SUM(l.qty * l.price_unit * (1 - l.discount / 100.0)) AS total
  FROM sale_order o JOIN sale_order_line l ON l.order_id = o.id
  WHERE o.state IN ('sale', 'done')
  GROUP BY o.id
)
SELECT name, ROUND(total, 2), ROUND(SUM(total) OVER (ORDER BY date_order, id), 2)
FROM t ORDER BY date_order, id;`,
    },
  ],
};

export default windowModule;

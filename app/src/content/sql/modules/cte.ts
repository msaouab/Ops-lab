import type { Module, SqlExercise } from '../../types';

const cteModule: Module<SqlExercise> = {
  id: "cte",
  title: "CTEs & Recursion",
  tags: "WITH · WITH RECURSIVE",
  parents: ["sub", "set"],
  summary: "Name a subquery and read the query top to bottom. Recursive CTEs walk hierarchies like an org chart.",
  lesson: [
    {
      heading: "WITH",
      body: "A common table expression names a result you can use below it as if it were a table. It reads like a list of steps.",
      code: `WITH order_totals AS (
  SELECT order_id, SUM(qty * price_unit) AS total
  FROM sale_order_line
  GROUP BY order_id
)
SELECT o.name, t.total
FROM order_totals t
JOIN sale_order o ON o.id = t.order_id
ORDER BY t.total DESC;`,
    },
    {
      heading: "Several CTEs",
      body: "Separate them with commas. Each one can use the ones above it.",
      code: `WITH confirmed AS (
  SELECT * FROM sale_order WHERE state IN ('sale', 'done')
), per_rep AS (
  SELECT salesperson_id, COUNT(*) AS n FROM confirmed GROUP BY salesperson_id
)
SELECT e.name, p.n
FROM per_rep p JOIN hr_employee e ON e.id = p.salesperson_id;`,
    },
    {
      heading: "WITH RECURSIVE",
      body: "An anchor query produces the first rows; a recursive part joins back to the CTE to produce the next ones, until it returns nothing.",
      code: `WITH RECURSIVE n(x) AS (
  SELECT 1
  UNION ALL
  SELECT x * 2 FROM n WHERE x < 500
)
SELECT x FROM n;`,
    },
    {
      heading: "Walking a hierarchy",
      body: "Start at the CEO, then repeatedly add people whose manager is already in the result.",
      code: `WITH RECURSIVE chain(id, name, depth) AS (
  SELECT id, name, 0 FROM hr_employee WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, c.depth + 1
  FROM hr_employee e JOIN chain c ON e.manager_id = c.id
)
SELECT depth, name FROM chain ORDER BY depth, name;`,
      note: { label: 'PostgreSQL', body: "ERPs often store hierarchies such as product categories with a <code>parent_path</code> column so most lookups avoid recursion, but recursive CTEs are still a common interview question." },
    },
  ],
  exercises: [
    {
      slug: "count-to-ten",
      kind: 'sql',
      mode: "query",
      title: "Count to ten",
      difficulty: "Easy",
      tables: [],
      ordered: true,
      prompt: "Return the numbers 1 to 10 in one column, in order, using a recursive CTE.",
      hint: "Anchor SELECT 1, recursive part x + 1 WHERE x < 10.",
      solution: `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n WHERE x < 10)
SELECT x FROM n;`,
    },
    {
      slug: "large-orders",
      kind: 'sql',
      mode: "query",
      title: "Large orders",
      difficulty: "Medium",
      tables: ["sale_order", "sale_order_line"],
      prompt: "Using a CTE of order totals (<code>qty × price_unit × (1 − discount/100)</code>), return order <code>name</code> and total rounded to 2 for orders whose total exceeds 1000.",
      hint: "WITH totals AS (…GROUP BY order_id) then JOIN sale_order.",
      solution: `WITH totals AS (
  SELECT order_id, SUM(qty * price_unit * (1 - discount / 100.0)) AS total
  FROM sale_order_line GROUP BY order_id
)
SELECT o.name, ROUND(t.total, 2)
FROM totals t JOIN sale_order o ON o.id = t.order_id
WHERE t.total > 1000;`,
    },
    {
      slug: "payroll-share",
      kind: 'sql',
      mode: "query",
      title: "Payroll share",
      difficulty: "Medium",
      tables: ["hr_employee", "hr_department"],
      prompt: "For each department with staff, return its <code>name</code>, total salary, and that total as a percentage of the whole company payroll rounded to 1 decimal. Count employees without a department in the company total.",
      hint: "One CTE per department, one for the grand total.",
      solution: `WITH dept AS (
  SELECT department_id, SUM(salary) AS payroll FROM hr_employee GROUP BY department_id
), total AS (SELECT SUM(salary) AS s FROM hr_employee)
SELECT d.name, dept.payroll, ROUND(100.0 * dept.payroll / total.s, 1)
FROM dept JOIN hr_department d ON d.id = dept.department_id, total;`,
    },
    {
      slug: "saras-whole-team",
      kind: 'sql',
      mode: "query",
      title: "Sara's whole team",
      difficulty: "Hard",
      tables: ["hr_employee"],
      ordered: true,
      prompt: "Return <code>name</code> and <code>level</code> of everyone who reports to Sara Alami (id 2), directly (level 1) or indirectly (level 2, 3…). Sort by level, then name.",
      hint: "Anchor: employees with manager_id = 2 at level 1.",
      solution: `WITH RECURSIVE team(id, name, level) AS (
  SELECT id, name, 1 FROM hr_employee WHERE manager_id = 2
  UNION ALL
  SELECT e.id, e.name, t.level + 1 FROM hr_employee e JOIN team t ON e.manager_id = t.id
)
SELECT name, level FROM team ORDER BY level, name;`,
    },
  ],
};

export default cteModule;

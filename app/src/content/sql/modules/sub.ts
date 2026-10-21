import type { Module, SqlExercise } from '../../types';

const subModule: Module<SqlExercise> = {
  id: "sub",
  title: "Subqueries",
  tags: "IN (…) · EXISTS · correlated",
  parents: ["agg", "join"],
  summary: "A query inside a query. Use one result to filter, compare against, or build another.",
  lesson: [
    {
      heading: "Scalar subquery",
      body: "A subquery that returns one value can stand anywhere a value can.",
      code: `SELECT name, salary
FROM hr_employee
WHERE salary > (SELECT AVG(salary) FROM hr_employee);`,
    },
    {
      heading: "IN with a subquery",
      body: "Test membership in a list produced by another query.",
      code: `SELECT name FROM res_partner
WHERE id IN (SELECT partner_id FROM sale_order WHERE state = 'done');`,
      note: { label: 'PostgreSQL', body: "<code>NOT IN (subquery)</code> returns nothing if the subquery contains a single NULL. Prefer <code>NOT EXISTS</code> for “has no match”." },
    },
    {
      heading: "EXISTS and NOT EXISTS",
      body: "True if the subquery returns at least one row. The selected columns do not matter, so people write <code>SELECT 1</code>.",
      code: `SELECT d.name FROM hr_department d
WHERE NOT EXISTS (SELECT 1 FROM hr_employee e WHERE e.department_id = d.id);`,
    },
    {
      heading: "Correlated subquery",
      body: "The inner query refers to the outer row, so it runs once per outer row.",
      code: `SELECT e.name, e.department_id, e.salary
FROM hr_employee e
WHERE e.salary > (SELECT AVG(salary) FROM hr_employee x
                  WHERE x.department_id = e.department_id);`,
    },
    {
      heading: "Subquery in FROM",
      body: "A subquery in <code>FROM</code> acts as a temporary table (a derived table). Give it an alias.",
      code: `SELECT ROUND(AVG(lines), 2) AS avg_lines_per_order
FROM (SELECT order_id, COUNT(*) AS lines
      FROM sale_order_line GROUP BY order_id) t;`,
    },
  ],
  exercises: [
    {
      slug: "above-average",
      kind: 'sql',
      mode: "query",
      title: "Above average",
      difficulty: "Easy",
      tables: ["hr_employee"],
      prompt: "Return <code>name</code> and <code>salary</code> of employees who earn more than the company average.",
      hint: "Compare with (SELECT AVG(salary) …).",
      solution: "SELECT name, salary FROM hr_employee WHERE salary > (SELECT AVG(salary) FROM hr_employee);",
    },
    {
      slug: "partners-who-ordered",
      kind: 'sql',
      mode: "query",
      title: "Partners who ordered",
      difficulty: "Easy",
      tables: ["res_partner", "sale_order"],
      prompt: "Return the <code>name</code> of partners with at least one order, in any state. Each partner once.",
      hint: "WHERE id IN (SELECT partner_id …) or EXISTS.",
      solution: "SELECT name FROM res_partner WHERE id IN (SELECT partner_id FROM sale_order);",
    },
    {
      slug: "top-earner-per-department",
      kind: 'sql',
      mode: "query",
      title: "Top earner per department",
      difficulty: "Medium",
      tables: ["hr_employee"],
      prompt: "Return <code>name</code>, <code>department_id</code> and <code>salary</code> of the highest-paid employee in each department. Ignore employees without a department.",
      hint: "Correlated: salary = (SELECT MAX(salary) … WHERE same department).",
      solution: `SELECT name, department_id, salary
FROM hr_employee e
WHERE salary = (SELECT MAX(salary) FROM hr_employee x WHERE x.department_id = e.department_id);`,
    },
    {
      slug: "average-order-size",
      kind: 'sql',
      mode: "query",
      title: "Average order size",
      difficulty: "Medium",
      tables: ["sale_order_line"],
      prompt: "Return one number: the average count of lines per order, rounded to 2 decimals.",
      hint: "Count lines per order in a subquery in FROM, then average.",
      solution: `SELECT ROUND(AVG(n), 2)
FROM (SELECT order_id, COUNT(*) AS n FROM sale_order_line GROUP BY order_id);`,
    },
  ],
};

export default subModule;

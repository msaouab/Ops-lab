import type { Module, SqlExercise } from '../../types';

const aggModule: Module<SqlExercise> = {
  id: "agg",
  title: "Aggregation",
  tags: "COUNT · SUM · AVG · GROUP BY · HAVING",
  parents: ["expr"],
  summary: "Collapse many rows into one number, or one number per group. This is where reporting starts.",
  lesson: [
    {
      heading: "Aggregate functions",
      body: "<code>COUNT</code>, <code>SUM</code>, <code>AVG</code>, <code>MIN</code>, <code>MAX</code> turn a whole set of rows into a single row.",
      code: `SELECT COUNT(*) AS people, SUM(salary) AS payroll,
       ROUND(AVG(salary), 2) AS avg_salary,
       MIN(salary) AS lowest, MAX(salary) AS highest
FROM hr_employee;`,
    },
    {
      heading: "Three kinds of COUNT",
      body: "<code>COUNT(*)</code> counts rows. <code>COUNT(col)</code> skips NULLs in that column. <code>COUNT(DISTINCT col)</code> counts different values.",
      code: `SELECT COUNT(*), COUNT(email), COUNT(DISTINCT job_title)
FROM hr_employee;`,
    },
    {
      heading: "GROUP BY",
      body: "<code>GROUP BY</code> splits the rows into groups and runs the aggregate once per group. Every column in <code>SELECT</code> must be either grouped or aggregated.",
      code: `SELECT state, COUNT(*) AS orders
FROM sale_order
GROUP BY state;`,
      note: { label: 'PostgreSQL', body: "PostgreSQL rejects a selected column that is neither grouped nor aggregated. SQLite allows it and picks an arbitrary row, so do not rely on that habit." },
    },
    {
      heading: "HAVING filters groups",
      body: "<code>WHERE</code> filters rows before grouping; <code>HAVING</code> filters groups after. Full order: <code>FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT</code>.",
      code: `SELECT department_id, ROUND(AVG(salary)) AS avg_salary
FROM hr_employee
WHERE job_title <> 'Intern'
GROUP BY department_id
HAVING AVG(salary) > 6000;`,
    },
  ],
  exercises: [
    {
      slug: "headcount",
      kind: 'sql',
      mode: "query",
      title: "Headcount",
      difficulty: "Easy",
      tables: ["hr_employee"],
      prompt: "Return a single number: how many employees there are.",
      hint: "COUNT(*)",
      solution: "SELECT COUNT(*) FROM hr_employee;",
    },
    {
      slug: "staff-per-department",
      kind: 'sql',
      mode: "query",
      title: "Staff per department",
      difficulty: "Easy",
      tables: ["hr_employee"],
      prompt: "Return <code>department_id</code> and the number of employees for each value (employees without a department form their own group).",
      hint: "GROUP BY department_id",
      solution: "SELECT department_id, COUNT(*) FROM hr_employee GROUP BY department_id;",
    },
    {
      slug: "average-salary-by-role",
      kind: 'sql',
      mode: "query",
      title: "Average salary by role",
      difficulty: "Easy",
      tables: ["hr_employee"],
      prompt: "Return each <code>job_title</code> and its average salary rounded to 2 decimals.",
      hint: "ROUND(AVG(salary), 2)",
      solution: "SELECT job_title, ROUND(AVG(salary), 2) FROM hr_employee GROUP BY job_title;",
    },
    {
      slug: "crowded-categories",
      kind: 'sql',
      mode: "query",
      title: "Crowded categories",
      difficulty: "Medium",
      tables: ["product_product"],
      prompt: "Return <code>category</code> and product count for categories with more than 3 products.",
      hint: "Filtering on an aggregate needs HAVING.",
      solution: "SELECT category, COUNT(*) FROM product_product GROUP BY category HAVING COUNT(*) > 3;",
    },
    {
      slug: "customer-reach",
      kind: 'sql',
      mode: "query",
      title: "Customer reach",
      difficulty: "Medium",
      tables: ["sale_order"],
      prompt: "How many different partners have at least one order in state <code>sale</code> or <code>done</code>? Return one number.",
      hint: "COUNT(DISTINCT …) after a WHERE.",
      solution: "SELECT COUNT(DISTINCT partner_id) FROM sale_order WHERE state IN ('sale', 'done');",
    },
    {
      slug: "sales-by-month",
      kind: 'sql',
      mode: "query",
      title: "Sales by month",
      difficulty: "Hard",
      tables: ["sale_order"],
      ordered: true,
      prompt: "For confirmed orders (<code>sale</code> or <code>done</code>), return the month as <code>YYYY-MM</code> and the number of orders that month, in chronological order.",
      hint: "strftime('%Y-%m', date_order), then group by it.",
      solution: `SELECT strftime('%Y-%m', date_order) AS month, COUNT(*) AS orders
FROM sale_order
WHERE state IN ('sale', 'done')
GROUP BY month
ORDER BY month;`,
    },
  ],
};

export default aggModule;

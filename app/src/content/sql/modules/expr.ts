import type { Module, SqlExercise } from '../../types';

const exprModule: Module<SqlExercise> = {
  id: "expr",
  title: "Expressions & Functions",
  tags: "CASE · COALESCE · ROUND · || · dates",
  parents: ["filter", "sort"],
  summary: "Transform values as you read them: arithmetic, string and date functions, conditional logic, and NULL handling.",
  lesson: [
    {
      heading: "Arithmetic and integer division",
      body: "Dividing two integers gives an integer in SQLite and PostgreSQL. Make one side a decimal to keep the fraction.",
      code: "SELECT 7 / 2 AS int_div, 7 / 2.0 AS real_div, 7 % 2 AS remainder;",
    },
    {
      heading: "Text functions",
      body: "<code>UPPER</code>, <code>LOWER</code>, <code>LENGTH</code>, <code>SUBSTR(s, start, len)</code>, <code>TRIM</code>, <code>REPLACE</code>. <code>||</code> concatenates.",
      code: `SELECT UPPER(name) AS loud,
       LENGTH(name) AS chars,
       SUBSTR(name, 1, 3) AS short,
       name || ' (' || city || ')' AS label
FROM res_partner;`,
    },
    {
      heading: "Numbers",
      body: "<code>ROUND(x, digits)</code>, <code>ABS</code>, and <code>CAST(x AS type)</code> to convert.",
      code: `SELECT name, ROUND(cost * 100.0 / list_price, 1) AS cost_pct
FROM product_product;`,
    },
    {
      heading: "CASE",
      body: "SQL's if/else. The first matching <code>WHEN</code> wins; <code>ELSE</code> covers the rest (NULL if you leave it out).",
      code: `SELECT name, salary,
  CASE WHEN salary >= 9000 THEN 'senior'
       WHEN salary >= 5000 THEN 'mid'
       ELSE 'junior' END AS band
FROM hr_employee;`,
    },
    {
      heading: "COALESCE and NULLIF",
      body: "<code>COALESCE(a, b, …)</code> returns the first non-NULL argument. <code>NULLIF(a, b)</code> returns NULL when a = b, handy to avoid dividing by zero.",
      code: `SELECT name, COALESCE(email, 'n/a') AS email FROM hr_employee;

SELECT 10 / NULLIF(0, 0) AS safe_division;`,
    },
    {
      heading: "Dates",
      body: "SQLite stores dates as ISO text. <code>date('now')</code>, <code>strftime('%Y', d)</code> extracts parts, <code>julianday(a) - julianday(b)</code> gives days between.",
      code: `SELECT name, hire_date,
       strftime('%Y', hire_date) AS year,
       CAST(julianday('2026-10-13') - julianday(hire_date) AS INTEGER) AS days_employed
FROM hr_employee;`,
      note: { label: 'PostgreSQL', body: "PostgreSQL has a real <code>DATE</code> type: <code>EXTRACT(YEAR FROM hire_date)</code>, <code>CURRENT_DATE - hire_date</code> (days), <code>hire_date + INTERVAL '1 month'</code>, <code>DATE_TRUNC('month', d)</code>." },
    },
  ],
  exercises: [
    {
      slug: "shout-the-departments",
      kind: 'sql',
      mode: "query",
      title: "Shout the departments",
      difficulty: "Easy",
      tables: ["hr_department"],
      checkColumns: true,
      prompt: "Return each department name in capitals, in a column named <code>name_upper</code>.",
      hint: "UPPER(…) AS name_upper",
      solution: "SELECT UPPER(name) AS name_upper FROM hr_department;",
    },
    {
      slug: "hire-year",
      kind: 'sql',
      mode: "query",
      title: "Hire year",
      difficulty: "Easy",
      tables: ["hr_employee"],
      prompt: "Return each employee's <code>name</code> and the year they were hired.",
      hint: "strftime('%Y', hire_date)",
      solution: "SELECT name, strftime('%Y', hire_date) AS hire_year FROM hr_employee;",
    },
    {
      slug: "contact-fallback",
      kind: 'sql',
      mode: "query",
      title: "Contact fallback",
      difficulty: "Easy",
      tables: ["res_partner"],
      checkColumns: true,
      prompt: "Return <code>name</code> and a column <code>contact</code> that holds the partner's email, or the text <code>no email</code> when it is missing.",
      hint: "COALESCE picks the first non-NULL value.",
      solution: "SELECT name, COALESCE(email, 'no email') AS contact FROM res_partner;",
    },
    {
      slug: "price-bands",
      kind: 'sql',
      mode: "query",
      title: "Price bands",
      difficulty: "Medium",
      tables: ["product_product"],
      prompt: "Return each product's <code>name</code> and a band: <code>budget</code> under 100, <code>standard</code> from 100 up to (not including) 500, <code>premium</code> otherwise.",
      hint: "CASE checks WHEN branches top to bottom.",
      solution: `SELECT name,
  CASE WHEN list_price < 100 THEN 'budget'
       WHEN list_price < 500 THEN 'standard'
       ELSE 'premium' END AS band
FROM product_product;`,
    },
    {
      slug: "line-totals",
      kind: 'sql',
      mode: "query",
      title: "Line totals",
      difficulty: "Medium",
      tables: ["sale_order_line"],
      prompt: "For each order line return <code>id</code> and its total: <code>qty × price_unit</code> reduced by <code>discount</code> percent, rounded to 2 decimals.",
      hint: "discount is an integer, so divide by 100.0, not 100.",
      solution: `SELECT id, ROUND(qty * price_unit * (1 - discount / 100.0), 2) AS total
FROM sale_order_line;`,
    },
  ],
};

export default exprModule;

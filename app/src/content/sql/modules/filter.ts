import type { Module, SqlExercise } from '../../types';

const filterModule: Module<SqlExercise> = {
  id: "filter",
  title: "Filtering Rows",
  tags: "WHERE · AND/OR · IN · LIKE · IS NULL",
  parents: ["select"],
  summary: "WHERE keeps only the rows that match a condition. Combine conditions, match patterns, and handle missing values.",
  lesson: [
    {
      heading: "WHERE",
      body: "<code>WHERE</code> runs a test on each row and keeps the rows where it is true. Text values go in single quotes.",
      code: `SELECT name, salary
FROM hr_employee
WHERE salary > 6000;`,
    },
    {
      heading: "Comparison operators",
      body: "<code>=</code>, <code>&lt;&gt;</code> (or <code>!=</code>), <code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>. They work on numbers, text and ISO dates such as <code>'2026-03-01'</code>.",
      code: `SELECT name, date_order
FROM sale_order
WHERE date_order >= '2026-04-01';`,
    },
    {
      heading: "AND, OR, NOT",
      body: "<code>AND</code> binds tighter than <code>OR</code>, so use parentheses whenever you mix them. Without them, the query below would mean something different.",
      code: `SELECT name, city
FROM res_partner
WHERE country = 'Morocco'
  AND (city = 'Rabat' OR city = 'Fes');`,
    },
    {
      heading: "IN and BETWEEN",
      body: "<code>IN (…)</code> is a short way to write several <code>OR</code>s. <code>BETWEEN a AND b</code> includes both ends.",
      code: `SELECT name, state FROM sale_order WHERE state IN ('sale', 'done');

SELECT name, list_price FROM product_product WHERE list_price BETWEEN 50 AND 200;`,
    },
    {
      heading: "Pattern matching with LIKE",
      body: "<code>%</code> matches any run of characters (including none), <code>_</code> matches exactly one.",
      code: `SELECT name, email
FROM res_partner
WHERE email LIKE '%.ma';`,
      note: { label: 'PostgreSQL', body: "<code>LIKE</code> is case-sensitive in PostgreSQL. Use <code>ILIKE</code> for a case-insensitive match. SQLite's <code>LIKE</code> ignores case for ASCII letters." },
    },
    {
      heading: "NULL means unknown",
      body: "<code>NULL</code> is not a value, so <code>email = NULL</code> is never true. Test for it with <code>IS NULL</code> or <code>IS NOT NULL</code>.",
      code: "SELECT name FROM hr_employee WHERE email IS NULL;",
    },
  ],
  exercises: [
    {
      slug: "big-earners",
      kind: 'sql',
      mode: "query",
      title: "Big earners",
      difficulty: "Easy",
      tables: ["hr_employee"],
      prompt: "Return the <code>name</code> and <code>salary</code> of employees who earn more than 6000.",
      hint: "WHERE salary > …",
      solution: "SELECT name, salary FROM hr_employee WHERE salary > 6000;",
    },
    {
      slug: "confirmed-orders",
      kind: 'sql',
      mode: "query",
      title: "Confirmed orders",
      difficulty: "Easy",
      tables: ["sale_order"],
      prompt: "Return the <code>name</code> of every order whose <code>state</code> is <code>'sale'</code> or <code>'done'</code>.",
      hint: "IN (…) keeps it short.",
      solution: "SELECT name FROM sale_order WHERE state IN ('sale', 'done');",
    },
    {
      slug: "moroccan-companies",
      kind: 'sql',
      mode: "query",
      title: "Moroccan companies",
      difficulty: "Easy",
      tables: ["res_partner"],
      prompt: "Return <code>name</code> and <code>city</code> of partners that are companies (<code>is_company = 1</code>) located in Morocco.",
      hint: "Two conditions joined with AND.",
      solution: "SELECT name, city FROM res_partner WHERE country = 'Morocco' AND is_company = 1;",
    },
    {
      slug: "missing-emails",
      kind: 'sql',
      mode: "query",
      title: "Missing emails",
      difficulty: "Easy",
      tables: ["hr_employee"],
      prompt: "Return the <code>name</code> of employees with no email address.",
      hint: "= NULL never matches anything.",
      solution: "SELECT name FROM hr_employee WHERE email IS NULL;",
    },
    {
      slug: "gmail-contacts",
      kind: 'sql',
      mode: "query",
      title: "Gmail contacts",
      difficulty: "Easy",
      tables: ["res_partner"],
      prompt: "Return <code>name</code> and <code>email</code> of partners whose email ends with <code>@gmail.com</code>.",
      hint: "LIKE '%…'",
      solution: "SELECT name, email FROM res_partner WHERE email LIKE '%@gmail.com';",
    },
    {
      slug: "mid-range-furnishing",
      kind: 'sql',
      mode: "query",
      title: "Mid-range furnishing",
      difficulty: "Medium",
      tables: ["product_product"],
      prompt: "Return <code>name</code> and <code>list_price</code> of products in the <code>Furniture</code> or <code>Office</code> category priced between 100 and 500 (inclusive).",
      hint: "Mixing OR with AND needs parentheses, or use IN for the categories.",
      solution: `SELECT name, list_price
FROM product_product
WHERE category IN ('Furniture', 'Office')
  AND list_price BETWEEN 100 AND 500;`,
    },
  ],
};

export default filterModule;

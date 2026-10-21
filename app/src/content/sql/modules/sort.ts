import type { Module, SqlExercise } from '../../types';

const sortModule: Module<SqlExercise> = {
  id: "sort",
  title: "Sorting & Limiting",
  tags: "ORDER BY · LIMIT · OFFSET · DISTINCT",
  parents: ["select"],
  summary: "Tables have no built-in order. ORDER BY gives you one, LIMIT trims the result, DISTINCT removes duplicates.",
  lesson: [
    {
      heading: "ORDER BY",
      body: "Sort by one or more columns. <code>ASC</code> is the default; <code>DESC</code> reverses. Later columns break ties in earlier ones.",
      code: `SELECT name, department_id, salary
FROM hr_employee
ORDER BY department_id, salary DESC;`,
    },
    {
      heading: "LIMIT and OFFSET",
      body: "<code>LIMIT n</code> returns at most n rows. <code>OFFSET k</code> skips the first k. Together they paginate. Always pair them with <code>ORDER BY</code>, or which rows you get is not defined.",
      code: `SELECT name, list_price
FROM product_product
ORDER BY list_price DESC
LIMIT 3 OFFSET 0;`,
    },
    {
      heading: "DISTINCT",
      body: "<code>DISTINCT</code> removes duplicate rows from the result. It applies to the whole row, not just the first column.",
      code: `SELECT DISTINCT country FROM res_partner;

SELECT DISTINCT country, is_company FROM res_partner ORDER BY country;`,
    },
    {
      heading: "The order a query runs in",
      body: "You write <code>SELECT … FROM … WHERE … ORDER BY … LIMIT</code>, but the database evaluates <code>FROM → WHERE → SELECT → DISTINCT → ORDER BY → LIMIT</code>. That is why <code>ORDER BY</code> can use an alias defined in <code>SELECT</code>, but <code>WHERE</code> cannot.",
      code: `SELECT name, list_price - cost AS margin
FROM product_product
ORDER BY margin DESC;`,
      note: { label: 'PostgreSQL', body: "PostgreSQL puts NULLs last in ascending order; SQLite puts them first. Write <code>NULLS FIRST</code> or <code>NULLS LAST</code> when it matters." },
    },
  ],
  exercises: [
    {
      slug: "salary-ranking",
      kind: 'sql',
      mode: "query",
      title: "Salary ranking",
      difficulty: "Easy",
      tables: ["hr_employee"],
      ordered: true,
      prompt: "Return <code>name</code> and <code>salary</code> of all employees, highest salary first. Break ties by <code>name</code> alphabetically.",
      hint: "ORDER BY salary DESC, name",
      solution: "SELECT name, salary FROM hr_employee ORDER BY salary DESC, name;",
    },
    {
      slug: "three-priciest-products",
      kind: 'sql',
      mode: "query",
      title: "Three priciest products",
      difficulty: "Easy",
      tables: ["product_product"],
      ordered: true,
      prompt: "Return <code>name</code> and <code>list_price</code> of the 3 most expensive products, most expensive first.",
      hint: "Sort, then LIMIT.",
      solution: "SELECT name, list_price FROM product_product ORDER BY list_price DESC LIMIT 3;",
    },
    {
      slug: "customer-cities",
      kind: 'sql',
      mode: "query",
      title: "Customer cities",
      difficulty: "Easy",
      tables: ["res_partner"],
      ordered: true,
      prompt: "Return each distinct <code>city</code> in <code>res_partner</code> once, in alphabetical order.",
      hint: "DISTINCT plus ORDER BY.",
      solution: "SELECT DISTINCT city FROM res_partner ORDER BY city;",
    },
    {
      slug: "page-two",
      kind: 'sql',
      mode: "query",
      title: "Page two",
      difficulty: "Medium",
      tables: ["sale_order"],
      ordered: true,
      prompt: "Orders are listed 5 per page, sorted by <code>date_order</code> then <code>id</code>. Return <code>name</code> and <code>date_order</code> for page 2.",
      hint: "Page 2 skips the first 5 rows.",
      solution: "SELECT name, date_order FROM sale_order ORDER BY date_order, id LIMIT 5 OFFSET 5;",
    },
  ],
};

export default sortModule;

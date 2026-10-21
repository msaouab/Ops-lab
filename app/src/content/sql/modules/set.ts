import type { Module, SqlExercise } from '../../types';

const setModule: Module<SqlExercise> = {
  id: "set",
  title: "Set Operations",
  tags: "UNION · INTERSECT · EXCEPT",
  parents: ["join"],
  summary: "Stack the results of two queries, or keep what they share, or what one has that the other lacks.",
  lesson: [
    {
      heading: "UNION and UNION ALL",
      body: "Stacks two results. <code>UNION</code> removes duplicates; <code>UNION ALL</code> keeps them and is faster. Both sides need the same number of columns with compatible types.",
      code: `SELECT city FROM res_partner WHERE country = 'Morocco'
UNION
SELECT 'Rabat';

SELECT 'employee' AS kind, name FROM hr_employee
UNION ALL
SELECT 'partner', name FROM res_partner;`,
    },
    {
      heading: "INTERSECT",
      body: "Rows that appear in both results.",
      code: `SELECT product_id FROM sale_order_line WHERE order_id = 1
INTERSECT
SELECT product_id FROM sale_order_line WHERE order_id = 8;`,
    },
    {
      heading: "EXCEPT",
      body: "Rows in the first result that are not in the second.",
      code: `SELECT id FROM product_product
EXCEPT
SELECT product_id FROM sale_order_line;`,
      note: { label: 'PostgreSQL', body: "An <code>ORDER BY</code> at the very end sorts the combined result. Oracle calls <code>EXCEPT</code> <code>MINUS</code>." },
    },
  ],
  exercises: [
    {
      slug: "one-address-book",
      kind: 'sql',
      mode: "query",
      title: "One address book",
      difficulty: "Easy",
      tables: ["hr_employee", "res_partner"],
      prompt: "Return every distinct, non-NULL email from employees and partners in a single column.",
      hint: "UNION removes duplicates; filter NULLs on both sides.",
      solution: `SELECT email FROM hr_employee WHERE email IS NOT NULL
UNION
SELECT email FROM res_partner WHERE email IS NOT NULL;`,
    },
    {
      slug: "sold-and-pricey",
      kind: 'sql',
      mode: "query",
      title: "Sold and pricey",
      difficulty: "Medium",
      tables: ["sale_order_line", "product_product"],
      prompt: "Return the product ids that have been sold at least once and have a <code>list_price</code> above 300.",
      hint: "INTERSECT two id lists.",
      solution: `SELECT product_id FROM sale_order_line
INTERSECT
SELECT id FROM product_product WHERE list_price > 300;`,
    },
    {
      slug: "idle-sales-staff",
      kind: 'sql',
      mode: "query",
      title: "Idle sales staff",
      difficulty: "Medium",
      tables: ["hr_employee", "sale_order"],
      prompt: "Return the ids of employees in department 2 (Sales) who are not the salesperson on any order.",
      hint: "Sales staff ids EXCEPT salesperson ids.",
      solution: `SELECT id FROM hr_employee WHERE department_id = 2
EXCEPT
SELECT salesperson_id FROM sale_order;`,
    },
  ],
};

export default setModule;

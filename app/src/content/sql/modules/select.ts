import type { Module, SqlExercise } from '../../types';

const selectModule: Module<SqlExercise> = {
  id: "select",
  title: "SELECT Basics",
  tags: "SELECT · FROM · AS",
  parents: [],
  summary: "Every query starts here. Pick a table, pick the columns, and give them readable names.",
  lesson: [
    {
      heading: "Reading a table",
      body: "A query asks the database for rows. <code>SELECT</code> lists the columns you want and <code>FROM</code> names the table. <code>*</code> means every column.",
      code: "SELECT * FROM hr_department;",
    },
    {
      heading: "Choosing columns",
      body: "List columns separated by commas. They come back in the order you write them, which does not have to match the table.",
      code: `SELECT name, job_title, salary
FROM hr_employee;`,
    },
    {
      heading: "Aliases and computed columns",
      body: "<code>AS</code> renames an output column. A column can also be an expression computed from other columns of the same row.",
      code: `SELECT name AS product,
       list_price - cost AS margin
FROM product_product;`,
    },
    {
      heading: "Statements and comments",
      body: "End each statement with <code>;</code>. <code>--</code> starts a comment that runs to the end of the line. Keywords are case-insensitive; writing them in capitals is a convention that makes queries easier to scan.",
      code: `-- every partner and where they are
select name, city, country from res_partner;`,
    },
  ],
  exercises: [
    {
      slug: "all-departments",
      kind: 'sql',
      mode: "query",
      title: "All departments",
      difficulty: "Easy",
      tables: ["hr_department"],
      prompt: "Return every column of every row in <code>hr_department</code>.",
      hint: "The star selects all columns.",
      solution: "SELECT * FROM hr_department;",
    },
    {
      slug: "product-price-list",
      kind: 'sql',
      mode: "query",
      title: "Product price list",
      difficulty: "Easy",
      tables: ["product_product"],
      prompt: "Return the <code>name</code> and <code>list_price</code> of every product.",
      hint: "Two columns, separated by a comma.",
      solution: "SELECT name, list_price FROM product_product;",
    },
    {
      slug: "rename-the-columns",
      kind: 'sql',
      mode: "query",
      title: "Rename the columns",
      difficulty: "Easy",
      tables: ["hr_employee"],
      checkColumns: true,
      prompt: "Return each employee's <code>name</code> as a column called <code>employee</code> and their <code>job_title</code> as <code>role</code>. Column names are checked.",
      hint: "column AS new_name",
      solution: "SELECT name AS employee, job_title AS role FROM hr_employee;",
    },
    {
      slug: "margin-per-product",
      kind: 'sql',
      mode: "query",
      title: "Margin per product",
      difficulty: "Medium",
      tables: ["product_product"],
      checkColumns: true,
      prompt: "For every product return its <code>name</code> and a column <code>margin</code> equal to <code>list_price - cost</code>, plus a column <code>margin_x10</code> that is the margin for 10 units.",
      hint: "You can repeat the expression and multiply it: (list_price - cost) * 10.",
      solution: `SELECT name, list_price - cost AS margin, (list_price - cost) * 10 AS margin_x10
FROM product_product;`,
    },
  ],
};

export default selectModule;

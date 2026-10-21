import type { Module, SqlExercise } from '../../types';

const ddlModule: Module<SqlExercise> = {
  id: "ddl",
  title: "Defining Tables",
  tags: "CREATE · ALTER · DROP · INDEX · VIEW",
  parents: ["window"],
  summary: "Design the structure that holds the data: tables, constraints, indexes and views.",
  lesson: [
    {
      heading: "CREATE TABLE",
      body: "Each column has a name, a type and optional constraints.",
      code: `CREATE TABLE project_task (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
  user_id INTEGER REFERENCES hr_employee(id),
  code TEXT UNIQUE
);
INSERT INTO project_task (id, name, user_id) VALUES (1, 'Install the ERP', 5);
SELECT * FROM project_task;`,
    },
    {
      heading: "Constraints",
      body: "They protect your data from bad writes.",
      list: ["<code>PRIMARY KEY</code>: unique, non-NULL row identifier", "<code>NOT NULL</code>: a value is required", "<code>UNIQUE</code>: no two rows share the value", "<code>DEFAULT</code>: value used when the insert leaves it out", "<code>CHECK (…)</code>: any boolean rule", "<code>REFERENCES t(col)</code>: a foreign key to another table"],
      code: `CREATE TABLE t (id INTEGER PRIMARY KEY, qty INTEGER CHECK (qty > 0));
INSERT INTO t VALUES (1, -5); -- fails: CHECK constraint`,
    },
    {
      heading: "ALTER TABLE",
      body: "Change an existing table: add a column, rename a column, rename the table.",
      code: `ALTER TABLE res_partner ADD COLUMN vat TEXT;
ALTER TABLE res_partner RENAME COLUMN city TO town;
SELECT id, name, town, vat FROM res_partner LIMIT 3;`,
    },
    {
      heading: "DROP",
      body: "<code>DROP TABLE</code> deletes the table and all its rows. <code>IF EXISTS</code> avoids an error when it is absent.",
      code: `DROP TABLE IF EXISTS project_task;
SELECT name FROM sqlite_master WHERE type = 'table';`,
    },
    {
      heading: "Indexes",
      body: "An index makes lookups on its columns fast, at the cost of slower writes and some space. Index the columns you filter and join on.",
      code: `CREATE INDEX idx_line_product ON sale_order_line(product_id);
EXPLAIN QUERY PLAN SELECT * FROM sale_order_line WHERE product_id = 4;`,
    },
    {
      heading: "Views",
      body: "A view is a saved query you can select from like a table.",
      code: `CREATE VIEW employee_directory AS
  SELECT e.name, e.job_title, d.name AS department
  FROM hr_employee e LEFT JOIN hr_department d ON d.id = e.department_id;
SELECT * FROM employee_directory WHERE department = 'R&D';`,
      note: { label: 'PostgreSQL', body: "In PostgreSQL write <code>id SERIAL PRIMARY KEY</code> or <code>GENERATED ALWAYS AS IDENTITY</code>, and use real types such as <code>VARCHAR(n)</code>, <code>NUMERIC(12,2)</code>, <code>BOOLEAN</code>, <code>DATE</code>, <code>TIMESTAMP</code>. <code>ALTER TABLE … ALTER COLUMN … TYPE</code> changes a type. ORMs create and alter tables from your model fields, and reporting models are often SQL views." },
    },
  ],
  exercises: [
    {
      slug: "create-crm-lead",
      kind: 'sql',
      mode: "mutate",
      title: "Create crm_lead",
      difficulty: "Easy",
      tables: [],
      prompt: "Create table <code>crm_lead</code> with: <code>id</code> integer primary key, <code>name</code> text that is required, <code>partner_id</code> integer referencing <code>res_partner(id)</code>, <code>expected_revenue</code> real defaulting to 0, and <code>stage</code> text. Columns in that order.",
      check: "SELECT name, pk, \"notnull\" FROM pragma_table_info('crm_lead') ORDER BY cid;",
      hint: "NOT NULL on name, DEFAULT 0 on expected_revenue.",
      solution: `CREATE TABLE crm_lead (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  partner_id INTEGER REFERENCES res_partner(id),
  expected_revenue REAL DEFAULT 0,
  stage TEXT
);`,
    },
    {
      slug: "add-a-phone-column",
      kind: 'sql',
      mode: "mutate",
      title: "Add a phone column",
      difficulty: "Easy",
      tables: ["res_partner"],
      prompt: "Add a text column <code>phone</code> to <code>res_partner</code>, then set it to <code>+212 522 000 111</code> for Atlas Logistics (id 1).",
      check: "SELECT id, phone FROM res_partner ORDER BY id;",
      hint: "ALTER TABLE … ADD COLUMN, then UPDATE.",
      solution: `ALTER TABLE res_partner ADD COLUMN phone TEXT;
UPDATE res_partner SET phone = '+212 522 000 111' WHERE id = 1;`,
    },
    {
      slug: "confirmed-orders-view",
      kind: 'sql',
      mode: "mutate",
      title: "Confirmed orders view",
      difficulty: "Medium",
      tables: ["sale_order"],
      prompt: "Create a view <code>confirmed_order</code> that shows all columns of orders in state <code>sale</code> or <code>done</code>.",
      check: "SELECT id, name, state FROM confirmed_order ORDER BY id;",
      hint: "CREATE VIEW name AS SELECT …",
      solution: "CREATE VIEW confirmed_order AS SELECT * FROM sale_order WHERE state IN ('sale', 'done');",
    },
    {
      slug: "index-the-customer-lookup",
      kind: 'sql',
      mode: "mutate",
      title: "Index the customer lookup",
      difficulty: "Medium",
      tables: ["sale_order"],
      prompt: "Create an index named <code>idx_sale_order_partner</code> on <code>sale_order(partner_id)</code>.",
      check: "SELECT m.name, m.tbl_name, i.name AS col FROM sqlite_master m, pragma_index_info(m.name) i WHERE m.type = 'index' AND m.name = 'idx_sale_order_partner';",
      hint: "CREATE INDEX name ON table(column);",
      solution: "CREATE INDEX idx_sale_order_partner ON sale_order(partner_id);",
    },
  ],
};

export default ddlModule;

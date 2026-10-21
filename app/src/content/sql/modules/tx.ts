import type { Module, SqlExercise } from '../../types';

const txModule: Module<SqlExercise> = {
  id: "tx",
  title: "Transactions",
  tags: "BEGIN · COMMIT · ROLLBACK · SAVEPOINT",
  parents: ["dml", "ddl"],
  summary: "Group changes so they all happen or none do. The last command set, and one interviewers love to ask about.",
  lesson: [
    {
      heading: "All or nothing",
      body: "A transaction is a group of statements the database treats as one unit. ACID: <b>A</b>tomic (all or nothing), <b>C</b>onsistent (constraints hold), <b>I</b>solated (others do not see half-done work), <b>D</b>urable (committed data survives a crash).",
      code: `BEGIN;
UPDATE hr_department SET budget = budget - 5000 WHERE id = 1;
UPDATE hr_department SET budget = budget + 5000 WHERE id = 4;
COMMIT;

SELECT id, name, budget FROM hr_department;`,
    },
    {
      heading: "ROLLBACK",
      body: "Undo everything since <code>BEGIN</code>.",
      code: `BEGIN;
DELETE FROM sale_order_line;
SELECT COUNT(*) AS during FROM sale_order_line;
ROLLBACK;

SELECT COUNT(*) AS after FROM sale_order_line;`,
    },
    {
      heading: "SAVEPOINT",
      body: "A named checkpoint inside a transaction. <code>ROLLBACK TO name</code> undoes the work after it but keeps the transaction open.",
      code: `BEGIN;
UPDATE product_product SET list_price = list_price + 10;
SAVEPOINT before_delete;
DELETE FROM product_product WHERE category = 'Office';
ROLLBACK TO before_delete;
COMMIT;

SELECT name, list_price FROM product_product;`,
      note: { label: 'PostgreSQL', body: "PostgreSQL's default isolation level is READ COMMITTED; you can raise it with <code>SET TRANSACTION ISOLATION LEVEL REPEATABLE READ</code> or <code>SERIALIZABLE</code>. Web frameworks often run each request in one transaction and commit at the end; ORMs expose SAVEPOINT as a context manager." },
    },
  ],
  exercises: [
    {
      slug: "budget-transfer",
      kind: 'sql',
      mode: "mutate",
      title: "Budget transfer",
      difficulty: "Medium",
      tables: ["hr_department"],
      mustInclude: ["BEGIN", "COMMIT"],
      prompt: "Inside one transaction (<code>BEGIN</code> … <code>COMMIT</code>), move 20000 of budget from R&amp;D (id 3) to Legal (id 5).",
      check: "SELECT id, budget FROM hr_department ORDER BY id;",
      hint: "Two UPDATEs between BEGIN and COMMIT.",
      solution: `BEGIN;
UPDATE hr_department SET budget = budget - 20000 WHERE id = 3;
UPDATE hr_department SET budget = budget + 20000 WHERE id = 5;
COMMIT;`,
    },
    {
      slug: "undo-the-mistake",
      kind: 'sql',
      mode: "mutate",
      title: "Undo the mistake",
      difficulty: "Medium",
      tables: ["hr_employee"],
      mustInclude: ["BEGIN", "ROLLBACK"],
      prompt: "Start a transaction, run <code>UPDATE hr_employee SET salary = 0;</code>, then roll it back so every salary is unchanged.",
      check: "SELECT id, salary FROM hr_employee ORDER BY id;",
      hint: "BEGIN; … ROLLBACK;",
      solution: `BEGIN;
UPDATE hr_employee SET salary = 0;
ROLLBACK;`,
    },
    {
      slug: "keep-half-the-work",
      kind: 'sql',
      mode: "mutate",
      title: "Keep half the work",
      difficulty: "Hard",
      tables: ["product_product"],
      mustInclude: ["SAVEPOINT", "ROLLBACK TO"],
      prompt: "In one transaction: raise every product's <code>list_price</code> by 10%, set a savepoint, delete all Furniture products, roll back to the savepoint, then commit. The price rise stays; the products stay too.",
      check: "SELECT id, ROUND(list_price, 2) FROM product_product ORDER BY id;",
      hint: "BEGIN; UPDATE …; SAVEPOINT s; DELETE …; ROLLBACK TO s; COMMIT;",
      solution: `BEGIN;
UPDATE product_product SET list_price = list_price * 1.1;
SAVEPOINT s;
DELETE FROM product_product WHERE category = 'Furniture';
ROLLBACK TO s;
COMMIT;`,
    },
  ],
};

export default txModule;

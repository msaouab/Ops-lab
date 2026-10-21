import type { Database } from 'sql.js';
import type { SqlEngine } from './engine';

/**
 * The playground keeps one scratch database and its editor text for the whole
 * visit, so leaving and coming back does not lose work. "Edit in playground"
 * on a lesson example writes into `code` before navigating there.
 */
export const playground: { db: Database | null; code: string } = {
  db: null,
  code: `-- Try anything. Changes persist here until you reset the database.
SELECT o.name, p.name AS customer, o.state
FROM sale_order o
JOIN res_partner p ON p.id = o.partner_id
ORDER BY o.date_order;`,
};

export function playgroundDb(engine: SqlEngine): Database {
  playground.db ??= engine.fresh();
  return playground.db;
}

export function resetPlaygroundDb(engine: SqlEngine): Database {
  playground.db?.close();
  playground.db = engine.fresh();
  return playground.db;
}

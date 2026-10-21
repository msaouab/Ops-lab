import initSqlJs, { type Database, type QueryExecResult, type SqlJsStatic } from 'sql.js';

export type ResultSet = QueryExecResult;

export type RunResult =
  | { ok: true; sets: ResultSet[]; changed: number }
  | { ok: false; error: string };

export interface TableInfo {
  name: string;
  columns: { name: string; pk: boolean }[];
}

/** Runs any SQL text (several statements allowed) and never throws. */
export function runSql(db: Database, sql: string): RunResult {
  try {
    const sets = db.exec(sql);
    return { ok: true, sets, changed: db.getRowsModified() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** The result a learner "sees": the last result set the SQL produced. */
export function lastSet(r: RunResult | null | undefined): ResultSet | null {
  if (!r || !r.ok || r.sets.length === 0) return null;
  return r.sets[r.sets.length - 1] ?? null;
}

export function schemaInfo(db: Database): TableInfo[] {
  const names = lastSet(runSql(db,
    "SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY rowid",
  ))?.values.map(v => String(v[0])) ?? [];
  return names.map(name => {
    const cols = lastSet(runSql(db, `SELECT name, pk FROM pragma_table_info('${name.replace(/'/g, "''")}')`));
    return {
      name,
      columns: cols ? cols.values.map(v => ({ name: String(v[0]), pk: Number(v[1]) > 0 })) : [],
    };
  });
}

/**
 * One loaded SQLite engine plus a snapshot of the seeded course database.
 * Every lesson example and every graded attempt runs on a fresh copy, so
 * nothing a learner does can leak into the next run.
 */
export class SqlEngine {
  readonly schema: TableInfo[];
  private readonly sql: SqlJsStatic;
  private readonly seedBytes: Uint8Array;

  constructor(sql: SqlJsStatic, seed: string) {
    this.sql = sql;
    const db = new sql.Database();
    db.run(seed);
    this.seedBytes = db.export();
    this.schema = schemaInfo(db);
    db.close();
  }

  fresh(): Database {
    return new this.sql.Database(this.seedBytes);
  }

  /** Run on a throwaway copy of the seed database. */
  runFresh(sql: string): RunResult {
    const db = this.fresh();
    try {
      return runSql(db, sql);
    } finally {
      db.close();
    }
  }
}

/** Load sql.js once. In the browser pass `locateFile` for the wasm asset URL. */
export async function createSqlEngine(seed: string, locateFile?: (file: string) => string): Promise<SqlEngine> {
  const SQL = await initSqlJs(locateFile ? { locateFile } : undefined);
  return new SqlEngine(SQL, seed);
}

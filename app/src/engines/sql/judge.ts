import type { SqlExercise } from '../../content/types';
import { lastSet, runSql, type ResultSet, type RunResult, type SqlEngine } from './engine';

export interface Verdict {
  pass: boolean;
  title: string;
  msg: string;
  /** The SQL failed to run: there is no output to compare. */
  error?: boolean;
  mine?: ResultSet | null;
  want?: ResultSet | null;
  /** Index of the first differing row in `mine`, when the comparison is ordered. */
  badRow?: number;
}

/**
 * Normalize a cell for comparison: NULL as a token, numbers (and numeric
 * strings) rounded to 2 decimals, so 5720 and 5720.0000001 compare equal.
 */
export function normalizeCell(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' || (typeof v === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(v))) {
    return String(Math.round(Number(v) * 100) / 100);
  }
  return String(v);
}

/** What the exercise expects: the solution's output on a fresh database. */
export function reference(engine: SqlEngine, ex: SqlExercise): RunResult {
  if (ex.mode === 'mutate') {
    const db = engine.fresh();
    try {
      runSql(db, ex.solution);
      return runSql(db, ex.check ?? '');
    } finally {
      db.close();
    }
  }
  return engine.runFresh(ex.solution);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function judge(engine: SqlEngine, ex: SqlExercise, code: string): Verdict {
  if (!code.trim()) return { pass: false, title: 'Nothing to run', msg: 'Write a query first.' };

  const db = engine.fresh();
  let r: RunResult;
  try {
    r = runSql(db, code);
    if (!r.ok) return { pass: false, title: 'Error', msg: r.error, error: true };
    if (ex.mustInclude) {
      const up = code.toUpperCase().replace(/\s+/g, ' ');
      const missing = ex.mustInclude.filter(k => !up.includes(k));
      if (missing.length) {
        return { pass: false, title: 'Not quite', msg: `This exercise is about ${missing.join(' and ')}. Use it in your answer.` };
      }
    }
    if (ex.mode === 'mutate') {
      r = runSql(db, ex.check ?? '');
      if (!r.ok) return { pass: false, title: 'Check failed', msg: `The check query could not run on your database: ${r.error}` };
    }
  } finally {
    db.close();
  }

  const mine = lastSet(r);
  const want = lastSet(reference(engine, ex));
  const out = { mine, want };
  const wrong = (msg: string, extra: Partial<Verdict> = {}): Verdict => ({ ...out, pass: false, title: 'Wrong answer', msg, ...extra });

  if (!mine) {
    return wrong(ex.mode === 'mutate'
      ? 'The check query returned no rows. Did your statement create or change what was asked?'
      : 'Your SQL returned no result set. End with a SELECT.');
  }
  if (!want) return wrong('Expected no rows.');
  if (mine.columns.length !== want.columns.length) {
    return wrong(`Expected ${plural(want.columns.length, 'column')}, got ${mine.columns.length}.`);
  }
  if (ex.checkColumns) {
    const a = mine.columns.map(c => c.toLowerCase()).join('|');
    const b = want.columns.map(c => c.toLowerCase()).join('|');
    if (a !== b) return wrong(`Column names should be: ${want.columns.join(', ')}.`);
  }
  if (mine.values.length !== want.values.length) {
    return wrong(`Expected ${plural(want.values.length, 'row')}, got ${mine.values.length}.`);
  }

  let A = mine.values.map(row => row.map(normalizeCell).join('\u0001'));
  let B = want.values.map(row => row.map(normalizeCell).join('\u0001'));
  if (!ex.ordered) {
    A = [...A].sort();
    B = [...B].sort();
  }
  const bad = A.findIndex((x, i) => x !== B[i]);
  if (bad >= 0) {
    if (ex.ordered) {
      const sameSet = [...A].sort().join('\n') === [...B].sort().join('\n');
      if (sameSet) return { ...out, pass: false, title: 'Wrong order', msg: 'You have the right rows, in the wrong order.', badRow: bad };
      return wrong(`Row ${bad + 1} differs from the expected output.`, { badRow: bad });
    }
    return wrong('Some rows differ from the expected output.');
  }
  return { ...out, pass: true, title: 'Accepted', msg: 'Your output matches. Nice work.' };
}

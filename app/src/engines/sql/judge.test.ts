import { beforeAll, describe, expect, it } from 'vitest';
import type { SqlExercise } from '../../content/types';
import { createSqlEngine, type SqlEngine } from './engine';
import { judge, normalizeCell } from './judge';

const SEED = `
CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT, score REAL);
INSERT INTO t VALUES (1, 'a', 1.5), (2, 'b', NULL), (3, 'c', 3);
`;

let engine: SqlEngine;
beforeAll(async () => {
  engine = await createSqlEngine(SEED);
});

const ex = (over: Partial<SqlExercise>): SqlExercise => ({
  slug: 'x', kind: 'sql', mode: 'query', title: 'x', difficulty: 'Easy', tables: ['t'],
  prompt: '', hint: '', solution: 'SELECT id, name FROM t ORDER BY id;', ...over,
});

describe('normalizeCell', () => {
  it('rounds numbers and numeric strings to 2 decimals', () => {
    expect(normalizeCell(5720.0000001)).toBe('5720');
    expect(normalizeCell('3.14159')).toBe('3.14');
    expect(normalizeCell(null)).toBe('NULL');
    expect(normalizeCell('abc')).toBe('abc');
  });
});

describe('judge', () => {
  it('asks for code when the editor is empty', () => {
    expect(judge(engine, ex({}), '  \n').title).toBe('Nothing to run');
  });

  it('reports SQL errors without a comparison', () => {
    const v = judge(engine, ex({}), 'SELEC nope;');
    expect(v).toMatchObject({ pass: false, title: 'Error', error: true });
  });

  it('accepts any row order when the exercise is unordered', () => {
    expect(judge(engine, ex({}), 'SELECT id, name FROM t ORDER BY id DESC;').pass).toBe(true);
  });

  it('tells the right rows in the wrong order apart from wrong rows', () => {
    const ordered = ex({ ordered: true });
    expect(judge(engine, ordered, 'SELECT id, name FROM t ORDER BY id DESC;')).toMatchObject({ title: 'Wrong order', badRow: 0 });
    expect(judge(engine, ordered, "SELECT id, 'z' FROM t ORDER BY id;")).toMatchObject({ title: 'Wrong answer', badRow: 0 });
  });

  it('counts columns and rows before comparing values', () => {
    expect(judge(engine, ex({}), 'SELECT id FROM t;').msg).toBe('Expected 2 columns, got 1.');
    expect(judge(engine, ex({}), 'SELECT id, name FROM t WHERE id = 1;').msg).toBe('Expected 3 rows, got 1.');
  });

  it('checks column names only when asked', () => {
    const named = ex({ checkColumns: true, solution: 'SELECT id AS key, name FROM t;' });
    expect(judge(engine, named, 'SELECT id, name FROM t;').msg).toBe('Column names should be: key, name.');
    expect(judge(engine, named, 'SELECT id AS KEY, name FROM t;').pass).toBe(true);
    expect(judge(engine, ex({}), 'SELECT id AS whatever, name AS n FROM t;').pass).toBe(true);
  });

  it('requires the keywords an exercise is about', () => {
    const tx = ex({ mode: 'mutate', mustInclude: ['BEGIN', 'COMMIT'], solution: 'BEGIN; DELETE FROM t WHERE id = 3; COMMIT;', check: 'SELECT id FROM t;' });
    expect(judge(engine, tx, 'DELETE FROM t WHERE id = 3;').title).toBe('Not quite');
    expect(judge(engine, tx, 'begin;\ndelete from t where id = 3;\ncommit;').pass).toBe(true);
  });

  it('grades statements through the check query on a fresh database', () => {
    const del = ex({ mode: 'mutate', solution: 'DELETE FROM t WHERE score IS NULL;', check: 'SELECT id FROM t;' });
    expect(judge(engine, del, 'DELETE FROM t WHERE id = 2;').pass).toBe(true);
    expect(judge(engine, del, 'DELETE FROM t;').msg).toMatch(/check query returned no rows/);
    // a previous attempt must not leak into the next one
    expect(judge(engine, del, 'DELETE FROM t WHERE id = 2;').pass).toBe(true);
  });
});

import { beforeAll, describe, expect, it } from 'vitest';
import { createSqlEngine, type SqlEngine } from '../../engines/sql/engine';
import { judge, reference } from '../../engines/sql/judge';
import { lastSet } from '../../engines/sql/engine';
import { SQL_SEED, sqlTrack } from './index';
import type { SqlExercise } from '../types';

let engine: SqlEngine;
beforeAll(async () => {
  engine = await createSqlEngine(SQL_SEED);
});

const exercises = sqlTrack.modules.flatMap(m => (m.exercises as SqlExercise[]).map(e => ({ module: m.id, ...e })));
const sections = sqlTrack.modules.flatMap(m => m.lesson.map((s, i) => ({ module: m.id, i, ...s })));

describe('SQL track structure', () => {
  it('has the migrated content', () => {
    expect(sqlTrack.modules).toHaveLength(13);
    expect(exercises).toHaveLength(57);
    expect(sections).toHaveLength(63);
  });

  it('places every module on the roadmap exactly once', () => {
    const placed = sqlTrack.layout.flat();
    expect([...placed].sort()).toEqual(sqlTrack.modules.map(m => m.id).sort());
  });

  it('only draws edges to modules on an earlier roadmap row', () => {
    const row = new Map(sqlTrack.layout.flatMap((r, i) => r.map(id => [id, i] as const)));
    for (const m of sqlTrack.modules) {
      for (const p of m.parents) expect(row.get(p), `${m.id} <- ${p}`).toBeLessThan(row.get(m.id)!);
    }
  });

  it('gives every exercise a unique slug within its module', () => {
    for (const m of sqlTrack.modules) {
      const slugs = m.exercises.map(e => e.slug);
      expect(new Set(slugs).size, m.id).toBe(slugs.length);
      for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});

describe('SQL track against the engine', () => {
  it('only lists tables that exist in the course database', () => {
    const known = new Set(engine.schema.map(t => t.name));
    for (const e of exercises) for (const t of e.tables) expect(known.has(t), `${e.module}/${e.slug}: ${t}`).toBe(true);
  });

  it.each(exercises.map(e => [`${e.module}/${e.slug}`, e] as const))('accepts the reference solution of %s', (_, e) => {
    if (e.mode === 'mutate') expect(e.check, 'mutate exercises need a check query').toBeTruthy();
    expect(lastSet(reference(engine, e)), 'the solution must produce output').not.toBeNull();
    const v = judge(engine, e, e.solution);
    expect(v.pass, `${v.title}: ${v.msg}`).toBe(true);
  });

  it.each(sections.filter(s => s.code).map(s => [`${s.module} §${s.i + 1}`, s] as const))('runs the lesson example in %s', (_, s) => {
    const r = engine.runFresh(s.code!);
    // One example demonstrates a constraint violation on purpose.
    if (/-- fails/.test(s.code!)) expect(r.ok).toBe(false);
    else expect(r.ok, r.ok ? '' : r.error).toBe(true);
  });
});

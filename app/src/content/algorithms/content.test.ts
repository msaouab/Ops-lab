import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createNodePython, type NodePython } from '../../engines/python/nodePython';
import { algorithmsTrack } from './index';
import type { PythonExercise } from '../types';

let py: NodePython;
beforeAll(async () => {
  py = await createNodePython();
}, 60_000);

const exercises = algorithmsTrack.modules.flatMap(m => (m.exercises as PythonExercise[]).map(e => ({ moduleId: m.id, ...e })));
const sections = algorithmsTrack.modules.flatMap(m => m.lesson.map((s, i) => ({ moduleId: m.id, i, ...s })));
const run = (e: PythonExercise, code: string, only?: string[]) =>
  py.runTests({ code, module: e.module, tests: e.tests, only, extra: e.helpers });

describe('Algorithms track structure', () => {
  it('places every module on the roadmap once, edges pointing upwards', () => {
    expect([...algorithmsTrack.layout.flat()].sort()).toEqual(algorithmsTrack.modules.map(m => m.id).sort());
    const row = new Map(algorithmsTrack.layout.flatMap((r, i) => r.map(id => [id, i] as const)));
    for (const m of algorithmsTrack.modules) for (const p of m.parents) expect(row.get(p), `${m.id} <- ${p}`).toBeLessThan(row.get(m.id)!);
  });

  it('teaches every module with a lesson and practice', () => {
    for (const m of algorithmsTrack.modules) {
      expect(m.lesson.length, m.id).toBeGreaterThanOrEqual(4);
      expect(m.exercises.length, m.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('uses every Python problem in A2-online-test exactly once', () => {
    const repo = path.resolve(__dirname, '../../../../A2-online-test');
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
    const stubs = walk(repo)
      .filter(p => /\/test_[a-z0-9_]+\.py$/.test(p) && !p.includes('/06-sql/'))
      .map(p => path.basename(p).replace(/^test_|\.py$/g, ''));
    expect(exercises.map(e => e.module).sort()).toEqual(stubs.sort());
  });

  it('gives each exercise a unique slug, a hint, a complexity and sample tests', () => {
    for (const m of algorithmsTrack.modules) {
      const slugs = m.exercises.map(e => e.slug);
      expect(new Set(slugs).size, m.id).toBe(slugs.length);
    }
    for (const e of exercises) {
      expect(e.hint.length, e.module).toBeGreaterThan(20);
      expect(e.complexity, e.module).toMatch(/O\(/);
      expect(e.sampleTests.length, e.module).toBeGreaterThan(0);
    }
  });
});

describe('Algorithms track in Pyodide', () => {
  it.each(exercises.map(e => [e.module, e] as const))('accepts the reference solution of %s', (_, e) => {
    const r = run(e, e.solution);
    expect(r.error, JSON.stringify(r.error)).toBeNull();
    const failed = r.tests.filter(t => !t.ok);
    expect(failed, JSON.stringify(failed)).toEqual([]);
    expect(r.tests.length).toBeGreaterThan(0);
  });

  it.each(exercises.map(e => [e.module, e] as const))('rejects the untouched starter of %s', (_, e) => {
    const r = run(e, e.starter, e.sampleTests);
    expect(r.error).toBeNull();
    expect(r.tests.length).toBeGreaterThan(0);
    expect(r.tests.every(t => !t.ok)).toBe(true);
  });

  it.each(sections.filter(s => s.code).map(s => [`${s.moduleId} §${s.i + 1}`, s] as const))('runs the lesson example in %s', (_, s) => {
    const r = py.runSnippet(s.code!);
    expect(r.error, JSON.stringify(r.error)).toBeNull();
    expect(r.stdout.length).toBeGreaterThan(0);
  });
});

describe('runner feedback', () => {
  const e = exercises.find(x => x.module === 'longest_unique_window')!;

  it('explains a wrong answer with expected and actual values', () => {
    const r = run(e, 'def longest_unique(s):\n    return len(set(s))\n');
    const f = r.tests.find(t => !t.ok)!.failure!;
    expect(f).toMatchObject({ kind: 'AssertionError', expected: '3', got: '4' });
    expect(f.source).toContain('longest_unique("pwwkew")');
  });

  it('points at the line in the learner code that crashed', () => {
    const r = run(e, 'def longest_unique(s):\n    seen = {}\n    return seen["x"]\n');
    expect(r.tests[0]!.failure).toMatchObject({ kind: 'KeyError', line: 3 });
  });

  it('reports syntax errors before running tests', () => {
    const r = run(e, 'def longest_unique(s)\n    return 0\n');
    expect(r.error).toMatchObject({ kind: 'SyntaxError' });
    expect(r.tests).toEqual([]);
  });

  it('captures print output', () => {
    const r = run(e, 'def longest_unique(s):\n    print("debug", s)\n    return 0\n', ['test_examples']);
    expect(r.stdout).toContain('debug abcabcbb');
  });
});

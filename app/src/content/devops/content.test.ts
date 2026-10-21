import { describe, expect, it } from 'vitest';
import type { CommandExercise, ManifestExercise, QuizExercise } from '../types';
import { checkState, judgeCommand, judgeManifest, judgeQuiz, replay, runExample } from '../../engines/devops/judge';
import { scriptLines } from '../../engines/devops/kubectl';
import { devopsTrack } from './index';

const exercises = devopsTrack.modules.flatMap(m => m.exercises.map(e => ({ moduleId: m.id, e })));
const manifests = exercises.filter((x): x is { moduleId: string; e: ManifestExercise } => x.e.kind === 'manifest');
const commands = exercises.filter((x): x is { moduleId: string; e: CommandExercise } => x.e.kind === 'command');
const quizzes = exercises.filter((x): x is { moduleId: string; e: QuizExercise } => x.e.kind === 'quiz');
const sections = devopsTrack.modules.flatMap(m => m.lesson.map((s, i) => ({ moduleId: m.id, i, s })));
const label = (x: { moduleId: string; e: { slug: string } }) => `${x.moduleId}/${x.e.slug}`;

describe('DevOps track structure', () => {
  it('places every module on the roadmap once, edges pointing upwards', () => {
    expect([...devopsTrack.layout.flat()].sort()).toEqual(devopsTrack.modules.map(m => m.id).sort());
    const row = new Map(devopsTrack.layout.flatMap((r, i) => r.map(id => [id, i] as const)));
    for (const m of devopsTrack.modules) for (const p of m.parents) expect(row.get(p), `${m.id} <- ${p}`).toBeLessThan(row.get(m.id)!);
  });

  it('teaches every module with a lesson and practice', () => {
    for (const m of devopsTrack.modules) {
      expect(m.lesson.length, m.id).toBeGreaterThanOrEqual(4);
      expect(m.exercises.length, m.id).toBeGreaterThanOrEqual(2);
      const slugs = m.exercises.map(e => e.slug);
      expect(new Set(slugs).size, m.id).toBe(slugs.length);
      for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});

describe('manifest exercises', () => {
  it.each(manifests.map(x => [label(x), x.e] as const))('accepts the solution of %s', (_, e) => {
    const v = judgeManifest(e, e.solution);
    expect(v.pass, `${v.title}: ${v.msg}\n${v.rules.filter(r => !r.ok).map(r => `${r.label}: ${r.msg}`).join('\n')}`).toBe(true);
  });

  it.each(manifests.map(x => [label(x), x.e] as const))('rejects the starter of %s', (_, e) => {
    expect(judgeManifest(e, e.starter).pass).toBe(false);
  });
});

describe('command exercises', () => {
  it.each(commands.map(x => [label(x), x.e] as const))('accepts the solution of %s', (_, e) => {
    const lines = scriptLines(e.solution);
    const s = replay(e.cluster, lines);
    const failed = s.results.filter(r => !r.result.ok);
    expect(failed.map(f => `${f.cmd}\n${f.result.output}`), 'every solution command must succeed').toEqual([]);
    const v = judgeCommand(e, lines);
    expect(v.pass, `${v.title}: ${v.msg}`).toBe(true);
  });

  it.each(commands.filter(x => x.e.mode === 'state').map(x => [label(x), x.e] as const))('is not already solved before any command in %s', (_, e) => {
    const s = replay(e.cluster, []);
    expect(checkState(e, s.cluster, [])).not.toBe(true);
  });

  it.each(commands.filter(x => x.e.mode === 'output').map(x => [label(x), x.e] as const))('expects real output in %s', (_, e) => {
    const s = replay(e.cluster, scriptLines(e.solution));
    expect(s.results.at(-1)!.result.output.trim().length).toBeGreaterThan(0);
  });
});

describe('quizzes', () => {
  it.each(quizzes.map(x => [label(x), x.e] as const))('%s has well-formed questions', (_, e) => {
    expect(e.questions.length).toBeGreaterThanOrEqual(3);
    for (const q of e.questions) {
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
      expect(q.why.length).toBeGreaterThan(20);
    }
    expect(judgeQuiz(e, e.questions.map(q => q.answer)).pass).toBe(true);
    expect(judgeQuiz(e, e.questions.map(q => (q.answer + 1) % q.options.length)).pass).toBe(false);
  });
});

describe('lesson examples', () => {
  it.each(sections.filter(x => x.s.code).map(x => [`${x.moduleId} §${x.i + 1}`, x.s] as const))('runs %s', (_, s) => {
    const r = runExample(s.code!, s);
    // A few examples show a failure on purpose; they say so in the body.
    if (/on purpose|bad Dockerfile|fails/i.test(s.body + (s.note?.body ?? ''))) return;
    expect(r.ok, r.output).toBe(true);
  });
});

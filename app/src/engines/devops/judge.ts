/**
 * Grading for the DevOps exercise kinds, and the runner for lesson examples.
 * Pure functions: the workspaces render the verdicts, the content tests call
 * the same functions on every reference solution.
 */

import type { CommandExercise, LessonSection, ManifestExercise, QuizExercise } from '../../content/types';
import type { Cluster } from './cluster';
import { makeCluster } from './fixtures';
import { runLine, scriptLines, type CommandResult } from './kubectl';
import { parseManifest, preview } from './manifest';

export interface RuleResult {
  label: string;
  ok: boolean;
  /** Why it failed. */
  msg?: string;
}

export interface ManifestVerdict {
  pass: boolean;
  title: string;
  msg: string;
  /** Empty when the file didn't parse. */
  rules: RuleResult[];
}

export function judgeManifest(ex: ManifestExercise, text: string): ManifestVerdict {
  const parsed = parseManifest(text, ex.flavor, { files: ex.files, cluster: ex.cluster, filename: ex.filename });
  if (!parsed.ok || !parsed.input) {
    return { pass: false, title: 'The file doesn\'t parse', msg: parsed.error ?? 'unknown error', rules: [] };
  }
  const m = parsed.input;
  const rules = ex.rules.map(r => {
    try {
      const v = r.check(m);
      return v === true ? { label: r.label, ok: true } : { label: r.label, ok: false, msg: v };
    } catch (e) {
      // Rules throw (via need()) with the learner-facing reason.
      return { label: r.label, ok: false, msg: (e as Error).message };
    }
  });
  const failed = rules.filter(r => !r.ok).length;
  return failed === 0
    ? { pass: true, title: 'Accepted', msg: `All ${rules.length} checks pass.`, rules }
    : { pass: false, title: `${failed} of ${rules.length} checks fail`, msg: 'Fix the first failing check, run it to see the effect, then submit again.', rules };
}

export interface Session {
  cluster: Cluster;
  results: { cmd: string; result: CommandResult }[];
}

/** Replays commands on a fresh copy of the exercise's cluster. */
export function replay(clusterId: CommandExercise['cluster'], commands: string[]): Session {
  const cluster = makeCluster(clusterId);
  return { cluster, results: commands.map(cmd => ({ cmd, result: runLine(cluster, cmd) })) };
}

/** The output the solution's last command prints (what an `output` exercise expects). */
export function expectedOutput(ex: CommandExercise): string {
  const s = replay(ex.cluster, scriptLines(ex.solution));
  return s.results[s.results.length - 1]?.result.output ?? '';
}

const norm = (s: string) => s.split('\n').map(l => l.trimEnd()).join('\n').trim();

export interface CommandVerdict {
  pass: boolean;
  title: string;
  msg: string;
  mine?: string;
  want?: string;
}

export function judgeCommand(ex: CommandExercise, commands: string[]): CommandVerdict {
  const run = commands.filter(c => c.trim() && !c.trim().startsWith('#'));
  if (!run.length) return { pass: false, title: 'Nothing to grade', msg: 'Run at least one command in the terminal first.' };
  const s = replay(ex.cluster, run);
  if (ex.mode === 'output') {
    const want = expectedOutput(ex);
    const last = s.results[s.results.length - 1]!;
    const mine = last.result.output;
    if (norm(mine) === norm(want)) return { pass: true, title: 'Accepted', msg: `\`${last.cmd}\` prints exactly what was asked.`, mine, want };
    return {
      pass: false,
      title: 'Wrong output',
      msg: `Graded on your last command, \`${last.cmd}\`. Its output differs from the expected one below.`,
      mine,
      want,
    };
  }
  const v = checkState(ex, s.cluster, s.results.map(r => r.result));
  return v === true
    ? { pass: true, title: 'Accepted', msg: 'The cluster is in the state the task asks for.' }
    : { pass: false, title: 'Not yet', msg: v };
}

/** Runs a state exercise's check. Checks may throw (via need()) with the learner-facing reason. */
export function checkState(ex: CommandExercise, cluster: Cluster, results: CommandResult[]): true | string {
  if (!ex.check) return 'this exercise has no check';
  try {
    return ex.check(cluster, results);
  } catch (e) {
    return (e as Error).message;
  }
}

export interface QuizVerdict {
  pass: boolean;
  title: string;
  msg: string;
  /** Per question: right or wrong. */
  right: boolean[];
}

export function judgeQuiz(ex: QuizExercise, answers: (number | null)[]): QuizVerdict {
  const right = ex.questions.map((q, i) => answers[i] === q.answer);
  const n = right.filter(Boolean).length;
  if (answers.some(a => a === null || a === undefined)) {
    return { pass: false, title: 'Answer every question', msg: `${answers.filter(a => a !== null && a !== undefined).length} of ${ex.questions.length} answered.`, right };
  }
  return n === ex.questions.length
    ? { pass: true, title: 'Accepted', msg: `All ${n} answers are right.`, right }
    : { pass: false, title: `${n} of ${ex.questions.length} right`, msg: 'Read the explanation under each wrong answer, then try again.', right };
}

/** Runs a lesson example: shell commands on a fresh cluster, or a file preview. */
export function runExample(code: string, section: Pick<LessonSection, 'lang' | 'cluster' | 'flavor' | 'filename' | 'files'>, trackLang = 'shell'): { ok: boolean; output: string } {
  const lang = section.lang ?? trackLang;
  if (lang === 'shell') {
    const c = makeCluster(section.cluster ?? 'shop');
    const out: string[] = [];
    let ok = true;
    for (const cmd of scriptLines(code)) {
      const r = runLine(c, cmd);
      ok &&= r.ok;
      out.push(`$ ${cmd}`, ...(r.output ? [r.output] : []));
    }
    return { ok, output: out.join('\n') };
  }
  if (lang === 'dockerfile') return preview(code, 'dockerfile', { filename: section.filename ?? 'Dockerfile' });
  return preview(code, section.flavor ?? 'kubernetes', { files: section.files, cluster: section.cluster, filename: section.filename });
}

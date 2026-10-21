/**
 * Helpers for writing manifest rules and command checks that read like the
 * requirement they test. A rule returns true, or a sentence saying what's
 * wrong; `need` throws that sentence when a prerequisite is missing.
 */

import type { CommandExercise, ManifestExercise, QuizExercise, QuizQuestion, Rule } from '../types';
import type { ManifestInput } from '../../engines/devops/manifest';
import {
  deploymentStatus, endpointsOf, find, list, podState, type Cluster, type Obj,
} from '../../engines/devops/cluster';
import type { Instruction } from '../../engines/devops/dockerfile';

export function need<T>(x: T | undefined | null | false, msg: string): T {
  if (x === undefined || x === null || x === false) throw new Error(msg);
  return x;
}

export const rule = (label: string, check: Rule['check']): Rule => ({ label, check });

// ─────────────────────────── YAML ───────────────────────────

/** The first object of a kind (and name). */
export function obj(m: ManifestInput, kind: string, name?: string): Obj {
  const o = m.objects.find(x => x.kind === kind && (!name || x.metadata?.name === name));
  return need(o, `no ${kind}${name ? ` named "${name}"` : ''} in the file`);
}

export function rendered(m: ManifestInput, kind: string, name?: string): Obj {
  const o = m.rendered.find(x => x.kind === kind && (!name || x.metadata?.name === name || String(x.metadata?.name).startsWith(`${name}-`)));
  return need(o, `kustomize build has no ${kind}${name ? ` named "${name}"` : ''}`);
}

/** Reads a dotted path ("spec.template.spec.containers.0.image"). */
export function at(o: unknown, path: string): unknown {
  let cur: unknown = o;
  for (const part of path.split('.')) {
    if (cur === null || cur === undefined) return undefined;
    cur = Array.isArray(cur) ? cur[Number(part)] : (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export const containersOf = (o: Obj): Obj[] => need(at(o, o.kind === 'Pod' ? 'spec.containers' : 'spec.template.spec.containers') as Obj[] | undefined, `${o.kind} "${o.metadata?.name}" has no containers`);
export const firstContainer = (o: Obj): Obj => need(containersOf(o)[0], `${o.kind} "${o.metadata?.name}" has no containers`);

export const eq = (got: unknown, want: unknown, what: string): true | string =>
  JSON.stringify(got) === JSON.stringify(want) ? true : `${what} is ${got === undefined ? 'missing' : JSON.stringify(got)}, expected ${JSON.stringify(want)}`;

// ─────────────────────────── Dockerfile ───────────────────────────

export const stages = (m: ManifestInput) => m.dockerfile.stages;
export const lastStage = (m: ManifestInput) => need(m.dockerfile.stages[m.dockerfile.stages.length - 1], 'no FROM');

export function ins(m: ManifestInput, op: string, opts: { stage?: number | 'last'; match?: RegExp } = {}): Instruction[] {
  const s = opts.stage === 'last' ? m.dockerfile.stages.length - 1 : opts.stage;
  return m.dockerfile.instructions.filter(i => i.op === op && (s === undefined || i.stage === s) && (!opts.match || opts.match.test(i.args)));
}

/** Index of the first matching instruction (in file order), or -1. */
export function indexOf(m: ManifestInput, op: string, match?: RegExp, stage?: number | 'last'): number {
  const s = stage === 'last' ? m.dockerfile.stages.length - 1 : stage;
  return m.dockerfile.instructions.findIndex(i => i.op === op && (s === undefined || i.stage === s) && (!match || match.test(i.args)));
}

// ─────────────────────────── workflows ───────────────────────────

export const jobs = (m: ManifestInput): Record<string, Obj> => need(at(m.doc, 'jobs') as Record<string, Obj> | undefined, 'no jobs: map');
export const job = (m: ManifestInput, id: string): Obj => need(jobs(m)[id], `no job "${id}" (jobs found: ${Object.keys(jobs(m)).join(', ') || 'none'})`);
export const steps = (j: Obj): Obj[] => (Array.isArray(j.steps) ? j.steps : []);
export const usesStep = (j: Obj, action: RegExp) => steps(j).find(s => action.test(String(s.uses ?? '')));
export const runStep = (j: Obj, cmd: RegExp) => steps(j).find(s => cmd.test(String(s.run ?? '')));
export const stepIndex = (j: Obj, test: (s: Obj) => boolean) => steps(j).findIndex(test);

// ─────────────────────────── cluster checks ───────────────────────────

export function deploy(c: Cluster, ns: string, name: string): Obj {
  return need(find(c, 'Deployment', ns, name), `deployment "${name}" doesn't exist in namespace "${ns}"`);
}

/** Every pod of the deployment is Running and ready, and the rollout is finished. */
export function healthy(c: Cluster, ns: string, name: string): true | string {
  const d = find(c, 'Deployment', ns, name);
  if (!d) return `deployment "${name}" doesn't exist in namespace "${ns}"`;
  const s = deploymentStatus(c, d);
  const want = Number(d.spec.replicas ?? 1);
  const bad = list(c, 'Pod', ns).filter(p => p.metadata.labels?.app === d.spec.selector.matchLabels.app && podState(c, p).status !== 'Running');
  if (bad.length) return `${bad.length} ${name} pod${bad.length > 1 ? 's are' : ' is'} ${podState(c, bad[0]!).status}`;
  if (s.stalled || s.ready < want || s.replicas !== want) return `${name} has ${s.ready}/${want} pods ready (${s.updated} up to date)`;
  return true;
}

export const imageOf = (c: Cluster, ns: string, name: string) => String(deploy(c, ns, name).spec.template.spec.containers[0].image);

export function hasEndpoints(c: Cluster, ns: string, svc: string): true | string {
  const s = find(c, 'Service', ns, svc);
  if (!s) return `service "${svc}" doesn't exist in namespace "${ns}"`;
  return endpointsOf(c, s).some(e => e.ready) ? true : `service "${svc}" has no ready endpoints`;
}

/** Runs checks in order and returns the first failure. */
export const all = (...checks: (() => true | string)[]): true | string => {
  for (const ch of checks) {
    const v = ch();
    if (v !== true) return v;
  }
  return true;
};

// ─────────────────────────── builders ───────────────────────────

/** The statement pane lays out its children as a grid: wrap plain prompts in a paragraph. */
const paragraph = (html: string) => (/^\s*<(p|ul|ol|pre|div)\b/.test(html) ? html : `<p>${html}</p>`);

type Base = Omit<ManifestExercise, 'kind'>;
export const manifest = (e: Base): ManifestExercise => ({ kind: 'manifest', ...e, prompt: paragraph(e.prompt) });
export const command = (e: Omit<CommandExercise, 'kind'>): CommandExercise => ({ kind: 'command', ...e, prompt: paragraph(e.prompt) });
export const quiz = (e: Omit<QuizExercise, 'kind' | 'solution'> & { solution?: string }): QuizExercise => ({
  kind: 'quiz',
  ...e,
  prompt: paragraph(e.prompt),
  solution: e.solution ?? e.questions.map((q: QuizQuestion, i: number) => `${i + 1}. ${q.options[q.answer]}`).join('\n'),
});

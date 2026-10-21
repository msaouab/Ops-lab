/**
 * Everything a manifest exercise needs: parse the learner's file, preview
 * what running it would do ("Run"), and grade it against the exercise's
 * rules ("Submit").
 *
 * Previews by flavor:
 *   dockerfile   docker build: stages, final image, lint warnings
 *   kubernetes   kubectl apply on a fresh cluster, then what came up
 *   compose      docker compose up: start order, ports, health waits
 *   workflow     a GitHub Actions run for push and pull_request: jobs, order, skips
 *   argocd       argocd app get: what Argo CD would sync, and how
 *   kustomize    kustomize build: the rendered manifests
 */

import { stringify } from 'yaml';
import { applyYaml, parseYaml } from './apply';
import { list, nameOf, nsOf, podState, type Cluster, type Obj } from './cluster';
import { buildPreview, finalImage, lint, parseDockerfile, type Dockerfile, type FinalImage } from './dockerfile';
import { makeCluster, type ClusterId } from './fixtures';
import { runLine } from './kubectl';
import { renderKustomize } from './kustomize';

export type Flavor = 'dockerfile' | 'kubernetes' | 'compose' | 'workflow' | 'argocd' | 'kustomize';

/** What a rule sees. */
export interface ManifestInput {
  text: string;
  /** YAML: every document that parsed to a mapping. */
  objects: Obj[];
  /** The first document (most files have one). */
  doc: Obj;
  dockerfile: Dockerfile;
  /** Settings of the final image (Dockerfile only). */
  image: FinalImage | null;
  /** Lint warnings (Dockerfile only). */
  warnings: string[];
  /** Kustomize: the rendered objects. */
  rendered: Obj[];
  /** Kubernetes: the cluster after `kubectl apply` (built on first use). */
  cluster: () => { cluster: Cluster; ok: boolean; output: string };
}

export interface ParseOutcome {
  ok: boolean;
  error?: string;
  input?: ManifestInput;
}

const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);

export function parseManifest(text: string, flavor: Flavor, opts: { files?: Record<string, string>; cluster?: ClusterId; filename?: string } = {}): ParseOutcome {
  const empty: Dockerfile = { instructions: [], stages: [], errors: [] };
  if (flavor === 'dockerfile') {
    const df = parseDockerfile(text);
    if (df.errors.length) return { ok: false, error: df.errors.join('\n') };
    return {
      ok: true,
      input: { text, objects: [], doc: {}, dockerfile: df, image: finalImage(df), warnings: lint(df), rendered: [], cluster: () => ({ cluster: makeCluster('empty'), ok: false, output: '' }) },
    };
  }
  if (!text.trim()) return { ok: false, error: 'the file is empty' };
  const docs = parseYaml(text);
  const bad = docs.find(d => d.error);
  if (bad) return { ok: false, error: `YAML syntax error, ${bad.error}` };
  const objects = docs.map(d => d.value).filter(isObj);
  if (!objects.length) return { ok: false, error: 'no YAML mapping found: the file should start with keys like apiVersion: or name:' };
  let rendered: Obj[] = [];
  if (flavor === 'kustomize') {
    const dir = (opts.filename ?? '').split('/').slice(0, -1).join('/');
    const r = renderKustomize(objects[0]!, opts.files ?? {}, dir);
    if (!r.ok) return { ok: false, error: r.error };
    rendered = r.objects;
  }
  let applied: { cluster: Cluster; ok: boolean; output: string } | undefined;
  const cluster = () => {
    if (!applied) {
      const c = makeCluster(opts.cluster ?? 'empty');
      const r = applyYaml(c, text, opts.filename ?? 'manifest.yaml');
      applied = { cluster: c, ok: r.ok, output: r.output };
    }
    return applied;
  };
  return { ok: true, input: { text, objects, doc: objects[0]!, dockerfile: empty, image: null, warnings: [], rendered, cluster } };
}

// ────────────────────────────── previews ──────────────────────────────

export function preview(text: string, flavor: Flavor, opts: { files?: Record<string, string>; cluster?: ClusterId; filename?: string } = {}): { ok: boolean; output: string } {
  if (flavor === 'dockerfile') {
    const df = parseDockerfile(text);
    return { ok: df.errors.length === 0, output: buildPreview(df, opts.filename) };
  }
  const parsed = parseManifest(text, flavor, opts);
  if (!parsed.ok || !parsed.input) return { ok: false, output: `error: ${parsed.error}` };
  const m = parsed.input;
  switch (flavor) {
    case 'kubernetes': return kubePreview(m, opts.filename ?? 'manifest.yaml');
    case 'compose': return { ok: true, output: composePreview(m.doc) };
    case 'workflow': return { ok: true, output: workflowPreview(m.doc) };
    case 'argocd': return { ok: true, output: argoPreview(m.objects) };
    case 'kustomize': return { ok: true, output: `$ kustomize build ${(opts.filename ?? '').split('/').slice(0, -1).join('/') || '.'}\n${m.rendered.map(o => stringify(o).trimEnd()).join('\n---\n')}` };
  }
}

function kubePreview(m: ManifestInput, file: string): { ok: boolean; output: string } {
  const r = m.cluster();
  const lines = [`$ kubectl apply -f ${file}`, r.output];
  if (!r.ok) return { ok: false, output: lines.join('\n') };
  const c = r.cluster;
  const namespaces = [...new Set(m.objects.map(o => o.metadata?.namespace ?? 'default'))];
  for (const ns of namespaces) {
    const kinds = new Set(m.objects.filter(o => (o.metadata?.namespace ?? 'default') === ns).map(o => o.kind));
    const wanted = [kinds.has('Deployment') || kinds.has('Pod') ? 'pods' : '', kinds.has('Deployment') ? 'deploy' : '', kinds.has('Service') ? 'svc' : '', kinds.has('Service') ? 'endpoints' : ''].filter(Boolean);
    for (const w of wanted) {
      const cmd = `kubectl get ${w} -n ${ns}`;
      lines.push('', `$ ${cmd}`, runLine(c, cmd).output);
    }
  }
  const failing = list(c, 'Pod').filter(p => m.objects.some(o => (o.metadata?.namespace ?? 'default') === nsOf(p)) && podState(c, p).status !== 'Running');
  if (failing.length) lines.push('', `Pods not running: describe one to see why, e.g. kubectl describe pod ${nameOf(failing[0]!)} -n ${nsOf(failing[0]!)}`);
  return { ok: true, output: lines.join('\n') };
}

function composePreview(doc: Obj): string {
  const services: Obj = isObj(doc.services) ? doc.services : {};
  const names = Object.keys(services);
  if (!names.length) return 'error: no services defined (top-level "services:" key)';
  const deps = (n: string): [string, string][] => {
    const d = services[n]?.depends_on;
    if (Array.isArray(d)) return d.map(x => [String(x), 'service_started']);
    if (isObj(d)) return Object.entries(d).map(([k, v]) => [k, isObj(v) ? String(v.condition ?? 'service_started') : 'service_started']);
    return [];
  };
  const order: string[] = [];
  const seen = new Set<string>(), visiting = new Set<string>();
  const problems: string[] = [];
  const visit = (n: string) => {
    if (seen.has(n)) return;
    if (visiting.has(n)) {
      problems.push(`dependency cycle involving "${n}"`);
      return;
    }
    visiting.add(n);
    for (const [d] of deps(n)) {
      if (!services[d]) problems.push(`service "${n}" depends on undefined service "${d}"`);
      else visit(d);
    }
    visiting.delete(n);
    seen.add(n);
    order.push(n);
  };
  names.forEach(visit);
  if (problems.length) return `error: ${problems.join('\n')}`;
  const project = 'app';
  const out = ['$ docker compose up -d'];
  const nets = new Set<string>();
  for (const n of names) for (const net of Array.isArray(services[n]?.networks) ? services[n].networks : Object.keys(services[n]?.networks ?? {})) nets.add(String(net));
  out.push(` ✔ Network ${project}_${nets.size ? [...nets][0] : 'default'}  Created`);
  for (const [v] of Object.entries(isObj(doc.volumes) ? doc.volumes : {})) out.push(` ✔ Volume ${project}_${v}  Created`);
  for (const n of order) {
    const s = services[n] ?? {};
    for (const [d, cond] of deps(n)) {
      if (cond === 'service_healthy') {
        out.push(services[d]?.healthcheck ? ` ✔ Container ${project}-${d}-1  Healthy` : ` ✘ Container ${project}-${d}-1  has no healthcheck, so "service_healthy" waits forever: dependency failed to start`);
      }
    }
    const how = s.build ? `built from ${typeof s.build === 'string' ? s.build : s.build.context ?? '.'}${isObj(s.build) && s.build.target ? ` (target ${s.build.target})` : ''}` : `image ${s.image ?? '(none!)'}`;
    out.push(` ✔ Container ${project}-${n}-1  Started   (${how})`);
  }
  out.push('', '$ docker compose ps');
  const rows = order.map(n => {
    const s = services[n] ?? {};
    const ports = (Array.isArray(s.ports) ? s.ports : []).map((p: unknown) => {
      const str = String(isObj(p) ? `${p.published}:${p.target}` : p);
      const parts = str.split(':');
      return parts.length >= 2 ? `0.0.0.0:${parts[parts.length - 2]}->${parts[parts.length - 1]}/tcp` : `${str}/tcp`;
    }).join(', ');
    return [`${project}-${n}-1`, String(s.image ?? `${project}-${n}`), n, s.healthcheck ? 'Up 5 seconds (healthy)' : 'Up 5 seconds', ports];
  });
  const widths = [0, 1, 2, 3, 4].map(i => Math.max(['NAME', 'IMAGE', 'SERVICE', 'STATUS', 'PORTS'][i]!.length, ...rows.map(r => r[i]!.length)));
  const fmt = (r: string[]) => r.map((x, i) => (i === 4 ? x : x.padEnd(widths[i]! + 3))).join('').trimEnd();
  out.push(fmt(['NAME', 'IMAGE', 'SERVICE', 'STATUS', 'PORTS']), ...rows.map(fmt));
  const envs = order.filter(n => services[n]?.environment || services[n]?.env_file);
  if (envs.length) out.push('', `environment set on: ${envs.join(', ')}`);
  return out.join('\n');
}

// ─────────────── GitHub Actions: which jobs run for an event ───────────────

export interface WorkflowEvent {
  name: 'push' | 'pull_request' | 'workflow_dispatch';
  ref: string;
  /** Changed files, for paths filters. */
  paths?: string[];
}

const strip = (e: string) => e.trim().replace(/^\$\{\{\s*/, '').replace(/\s*\}\}$/, '');

/** Evaluates the small expression language of `if:` for the github context. */
export function evalIf(expr: string, ev: WorkflowEvent, results: Record<string, string> = {}, needs: string[] = []): boolean {
  const ctx: Record<string, string> = {
    'github.event_name': ev.name,
    'github.ref': ev.ref,
    'github.ref_name': ev.ref.replace(/^refs\/(heads|tags)\//, ''),
    'github.ref_type': ev.ref.startsWith('refs/tags/') ? 'tag' : 'branch',
    'github.repository': 'msaouab/ops-lab',
    'github.actor': 'msaouab',
  };
  const src = strip(expr);
  const tokens = src.match(/'[^']*'|"[^"]*"|&&|\|\||==|!=|!|\(|\)|,|[\w.-]+(?:\(\))?/g) ?? [];
  let i = 0;
  const peek = () => tokens[i];
  const value = (): string | boolean => {
    const t = tokens[i++];
    if (t === undefined) throw new Error('unexpected end');
    if (t === '!') return !truthy(value());
    if (t === '(') {
      const v = or();
      i++;
      return v;
    }
    if (/^'.*'$|^".*"$/.test(t)) return t.slice(1, -1);
    if (t === 'true' || t === 'false') return t === 'true';
    if (t === 'success()') return needs.every(n => results[n] === 'success');
    if (t === 'failure()') return needs.some(n => results[n] === 'failure');
    if (t === 'always()') return true;
    if (t === 'cancelled()') return false;
    if (t === 'startsWith' || t === 'endsWith' || t === 'contains') {
      i++; // (
      const a = String(or());
      i++; // ,
      const b = String(or());
      i++; // )
      return t === 'startsWith' ? a.startsWith(b) : t === 'endsWith' ? a.endsWith(b) : a.includes(b);
    }
    return ctx[t] ?? '';
  };
  const truthy = (v: string | boolean) => (typeof v === 'boolean' ? v : v !== '');
  const cmp = (): string | boolean => {
    let left = value();
    while (peek() === '==' || peek() === '!=') {
      const op = tokens[i++];
      const right = value();
      left = op === '==' ? String(left) === String(right) : String(left) !== String(right);
    }
    return left;
  };
  const and = (): string | boolean => {
    let left = cmp();
    while (peek() === '&&') {
      i++;
      const right = cmp();
      left = truthy(left) && truthy(right);
    }
    return left;
  };
  const or = (): string | boolean => {
    let left = and();
    while (peek() === '||') {
      i++;
      const right = and();
      left = truthy(left) || truthy(right);
    }
    return left;
  };
  try {
    return truthy(or());
  } catch {
    return false;
  }
}

const globToRe = (g: string) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\/?/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*')}$`);

/** Does the workflow's `on:` start a run for this event? */
export function triggers(doc: Obj, ev: WorkflowEvent): boolean {
  const on = doc.on ?? doc[true as unknown as string];
  if (typeof on === 'string') return on === ev.name;
  if (Array.isArray(on)) return on.includes(ev.name);
  if (!isObj(on) || !(ev.name in on)) return false;
  const cfg = on[ev.name];
  if (!isObj(cfg)) return true;
  const branch = ev.ref.replace(/^refs\/heads\//, '');
  const branches = cfg.branches as string[] | undefined;
  if (Array.isArray(branches) && ev.ref.startsWith('refs/heads/') && !branches.some(b => globToRe(b).test(branch))) return false;
  if (Array.isArray(cfg['branches-ignore']) && cfg['branches-ignore'].some((b: string) => globToRe(b).test(branch))) return false;
  if (Array.isArray(cfg.tags)) {
    if (!ev.ref.startsWith('refs/tags/')) return !branches ? false : true;
    if (!cfg.tags.some((t: string) => globToRe(t).test(ev.ref.slice(10)))) return false;
  }
  if (Array.isArray(cfg.paths) && ev.paths) {
    if (!ev.paths.some(p => cfg.paths.some((g: string) => globToRe(g).test(p)))) return false;
  }
  return true;
}

export interface JobRun {
  id: string;
  result: 'success' | 'skipped';
  why?: string;
  steps: string[];
  needs: string[];
  wave: number;
}

/** Which jobs run for an event, in waves (jobs in a wave run in parallel). */
export function planRun(doc: Obj, ev: WorkflowEvent): JobRun[] | string {
  const jobs: Obj = isObj(doc.jobs) ? doc.jobs : {};
  const ids = Object.keys(jobs);
  const needsOf = (id: string): string[] => {
    const n = jobs[id]?.needs;
    return Array.isArray(n) ? n.map(String) : n ? [String(n)] : [];
  };
  for (const id of ids) for (const n of needsOf(id)) if (!jobs[n]) return `job "${id}" needs "${n}", which doesn't exist`;
  const results: Record<string, string> = {};
  const runs: JobRun[] = [];
  const wave = new Map<string, number>();
  const visit = (id: string, stack: string[] = []): number => {
    if (wave.has(id)) return wave.get(id)!;
    if (stack.includes(id)) throw new Error(`job dependency cycle: ${[...stack, id].join(' → ')}`);
    const w = Math.max(-1, ...needsOf(id).map(n => visit(n, [...stack, id]))) + 1;
    wave.set(id, w);
    return w;
  };
  try {
    ids.forEach(id => visit(id));
  } catch (e) {
    return (e as Error).message;
  }
  for (const id of [...ids].sort((a, b) => wave.get(a)! - wave.get(b)!)) {
    const job = jobs[id] ?? {};
    const needs = needsOf(id);
    const steps = (Array.isArray(job.steps) ? job.steps : []).map((s: Obj) => String(s.name ?? s.uses ?? s.run?.split('\n')[0] ?? '(step)'));
    let result: JobRun['result'] = 'success', why: string | undefined;
    const blocked = needs.find(n => results[n] !== 'success');
    if (job.if !== undefined) {
      if (!evalIf(String(job.if), ev, results, needs)) {
        result = 'skipped';
        why = `if: ${strip(String(job.if))} is false`;
      }
    } else if (blocked) {
      result = 'skipped';
      why = `needs ${blocked}, which was skipped`;
    }
    results[id] = result;
    runs.push({ id, result, why, steps, needs, wave: wave.get(id)! });
  }
  return runs;
}

function workflowPreview(doc: Obj): string {
  const name = String(doc.name ?? '(unnamed workflow)');
  if (!isObj(doc.jobs) || !Object.keys(doc.jobs).length) return 'error: no jobs: a workflow needs a top-level "jobs:" map';
  const problems: string[] = [];
  for (const [id, job] of Object.entries(doc.jobs as Obj)) {
    if (!isObj(job)) problems.push(`job "${id}" is not a mapping`);
    else if (!job['runs-on'] && !job.uses) problems.push(`job "${id}" has no runs-on`);
    else if (!job.uses && (!Array.isArray(job.steps) || !job.steps.length)) problems.push(`job "${id}" has no steps`);
    else for (const [i, s] of (job.steps ?? []).entries()) if (isObj(s) && !s.uses && !s.run) problems.push(`job "${id}" step ${i + 1} needs "uses:" or "run:"`);
  }
  if (problems.length) return `error: ${problems.join('\n')}`;
  const events: WorkflowEvent[] = [
    { name: 'pull_request', ref: 'refs/pull/42/merge' },
    { name: 'push', ref: 'refs/heads/main' },
    { name: 'push', ref: 'refs/heads/feature/login' },
    { name: 'push', ref: 'refs/tags/v1.2.0' },
  ];
  const out = [`Workflow: ${name}`];
  for (const ev of events) {
    const label = ev.name === 'pull_request' ? 'pull request to main' : ev.ref.startsWith('refs/tags/') ? `push of tag ${ev.ref.slice(10)}` : `push to ${ev.ref.slice(11)}`;
    if (!triggers(doc, ev)) {
      out.push('', `▸ ${label}: no run (the "on:" filter doesn't match)`);
      continue;
    }
    const plan = planRun(doc, ev);
    if (typeof plan === 'string') return `error: ${plan}`;
    out.push('', `▸ ${label}:`);
    for (const j of plan) {
      const mark = j.result === 'success' ? '✓' : '⊘';
      out.push(`  ${mark} ${j.id}${j.needs.length ? ` (after ${j.needs.join(', ')})` : ''}${j.result === 'skipped' ? `  skipped: ${j.why}` : ''}`);
      if (j.result === 'success') for (const s of j.steps) out.push(`      · ${s}`);
    }
  }
  return out.join('\n');
}

function argoPreview(objects: Obj[]): string {
  const out: string[] = [];
  for (const o of objects) {
    if (o.kind === 'Application') {
      const src = o.spec?.source ?? o.spec?.sources?.[0] ?? {};
      const dst = o.spec?.destination ?? {};
      const auto = o.spec?.syncPolicy?.automated;
      out.push(
        `$ argocd app get ${o.metadata?.name ?? '(no name)'}`,
        `Name:               ${o.metadata?.namespace ?? 'argocd'}/${o.metadata?.name ?? ''}`,
        `Project:            ${o.spec?.project ?? '(missing!)'}`,
        `Server:             ${dst.server ?? dst.name ?? '(missing!)'}`,
        `Namespace:          ${dst.namespace ?? '(missing!)'}`,
        `Repo:               ${src.repoURL ?? '(missing!)'}`,
        `Target:             ${src.targetRevision ?? 'HEAD'}`,
        `Path:               ${src.path ?? src.chart ?? '(missing!)'}`,
        `SyncWindow:         Sync Allowed`,
        `Sync Policy:        ${auto ? `Automated${auto.prune ? ' (Prune)' : ''}` : 'Manual'}`,
        `Self Heal:          ${auto?.selfHeal ? 'enabled: manual changes in the cluster are reverted to Git' : 'disabled'}`,
        `Sync Options:       ${(o.spec?.syncPolicy?.syncOptions ?? []).join(', ') || '<none>'}`,
        `Sync Status:        ${auto ? 'Synced to ' + (src.targetRevision ?? 'HEAD') : 'OutOfSync (waits for someone to click Sync)'}`,
        '',
      );
    } else if (o.kind === 'ApplicationSet') {
      const gens = o.spec?.generators ?? [];
      const elements = gens.flatMap((g: Obj) => g.list?.elements ?? []);
      out.push(`$ argocd appset get ${o.metadata?.name ?? ''}`, `Generators:   ${gens.map((g: Obj) => Object.keys(g)[0]).join(', ') || '(none)'}`);
      for (const el of elements) {
        const name = String(o.spec?.template?.metadata?.name ?? '').replace(/\{\{\s*\.?(\w+)\s*\}\}/g, (_m: string, k: string) => String(el[k] ?? `{{${k}}}`));
        const path = String(o.spec?.template?.spec?.source?.path ?? '').replace(/\{\{\s*\.?(\w+)\s*\}\}/g, (_m: string, k: string) => String(el[k] ?? `{{${k}}}`));
        out.push(`  → Application ${name}  (path ${path})`);
      }
      out.push('');
    } else {
      out.push(`(${o.kind ?? 'unknown kind'} ${o.metadata?.name ?? ''}: not an Argo CD resource)`);
    }
  }
  return out.join('\n').trimEnd();
}


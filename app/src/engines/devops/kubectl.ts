/**
 * A kubectl for the simulated cluster. It parses a command line the way a
 * shell would (quotes, `&&`, `;` and a few pipe filters), runs the verb, and
 * returns the text kubectl would print, errors included.
 *
 * Supported: get, describe, logs, create, apply -f, delete, scale, expose,
 * set image|env|resources|selector, rollout status|history|undo|restart,
 * label, annotate, patch, exec (non-interactive), port-forward, top,
 * config (namespace context), explain, api-resources, version, cluster-info.
 */

import { stringify } from 'yaml';
import {
  age, b64decode, b64encode, clone, containerEnv, createdAt, deploymentStatus, endpointsOf, events, find, iso, list, nameOf,
  NAMESPACED, nsOf, podState, podsOf, reconcile, replicaSetsOf, STEP, templateHash,
  type Cluster, type Obj,
} from './cluster';
import { applyObjects, applyYaml, KINDS, ref, validate } from './apply';
import { jsonpath, JsonPathError, valueAt } from './jsonpath';
import { apiObject, columns, describe, eventsTable, listObject, table, usage } from './views';
import { lookupImage } from './registry';

export interface CommandResult {
  output: string;
  ok: boolean;
  /** The command changed the cluster. */
  mutated: boolean;
}

/** Files `kubectl apply -f <name>` can read (the playground's editor). */
export type Files = Record<string, string>;

// ────────────────────────────── shell layer ──────────────────────────────

/** Splits a command line into words, honouring quotes and backslashes. Operators come back as their own tokens. */
export function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = '', quote = '', had = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quote) {
      if (ch === quote) quote = '';
      else if (ch === '\\' && quote === '"' && i + 1 < line.length) cur += line[++i];
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      had = true;
    } else if (ch === '\\' && i + 1 < line.length) {
      cur += line[++i];
      had = true;
    } else if (/\s/.test(ch)) {
      if (cur || had) out.push(cur);
      cur = '';
      had = false;
    } else if (ch === '|' || ch === ';' || (ch === '&' && line[i + 1] === '&')) {
      if (cur || had) out.push(cur);
      cur = '';
      had = false;
      if (ch === '&') i++;
      out.push(ch === '&' ? '&&' : ch === '|' && line[i + 1] === '|' ? (i++, '||') : ch);
    } else if (ch === '#' && !cur && !had) break;
    else {
      cur += ch;
      had = true;
    }
  }
  if (quote) throw new Error(`unexpected EOF while looking for matching \`${quote}'`);
  if (cur || had) out.push(cur);
  return out;
}

/** Tells a command's result from an object it looked up. */
const isResult = (x: unknown): x is CommandResult => typeof x === 'object' && x !== null && 'mutated' in x && 'ok' in x;

const fail = (output: string): CommandResult => ({ output, ok: false, mutated: false });
const okOut = (output: string, mutated = false): CommandResult => ({ output, ok: true, mutated });

/** Filters that may follow a pipe. */
function filter(words: string[], input: string): CommandResult {
  const [cmd, ...args] = words;
  const lines = input === '' ? [] : input.split('\n');
  switch (cmd) {
    case 'grep': {
      const invert = args.includes('-v'), icase = args.includes('-i') || args.includes('-iv') || args.includes('-vi');
      const inv = invert || args.includes('-iv') || args.includes('-vi');
      const pat = args.filter(a => !a.startsWith('-'))[0];
      if (pat === undefined) return fail('usage: grep [-iv] PATTERN');
      let re: RegExp;
      try {
        re = new RegExp(pat, icase ? 'i' : '');
      } catch {
        re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), icase ? 'i' : '');
      }
      const got = lines.filter(l => re.test(l) !== inv);
      return { output: got.join('\n'), ok: got.length > 0, mutated: false };
    }
    case 'head':
    case 'tail': {
      const nArg = args.find(a => /^-\d+$/.test(a));
      const ni = args.indexOf('-n');
      const n = nArg ? Number(nArg.slice(1)) : ni >= 0 ? Number(args[ni + 1]) : 10;
      return okOut((cmd === 'head' ? lines.slice(0, n) : lines.slice(-n)).join('\n'));
    }
    case 'wc':
      if (!args.includes('-l')) return fail('wc: only -l is supported here');
      return okOut(String(input === '' ? 0 : lines.length).padStart(8));
    case 'sort': {
      const sorted = [...lines].sort();
      return okOut((args.includes('-r') ? sorted.reverse() : sorted).join('\n'));
    }
    case 'base64':
      if (!args.some(a => a === '-d' || a === '--decode' || a === '-D')) return okOut(b64encode(input));
      return okOut(b64decode(input.trim()));
    case 'awk': {
      const m = /^\{\s*print\s+((?:\$\d+[\s,]*)+)\}$/.exec(args.join(' ').trim());
      if (!m) return fail("awk: only '{print $N}' is supported here");
      const cols = [...m[1]!.matchAll(/\$(\d+)/g)].map(x => Number(x[1]));
      return okOut(lines.map(l => {
        const f = l.trim().split(/\s+/);
        return cols.map(n => (n === 0 ? l : f[n - 1] ?? '')).join(' ');
      }).join('\n'));
    }
    default:
      return fail(`${cmd}: command not found in this terminal (pipes accept grep, head, tail, wc -l, sort, awk '{print $N}', base64 -d)`);
  }
}

/** Runs one line: `a && b`, `a ; b`, `a | grep x`. */
export function runLine(c: Cluster, line: string, files: Files = {}): CommandResult {
  let tokens: string[];
  try {
    tokens = tokenize(line.trim());
  } catch (e) {
    return fail(`zsh: ${(e as Error).message}`);
  }
  if (tokens.length === 0) return okOut('');
  // Split into commands joined by && / ; / ||, each a pipeline.
  const chain: { op: string; pipeline: string[][] }[] = [];
  let op = ';', pipeline: string[][] = [[]];
  for (const t of tokens) {
    if (t === '&&' || t === ';' || t === '||') {
      chain.push({ op, pipeline });
      op = t;
      pipeline = [[]];
    } else if (t === '|') pipeline.push([]);
    else pipeline[pipeline.length - 1]!.push(t);
  }
  chain.push({ op, pipeline });
  const outputs: string[] = [];
  let last: CommandResult = okOut('');
  let mutated = false;
  for (const step of chain) {
    if (step.op === '&&' && !last.ok) continue;
    if (step.op === '||' && last.ok) continue;
    const [first, ...rest] = step.pipeline;
    if (!first || first.length === 0) {
      if (step.pipeline.length > 1 || chain.length > 1) return fail('zsh: parse error near `|`');
      continue;
    }
    let r = runWords(c, first, files);
    mutated ||= r.mutated;
    for (const f of rest) {
      if (f.length === 0) return fail('zsh: parse error near `|`');
      r = { ...filter(f, r.output), mutated: r.mutated };
    }
    last = r;
    if (r.output !== '') outputs.push(r.output);
  }
  return { output: outputs.join('\n'), ok: last.ok, mutated };
}

function runWords(c: Cluster, words: string[], files: Files): CommandResult {
  const [cmd, ...args] = words;
  if (cmd === 'kubectl' || cmd === 'k') return kubectl(c, args, files);
  if (cmd === 'echo') return okOut(args.join(' '));
  if (cmd === 'help') return okOut(HELP);
  if (cmd === 'docker' || cmd === 'helm' || cmd === 'argocd' || cmd === 'kustomize' || cmd === 'git') {
    return fail(`${cmd}: not available in this simulator (it runs kubectl only). Practise ${cmd} on your machine with the kube-lab projects.`);
  }
  return fail(`zsh: command not found: ${cmd}`);
}

export const HELP = `This terminal talks to a simulated k3d cluster (3 nodes, Kubernetes ${'v1.36'}).
Supported:
  kubectl get|describe|logs|create|apply -f|delete|scale|expose|label|annotate|patch
  kubectl set image|env|resources|selector    kubectl rollout status|history|undo|restart
  kubectl exec POD -- env|printenv|hostname    kubectl port-forward|top|explain|api-resources
  kubectl config set-context --current --namespace=NS | current-context | get-contexts
Pipes: | grep, head, tail, wc -l, sort, awk '{print $1}', base64 -d.   Chain with && or ;.
"k" is an alias for kubectl. Reset the cluster with the button above the terminal.`;

// ────────────────────────────── argument parsing ──────────────────────────────

interface Parsed {
  pos: string[];
  flags: Map<string, string[]>;
  /** Words after "--" (exec). */
  rest: string[];
}

/** Flags that never take a value. */
const BOOL = new Set(['-A', '--all-namespaces', '--show-labels', '--overwrite', '-w', '--watch', '-f-follow', '--follow', '--all', '-it', '-i', '-t', '--stdin', '--tty', '--list', '--current', '--minify', '--no-headers', '--recursive', '--record', '--previous']);

const ALIASES: Record<string, string> = {
  '--namespace': '-n', '--selector': '-l', '--output': '-o', '--container': '-c', '--filename': '-f', '--all-namespaces': '-A',
};

function parse(args: string[], boolExtra: string[] = []): Parsed {
  const pos: string[] = [], flags = new Map<string, string[]>(), rest: string[] = [];
  const bool = new Set([...BOOL, ...boolExtra]);
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--') {
      rest.push(...args.slice(i + 1));
      break;
    }
    if (a.startsWith('-') && a.length > 1 && !/^-\d/.test(a)) {
      let name = a, value: string | undefined;
      const eq = a.indexOf('=');
      if (eq > 0) {
        name = a.slice(0, eq);
        value = a.slice(eq + 1);
      }
      name = ALIASES[name] ?? name;
      if (value === undefined && !bool.has(name) && !bool.has(a)) {
        value = args[i + 1];
        if (value === undefined) throw new Error(`error: flag needs an argument: '${name.replace(/^-+/, '')}' in ${a}`);
        i++;
      }
      flags.set(name, [...(flags.get(name) ?? []), value ?? 'true']);
    } else pos.push(a);
  }
  return { pos, flags, rest };
}

const flag = (p: Parsed, ...names: string[]) => {
  for (const n of names) {
    const v = p.flags.get(n);
    if (v) return v[v.length - 1];
  }
  return undefined;
};
const has = (p: Parsed, ...names: string[]) => names.some(n => p.flags.has(n));

interface ResType {
  kind: string;
  plural: string;
}

const TYPES: Record<string, ResType> = {};
function alias(kind: string, plural: string, ...names: string[]) {
  for (const n of [plural, ...names]) TYPES[n] = { kind, plural };
}
alias('Pod', 'pods', 'pod', 'po');
alias('Deployment', 'deployments', 'deployment', 'deploy', 'deployments.apps', 'deployment.apps');
alias('ReplicaSet', 'replicasets', 'replicaset', 'rs', 'replicasets.apps');
alias('Service', 'services', 'service', 'svc');
alias('Node', 'nodes', 'node', 'no');
alias('Namespace', 'namespaces', 'namespace', 'ns');
alias('Event', 'events', 'event', 'ev');
alias('ConfigMap', 'configmaps', 'configmap', 'cm');
alias('Secret', 'secrets', 'secret');
alias('Endpoints', 'endpoints', 'ep');

const typeOf = (word: string): ResType | undefined => TYPES[word.toLowerCase()];

const UNKNOWN = (word: string) => fail(`error: the server doesn't have a resource type "${word}"`);

/** Splits "deploy/api" or ("deploy", "api") into type + name. */
function target(p: Parsed): { type: ResType; name: string; word: string } | CommandResult {
  const [first, second] = p.pos;
  if (!first) return fail('error: you must specify the type of resource and its name, e.g. deployment/api');
  if (first.includes('/')) {
    const [w, name] = first.split('/') as [string, string];
    const type = typeOf(w);
    return type ? { type, name, word: w } : UNKNOWN(w);
  }
  const type = typeOf(first);
  if (!type) return UNKNOWN(first);
  if (!second) return fail(`error: arguments in resource/name form must have a single resource and name`);
  return { type, name: second, word: first };
}

const notFound = (type: ResType, name: string) => fail(`Error from server (NotFound): ${type.plural}${type.kind === 'Deployment' || type.kind === 'ReplicaSet' ? '.apps' : ''} "${name}" not found`);

interface Selector {
  test: (labels: Record<string, string> | undefined) => boolean;
}

function selector(expr: string): Selector {
  const parts = expr.split(/,(?![^()]*\))/).map(s => s.trim()).filter(Boolean);
  const tests = parts.map(part => {
    let m = /^([\w./-]+)\s*(==|=|!=)\s*([\w./-]*)$/.exec(part);
    if (m) {
      const [, k, op, v] = m;
      return (l: Record<string, string>) => (op === '!=' ? l[k!] !== v : l[k!] === v);
    }
    m = /^([\w./-]+)\s+(in|notin)\s*\(([^)]*)\)$/.exec(part);
    if (m) {
      const vals = m[3]!.split(',').map(s => s.trim());
      return (l: Record<string, string>) => (m![2] === 'in' ? vals.includes(l[m![1]!] ?? '\0') : !vals.includes(l[m![1]!] ?? '\0'));
    }
    if (/^![\w./-]+$/.test(part)) return (l: Record<string, string>) => !(part.slice(1) in l);
    if (/^[\w./-]+$/.test(part)) return (l: Record<string, string>) => part in l;
    throw new Error(`error: unable to parse requirement: "${part}"`);
  });
  return { test: labels => tests.every(t => t(labels ?? {})) };
}

/** Namespace for a command: -n, else the context's. */
const nsFor = (c: Cluster, p: Parsed) => flag(p, '-n') ?? c.namespace;

function requireNs(c: Cluster, ns: string): CommandResult | null {
  return find(c, 'Namespace', '', ns) ? null : fail(`Error from server (NotFound): namespaces "${ns}" not found`);
}

// ────────────────────────────── kubectl ──────────────────────────────

function kubectl(c: Cluster, args: string[], files: Files): CommandResult {
  const verb = args[0];
  if (!verb || verb === 'help' || verb === '--help' || verb === '-h') return okOut(HELP);
  let p: Parsed;
  try {
    p = parse(args.slice(1), verb === 'logs' ? ['-p', '-f'] : []);
  } catch (e) {
    return fail((e as Error).message);
  }
  try {
    switch (verb) {
      case 'get': return get(c, p);
      case 'describe': return describeCmd(c, p);
      case 'logs': return logs(c, p);
      case 'create': return create(c, p);
      case 'apply': return apply(c, p, files);
      case 'delete': return del(c, p);
      case 'scale': return scale(c, p);
      case 'expose': return expose(c, p);
      case 'set': return setCmd(c, p);
      case 'rollout': return rollout(c, p);
      case 'label':
      case 'annotate': return labelCmd(c, p, verb);
      case 'patch': return patch(c, p);
      case 'exec': return exec(c, p);
      case 'port-forward': return portForward(c, p);
      case 'top': return top(c, p);
      case 'config': return config(c, p);
      case 'explain': return explain(p);
      case 'api-resources': return apiResources();
      case 'version': return okOut(`Client Version: v1.36.2\nKustomize Version: v5.7.1\nServer Version: v1.36.5+k3s1`);
      case 'cluster-info': return okOut('Kubernetes control plane is running at https://0.0.0.0:6443\nCoreDNS is running at https://0.0.0.0:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy\nMetrics-server is running at https://0.0.0.0:6443/api/v1/namespaces/kube-system/services/https:metrics-server:https/proxy\n\nTo further debug and diagnose cluster problems, use \'kubectl cluster-info dump\'.');
      case 'edit': return fail('error: kubectl edit opens an editor, which this simulator can\'t do. Use kubectl patch, kubectl set …, or kubectl apply -f with a changed manifest.');
      case 'run': return run(c, p);
      default: return fail(`error: unknown command "${verb}" for "kubectl"\n\nDid you mean this?\n\t${closest(verb)}\nRun 'kubectl --help' for usage.`);
    }
  } catch (e) {
    if (e instanceof JsonPathError) return fail(`error: error parsing jsonpath ${flag(p, '-o')?.replace(/^jsonpath=/, '')}, ${e.message}`);
    return fail((e as Error).message);
  }
}

const VERBS = ['get', 'describe', 'logs', 'create', 'apply', 'delete', 'scale', 'expose', 'set', 'rollout', 'label', 'annotate', 'patch', 'exec', 'port-forward', 'top', 'config', 'explain', 'run'];
function closest(word: string): string {
  const dist = (a: string, b: string) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
    for (let j = 1; j <= b.length; j++) d[0]![j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length]![b.length]!;
  };
  return [...VERBS].sort((a, b) => dist(word, a) - dist(word, b))[0]!;
}

function objectsOf(c: Cluster, kind: string, ns: string | undefined): Obj[] {
  if (kind === 'Endpoints') return list(c, 'Service', ns).map(s => ({ ...s, kind: 'Endpoints' }));
  return list(c, kind, ns);
}

function render(c: Cluster, kinds: { type: ResType; items: Obj[] }[], p: Parsed, allNs: boolean): CommandResult {
  const out = flag(p, '-o');
  const items = kinds.flatMap(k => k.items);
  if (out === 'yaml' || out === 'json') {
    const objs = items.map(o => apiObject(c, o.kind === 'Endpoints' ? endpointsObject(c, o) : o));
    const body = items.length === 1 && singleRequested(p) ? objs[0]! : { apiVersion: 'v1', kind: 'List', items: objs, metadata: { resourceVersion: '' } };
    return okOut(out === 'yaml' ? stringify(body).trimEnd() : JSON.stringify(body, null, 4));
  }
  if (out?.startsWith('jsonpath=') || out?.startsWith('jsonpath')) {
    const tpl = out.replace(/^jsonpath=?/, '');
    const root = items.length === 1 && singleRequested(p) ? apiObject(c, items[0]!) : listObject(c, items);
    return okOut(jsonpath(root, tpl));
  }
  if (out === 'name') return okOut(items.map(o => ref(o.kind === 'Endpoints' ? { ...o, kind: 'Endpoints' } : o).replace(/^endpoints\//, 'endpoints/')).join('\n'));
  if (out && out !== 'wide') {
    if (out.startsWith('custom-columns=')) {
      const spec = out.slice('custom-columns='.length).split(',').map(s => s.split(':') as [string, string]);
      return okOut(table(spec.map(s => s[0]), items.map(o => spec.map(([, path]) => {
        const v = valueAt(apiObject(c, o), path);
        return v === undefined ? '<none>' : typeof v === 'object' ? JSON.stringify(v) : String(v);
      }))));
    }
    return fail(`error: unable to match a printer suitable for the output format "${out}", allowed formats are: custom-columns,json,jsonpath,name,wide,yaml`);
  }
  const wide = out === 'wide';
  const multi = kinds.length > 1;
  const blocks: string[] = [];
  for (const { type, items: objs } of kinds) {
    if (!objs.length) continue;
    const cols = columns(c, type.kind).filter(col => wide || !col.wide);
    const header = cols.map(col => col.header);
    const rows = objs.map(o => cols.map((col, i) => {
      const v = col.get(o);
      return i === 0 && multi ? ref(o.kind === 'Endpoints' ? { ...o, kind: 'Endpoints' } : o) : v;
    }));
    if (has(p, '--show-labels')) {
      header.push('LABELS');
      rows.forEach((r, i) => r.push(Object.entries(objs[i]!.metadata.labels ?? {}).map(([k, v]) => `${k}=${v}`).join(',') || '<none>'));
    }
    if (allNs && NAMESPACED.has(type.kind)) {
      header.unshift('NAMESPACE');
      rows.forEach((r, i) => r.unshift(nsOf(objs[i]!)));
    }
    const t = table(header, rows);
    blocks.push(has(p, '--no-headers') ? t.split('\n').slice(1).join('\n') : t);
  }
  return okOut(blocks.join('\n\n'));
}

const singleRequested = (p: Parsed) => (p.pos.length === 2 && !p.pos[0]!.includes(',')) || (p.pos.length === 1 && p.pos[0]!.includes('/'));

function endpointsObject(c: Cluster, svc: Obj): Obj {
  const eps = endpointsOf(c, svc);
  const ready = eps.filter(e => e.ready), notReady = eps.filter(e => !e.ready);
  return {
    apiVersion: 'v1',
    kind: 'Endpoints',
    metadata: { name: nameOf(svc), namespace: nsOf(svc), creationTimestamp: svc.metadata.creationTimestamp },
    subsets: eps.length ? [{
      ...(ready.length ? { addresses: ready.map(e => ({ ip: e.ip, targetRef: { kind: 'Pod', name: e.pod } })) } : {}),
      ...(notReady.length ? { notReadyAddresses: notReady.map(e => ({ ip: e.ip, targetRef: { kind: 'Pod', name: e.pod } })) } : {}),
      ports: (svc.spec.ports ?? []).map((pt: Obj) => ({ port: Number(pt.targetPort ?? pt.port), protocol: 'TCP' })),
    }] : [],
  };
}

function get(c: Cluster, p: Parsed): CommandResult {
  if (p.pos.length === 0) return fail('You must specify the type of resource to get. Use "kubectl api-resources" for a complete list of supported resources.\n\nerror: Required resource not specified.');
  const allNs = has(p, '-A');
  const ns = allNs ? undefined : nsFor(c, p);
  if (ns && p.pos[0] !== 'nodes' && p.pos[0] !== 'ns' && p.pos[0] !== 'namespaces') {
    const err = requireNs(c, ns);
    if (err && !['no', 'node', 'nodes', 'namespace'].includes(p.pos[0]!)) return { ...err, output: `No resources found in ${ns} namespace.`, ok: true };
  }
  let sel: Selector | undefined;
  const selExpr = flag(p, '-l');
  if (selExpr) sel = selector(selExpr);
  // Forms: get pods | get pods a b | get pod/a svc/b | get pods,svc | get all
  const groups: { type: ResType; names: string[] }[] = [];
  if (p.pos.every(w => w.includes('/'))) {
    for (const w of p.pos) {
      const [tw, name] = w.split('/') as [string, string];
      const type = typeOf(tw);
      if (!type) return UNKNOWN(tw);
      const g = groups.find(x => x.type.kind === type.kind);
      if (g) g.names.push(name);
      else groups.push({ type, names: [name] });
    }
  } else {
    const [typesWord, ...names] = p.pos;
    for (const tw of typesWord!.split(',')) {
      if (tw === 'all') {
        for (const k of ['pods', 'services', 'deployments', 'replicasets']) groups.push({ type: TYPES[k]!, names });
        continue;
      }
      const type = typeOf(tw);
      if (!type) return UNKNOWN(tw);
      groups.push({ type, names });
    }
  }
  const results: { type: ResType; items: Obj[] }[] = [];
  const errors: string[] = [];
  for (const g of groups) {
    if (g.type.kind === 'Event') {
      const evs = events(c, ns).filter(e => !g.names.length || g.names.some(n => e.object.endsWith(`/${n}`)));
      const sortBy = flag(p, '--sort-by');
      void sortBy; // events are already oldest first, which is what --sort-by=.lastTimestamp gives
      const typeFilter = flag(p, '--field-selector');
      const shown = typeFilter ? evs.filter(e => typeFilter.split(',').every(f => {
        const m = /^(type|reason|involvedObject\.name)(!?=)(.*)$/.exec(f);
        if (!m) return true;
        const val = m[1] === 'type' ? e.type : m[1] === 'reason' ? e.reason : e.object.split('/')[1];
        return m[2] === '=' ? val === m[3] : val !== m[3];
      })) : evs;
      if (!shown.length) return okOut(ns ? `No resources found in ${ns} namespace.` : 'No resources found');
      return okOut(eventsTable(c, shown, allNs));
    }
    let items = objectsOf(c, g.type.kind, ns);
    if (g.names.length) {
      const found: Obj[] = [];
      for (const n of g.names) {
        const o = items.find(x => nameOf(x) === n);
        if (o) found.push(o);
        else errors.push(notFound(g.type, n).output);
      }
      items = found;
    }
    if (sel) items = items.filter(o => sel!.test(o.metadata.labels));
    if (g.type.kind === 'Pod' || g.type.kind === 'ReplicaSet' || g.type.kind === 'Deployment') items = sortForList(items);
    else items = [...items].sort((a, b) => (allNs ? nsOf(a).localeCompare(nsOf(b)) : 0) || nameOf(a).localeCompare(nameOf(b)));
    if (allNs) items = [...items].sort((a, b) => nsOf(a).localeCompare(nsOf(b)));
    results.push({ type: g.type, items });
  }
  const sortBy = flag(p, '--sort-by');
  if (sortBy) {
    for (const r of results) {
      r.items = [...r.items].sort((a, b) => {
        const va = valueAt(apiObject(c, a), sortBy), vb = valueAt(apiObject(c, b), sortBy);
        return typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''));
      });
    }
  }
  const total = results.reduce((n, r) => n + r.items.length, 0);
  if (total === 0) {
    if (errors.length) return fail(errors.join('\n'));
    const cluster = results.every(r => !NAMESPACED.has(r.type.kind));
    return okOut(cluster || !ns ? 'No resources found' : `No resources found in ${ns} namespace.`);
  }
  const r = render(c, results, p, allNs);
  if (has(p, '-w')) r.output += '\n(--watch: the simulator prints once and returns. On a real cluster this keeps streaming changes until Ctrl+C.)';
  return errors.length ? { ...r, ok: false, output: `${r.output}\n${errors.join('\n')}` } : r;
}

/** Pods and ReplicaSets list by name, like kubectl (alphabetical). */
const sortForList = (xs: Obj[]) => [...xs].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));

function describeCmd(c: Cluster, p: Parsed): CommandResult {
  const ns = nsFor(c, p);
  const [first, ...names] = p.pos;
  if (!first) return fail('You must specify the type of resource to describe. Use "kubectl api-resources" for a complete list of supported resources.');
  let type: ResType | undefined, wanted: string[];
  if (first.includes('/')) {
    const [tw, n] = first.split('/') as [string, string];
    type = typeOf(tw);
    if (!type) return UNKNOWN(tw);
    wanted = [n];
  } else {
    type = typeOf(first);
    if (!type) return UNKNOWN(first);
    wanted = names;
  }
  let items = objectsOf(c, type.kind, NAMESPACED.has(type.kind) ? ns : undefined);
  const sel = flag(p, '-l');
  if (sel) items = items.filter(o => selector(sel).test(o.metadata.labels));
  if (wanted.length) {
    // describe matches name prefixes: "kubectl describe pod api" describes every api-… pod.
    const exact = items.filter(o => wanted.includes(nameOf(o)));
    items = exact.length ? exact : items.filter(o => wanted.some(w => nameOf(o).startsWith(w)));
    if (!items.length) return notFound(type, wanted[0]!);
  }
  if (!items.length) return okOut(`No resources found in ${ns} namespace.`);
  return okOut(sortForList(items).map(o => describe(c, o)).join('\n\n\n'));
}

function pickPod(c: Cluster, p: Parsed, ns: string): { pod: Obj; note?: string } | CommandResult {
  const w = p.pos[0];
  if (!w) {
    const sel = flag(p, '-l');
    if (sel) {
      const pods = sortForList(list(c, 'Pod', ns).filter(o => selector(sel).test(o.metadata.labels)));
      if (!pods.length) return okOut('No resources found in ' + ns + ' namespace.');
      return { pod: pods[0]! };
    }
    return fail('error: expected POD or TYPE/NAME is a required argument for the logs command');
  }
  if (w.includes('/')) {
    const [tw, name] = w.split('/') as [string, string];
    const type = typeOf(tw);
    if (!type) return UNKNOWN(tw);
    if (type.kind === 'Pod') {
      const pod = find(c, 'Pod', ns, name);
      return pod ? { pod } : notFound(type, name);
    }
    if (type.kind === 'Deployment' || type.kind === 'Service' || type.kind === 'ReplicaSet') {
      const owner = find(c, type.kind, ns, name);
      if (!owner) return notFound(type, name);
      let pods: Obj[];
      if (type.kind === 'Deployment') pods = replicaSetsOf(c, owner).flatMap(rs => podsOf(c, rs));
      else if (type.kind === 'ReplicaSet') pods = podsOf(c, owner);
      else pods = list(c, 'Pod', ns).filter(x => owner.spec.selector && Object.entries(owner.spec.selector).every(([k, v]) => x.metadata.labels?.[k] === v));
      pods = sortForList(pods);
      if (!pods.length) return fail(`error: timed out waiting for the condition`);
      return { pod: pods[0]!, note: pods.length > 1 ? `Found ${pods.length} pods, using pod/${nameOf(pods[0]!)}` : undefined };
    }
    return fail(`error: cannot get the logs from ${type.plural}`);
  }
  const pod = find(c, 'Pod', ns, w);
  return pod ? { pod } : fail(`Error from server (NotFound): pods "${w}" not found`);
}

function logs(c: Cluster, p: Parsed): CommandResult {
  const ns = nsFor(c, p);
  const sel = flag(p, '-l');
  const previous = has(p, '-p', '--previous');
  const tail = Number(flag(p, '--tail') ?? -1);
  const cut = (lines: string[]) => (tail >= 0 ? lines.slice(Math.max(0, lines.length - tail)) : lines);
  const one = (pod: Obj, prefix: boolean): CommandResult => {
    const st = podState(c, pod);
    const want = flag(p, '-c');
    const ctIndex = want ? pod.spec.containers.findIndex((x: Obj) => x.name === want) : 0;
    if (ctIndex < 0) return fail(`error: container ${want} is not valid for pod ${nameOf(pod)}`);
    const ct = pod.spec.containers[ctIndex];
    const s = st.containers[ctIndex];
    if (!st.node || !s) return fail(`Error from server (BadRequest): container "${ct.name}" in pod "${nameOf(pod)}" is waiting to start: ContainerCreating`);
    if (s.state === 'ImagePullBackOff') return fail(`Error from server (BadRequest): container "${ct.name}" in pod "${nameOf(pod)}" is waiting to start: trying and failing to pull image`);
    if (s.state === 'CreateContainerConfigError') return fail(`Error from server (BadRequest): container "${ct.name}" in pod "${nameOf(pod)}" is waiting to start: CreateContainerConfigError`);
    if (previous) {
      if (!s.previousLogs) return fail(`Error from server (BadRequest): previous terminated container "${ct.name}" in pod "${nameOf(pod)}" not found`);
      return okOut(cut(s.previousLogs).map(l => (prefix ? `[pod/${nameOf(pod)}/${ct.name}] ${l}` : l)).join('\n'));
    }
    return okOut(cut(s.logs).map(l => (prefix ? `[pod/${nameOf(pod)}/${ct.name}] ${l}` : l)).join('\n'));
  };
  if (sel && !p.pos[0]) {
    const pods = sortForList(list(c, 'Pod', ns).filter(o => selector(sel).test(o.metadata.labels)));
    if (!pods.length) return okOut(`No resources found in ${ns} namespace.`);
    const outs = pods.map(pod => one(pod, has(p, '--prefix')));
    return { output: outs.map(o => o.output).filter(Boolean).join('\n'), ok: outs.every(o => o.ok), mutated: false };
  }
  const picked = pickPod(c, p, ns);
  if (isResult(picked)) return picked;
  const r = one(picked.pod, has(p, '--prefix'));
  const followNote = has(p, '-f', '--follow') ? '\n(-f: the simulator prints the logs once. A real cluster keeps streaming new lines until Ctrl+C.)' : '';
  return { ...r, output: [picked.note, r.output].filter(Boolean).join('\n') + followNote };
}

// ────────────────────────────── changes ──────────────────────────────

/** Records a change: controllers run, then the clock moves on. */
function commit(c: Cluster, output: string): CommandResult {
  reconcile(c);
  c.now += STEP;
  return okOut(output, true);
}

function dryRunYaml(o: Obj): CommandResult {
  const x = clone(o);
  x.metadata = { ...x.metadata, creationTimestamp: null };
  if (x.kind !== 'Namespace' && x.metadata.namespace === undefined) delete x.metadata.namespace;
  return okOut(stringify(x).trimEnd());
}

function create(c: Cluster, p: Parsed): CommandResult {
  const [what, name, ...more] = p.pos;
  const ns = nsFor(c, p);
  const dry = flag(p, '--dry-run');
  const outFmt = flag(p, '-o');
  if (has(p, '-f')) return apply(c, p, {}, 'create');
  if (!what) return fail('error: must specify one of -f and -k, or a resource type: namespace, deployment, configmap, secret, service');
  const finish = (o: Obj, label: string): CommandResult => {
    if (dry === 'client' || dry === 'server' || dry === 'true') {
      if (outFmt === 'yaml') return dryRunYaml(o);
      if (outFmt === 'json') return okOut(JSON.stringify(o, null, 2));
      return okOut(`${label} created (dry run)`);
    }
    if (o.kind !== 'Namespace') {
      const err = requireNs(c, nsOf(o));
      if (err) return err;
    }
    const r = applyObjects(c, [o], { mode: 'create' });
    return { output: r.output, ok: r.ok, mutated: r.ok };
  };
  switch (what) {
    case 'namespace':
    case 'ns': {
      if (!name) return fail('error: exactly one NAME is required, got 0');
      return finish({ apiVersion: 'v1', kind: 'Namespace', metadata: { name } }, `namespace/${name}`);
    }
    case 'deployment':
    case 'deploy': {
      if (!name) return fail('error: exactly one NAME is required, got 0');
      const images = p.flags.get('--image');
      if (!images?.length) return fail("error: required flag(s) \"image\" not set");
      const port = flag(p, '--port');
      const replicas = Number(flag(p, '-r', '--replicas') ?? 1);
      const containers = images.map(img => {
        const base = img.split('/').pop()!.split(':')[0]!.split('@')[0]!;
        return { name: base, image: img, ...(port ? { ports: [{ containerPort: Number(port) }] } : {}), resources: {} };
      });
      const o = {
        apiVersion: 'apps/v1', kind: 'Deployment',
        metadata: { name, namespace: ns, labels: { app: name } },
        spec: { replicas, selector: { matchLabels: { app: name } }, strategy: {}, template: { metadata: { labels: { app: name } }, spec: { containers } } },
      };
      return finish(o, `deployment.apps/${name}`);
    }
    case 'configmap':
    case 'cm': {
      if (!name) return fail('error: exactly one NAME is required, got 0');
      const data: Record<string, string> = {};
      for (const kv of p.flags.get('--from-literal') ?? []) {
        const i = kv.indexOf('=');
        if (i < 1) return fail(`error: invalid literal source ${kv}, expected key=value`);
        data[kv.slice(0, i)] = kv.slice(i + 1);
      }
      return finish({ apiVersion: 'v1', kind: 'ConfigMap', metadata: { name, namespace: ns }, data }, `configmap/${name}`);
    }
    case 'secret': {
      const sub = name;
      const sname = more[0];
      if (sub !== 'generic') return fail(`error: this simulator supports "kubectl create secret generic NAME --from-literal=KEY=VALUE"`);
      if (!sname) return fail('error: exactly one NAME is required, got 0');
      const data: Record<string, string> = {};
      for (const kv of p.flags.get('--from-literal') ?? []) {
        const i = kv.indexOf('=');
        if (i < 1) return fail(`error: invalid literal source ${kv}, expected key=value`);
        data[kv.slice(0, i)] = b64encode(kv.slice(i + 1));
      }
      return finish({ apiVersion: 'v1', kind: 'Secret', metadata: { name: sname, namespace: ns }, type: 'Opaque', data }, `secret/${sname}`);
    }
    case 'service':
    case 'svc': {
      const sname = more[0];
      const type = name === 'nodeport' ? 'NodePort' : name === 'clusterip' ? 'ClusterIP' : name === 'loadbalancer' ? 'LoadBalancer' : null;
      if (!type || !sname) return fail('error: use "kubectl create service clusterip|nodeport NAME --tcp=PORT:TARGET"');
      const tcp = flag(p, '--tcp');
      if (!tcp) return fail('error: at least one tcp port specifier must be provided');
      const [port, targetPort] = tcp.split(':').map(Number);
      return finish({
        apiVersion: 'v1', kind: 'Service', metadata: { name: sname, namespace: ns, labels: { app: sname } },
        spec: { type, selector: { app: sname }, ports: [{ name: `${port}-${targetPort ?? port}`, port, targetPort: targetPort ?? port, protocol: 'TCP' }] },
      }, `service/${sname}`);
    }
    default:
      return fail(`error: unknown command "${what}" for "kubectl create"`);
  }
}

function run(c: Cluster, p: Parsed): CommandResult {
  const name = p.pos[0];
  const image = flag(p, '--image');
  if (!name || !image) return fail('error: NAME and --image are required, e.g. kubectl run tmp --image=nginx:1.29');
  const ns = nsFor(c, p);
  const pod = { apiVersion: 'v1', kind: 'Pod', metadata: { name, namespace: ns, labels: { run: name } }, spec: { containers: [{ name, image }] } };
  if (flag(p, '--dry-run')) return flag(p, '-o') === 'yaml' ? dryRunYaml(pod) : okOut(`pod/${name} created (dry run)`);
  const r = applyObjects(c, [pod], { mode: 'create' });
  return { output: r.output, ok: r.ok, mutated: r.ok };
}

function apply(c: Cluster, p: Parsed, files: Files, mode: 'apply' | 'create' = 'apply'): CommandResult {
  const f = flag(p, '-f');
  if (!f) return fail('error: must specify one of -f and -k');
  const text = files[f] ?? files[f.replace(/^\.\//, '')];
  if (text === undefined) {
    const known = Object.keys(files);
    return fail(`error: the path "${f}" does not exist${known.length ? `\n(files you can apply here: ${known.join(', ')})` : '\n(this terminal has no files: write the manifest in the editor and use its Apply button)'}`);
  }
  if (flag(p, '--dry-run')) {
    const probe = structuredClone(c);
    const r = applyYaml(probe, text, f);
    return { output: r.output.split('\n').map(l => (r.ok ? `${l} (dry run)` : l)).join('\n'), ok: r.ok, mutated: false };
  }
  const r = mode === 'create' ? (() => {
    const probe = applyYaml(structuredClone(c), text, f);
    if (!probe.ok) return probe;
    return applyYaml(c, text, f);
  })() : applyYaml(c, text, f);
  return { output: mode === 'create' ? r.output.replace(/ configured$| unchanged$/gm, ' created') : r.output, ok: r.ok, mutated: r.ok };
}

function del(c: Cluster, p: Parsed): CommandResult {
  const ns = nsFor(c, p);
  if (p.pos.length === 0) return fail('error: You must provide one or more resources by argument or filename.');
  const sel = flag(p, '-l');
  const out: string[] = [];
  const targets: { type: ResType; names: string[] }[] = [];
  if (p.pos[0]!.includes('/')) {
    for (const w of p.pos) {
      const [tw, n] = w.split('/') as [string, string];
      const type = typeOf(tw);
      if (!type) return UNKNOWN(tw);
      targets.push({ type, names: [n] });
    }
  } else {
    const type = typeOf(p.pos[0]!);
    if (!type) return UNKNOWN(p.pos[0]!);
    targets.push({ type, names: p.pos.slice(1) });
    if (!p.pos[1] && !sel && !has(p, '--all')) return fail('error: resource(s) were provided, but no name was specified');
  }
  let changed = false;
  for (const { type, names } of targets) {
    if (type.kind === 'Node') return fail('error: deleting nodes is disabled in this simulator');
    if (type.kind === 'Event' || type.kind === 'Endpoints') return fail(`error: deleting ${type.plural} isn't supported here`);
    let victims = list(c, type.kind, NAMESPACED.has(type.kind) ? ns : undefined);
    if (names.length) {
      for (const n of names) if (!victims.some(o => nameOf(o) === n)) out.push(notFound(type, n).output);
      victims = victims.filter(o => names.includes(nameOf(o)));
    } else if (sel) victims = victims.filter(o => selector(sel).test(o.metadata.labels));
    if (type.kind === 'Namespace' && victims.some(v => ['default', 'kube-system', 'kube-public', 'kube-node-lease'].includes(nameOf(v)))) {
      return fail('Error from server (Forbidden): namespaces "default" is forbidden: this namespace may not be deleted');
    }
    for (const v of victims) {
      c.objects = c.objects.filter(o => o !== v);
      const word = type.kind === 'Deployment' ? 'deployment.apps' : type.kind === 'ReplicaSet' ? 'replicaset.apps' : type.plural.replace(/s$/, '').replace(/^service$/, 'service');
      out.push(`${word} "${nameOf(v)}" deleted`);
      changed = true;
    }
    if (!victims.length && !names.length) out.push(`No resources found`);
  }
  if (!changed) return fail(out.join('\n'));
  const r = commit(c, out.filter(l => !l.startsWith('Error')).join('\n'));
  const errs = out.filter(l => l.startsWith('Error'));
  return errs.length ? { ...r, ok: false, output: [r.output, ...errs].join('\n') } : r;
}

function deploymentTarget(c: Cluster, p: Parsed): Obj | CommandResult {
  const t = target(p);
  if ('output' in t) return t;
  if (t.type.kind !== 'Deployment') return fail(`error: this command works on deployments here, not ${t.type.plural}`);
  const ns = nsFor(c, p);
  return find(c, 'Deployment', ns, t.name) ?? notFound(t.type, t.name);
}

function scale(c: Cluster, p: Parsed): CommandResult {
  const n = flag(p, '--replicas');
  if (n === undefined) return fail('error: required flag(s) "replicas" not set');
  if (!/^\d+$/.test(n)) return fail(`error: invalid argument "${n}" for "--replicas" flag: strconv.ParseInt: parsing "${n}": invalid syntax`);
  const dep = deploymentTarget(c, p);
  if (isResult(dep)) return dep;
  dep.spec.replicas = Number(n);
  return commit(c, `deployment.apps/${nameOf(dep)} scaled`);
}

function expose(c: Cluster, p: Parsed): CommandResult {
  const t = target(p);
  if ('output' in t) return t;
  const ns = nsFor(c, p);
  const src = find(c, t.type.kind, ns, t.name);
  if (!src) return notFound(t.type, t.name);
  const port = flag(p, '--port');
  const selectorLabels = t.type.kind === 'Deployment' ? src.spec.selector.matchLabels : t.type.kind === 'Pod' ? src.metadata.labels : t.type.kind === 'Service' ? src.spec.selector : null;
  if (!selectorLabels) return fail(`error: cannot expose a ${t.type.kind}`);
  const ctPort = t.type.kind === 'Deployment' ? src.spec.template.spec.containers[0]?.ports?.[0]?.containerPort : undefined;
  if (!port && !ctPort) return fail(`error: couldn't find port via --port flag or introspection\nSee 'kubectl expose -h' for help and examples`);
  const name = flag(p, '--name') ?? t.name;
  const type = flag(p, '--type') ?? 'ClusterIP';
  const svc = {
    apiVersion: 'v1', kind: 'Service', metadata: { name, namespace: ns, labels: { ...(src.metadata.labels ?? {}) } },
    spec: { type, selector: { ...selectorLabels }, ports: [{ port: Number(port ?? ctPort), targetPort: Number(flag(p, '--target-port') ?? port ?? ctPort), protocol: 'TCP' }] },
  };
  if (flag(p, '--dry-run')) return flag(p, '-o') === 'yaml' ? dryRunYaml(svc) : okOut(`service/${name} exposed (dry run)`);
  const r = applyObjects(c, [svc], { mode: 'create' });
  return { output: r.ok ? `service/${name} exposed` : r.output, ok: r.ok, mutated: r.ok };
}

function setCmd(c: Cluster, p: Parsed): CommandResult {
  const [what, ...restPos] = p.pos;
  const sub: Parsed = { ...p, pos: restPos };
  if (what === 'selector') {
    const t = target(sub);
    if ('output' in t) return t;
    if (t.type.kind !== 'Service') return fail('error: set selector works on services in this simulator');
    const svc = find(c, 'Service', nsFor(c, p), t.name);
    if (!svc) return notFound(t.type, t.name);
    const expr = sub.pos[t.name === sub.pos[1] ? 2 : 1];
    if (!expr) return fail('error: expected a selector, e.g. kubectl set selector service/api app=api');
    const sel: Record<string, string> = {};
    for (const part of expr.split(',')) {
      const [k, v] = part.split('=');
      if (!k || v === undefined) return fail(`error: invalid selector "${expr}"`);
      sel[k] = v;
    }
    svc.spec.selector = sel;
    return commit(c, `service/${t.name} selector updated`);
  }
  const dep = deploymentTarget(c, sub);
  if (isResult(dep)) return dep;
  const args = sub.pos.slice(sub.pos[0]!.includes('/') ? 1 : 2);
  const containers: Obj[] = dep.spec.template.spec.containers;
  const pick = () => {
    const want = flag(p, '-c');
    return want ? containers.filter(x => x.name === want) : containers;
  };
  switch (what) {
    case 'image': {
      if (!args.length) return fail('error: at least one image update is required');
      for (const pair of args) {
        const i = pair.indexOf('=');
        if (i < 1) return fail(`error: invalid image update "${pair}": expected CONTAINER=IMAGE`);
        const name = pair.slice(0, i), image = pair.slice(i + 1);
        const targets = name === '*' ? containers : containers.filter(x => x.name === name);
        if (!targets.length) return fail(`error: unable to find container named "${name}"`);
        for (const ct of targets) ct.image = image;
      }
      return commit(c, `deployment.apps/${nameOf(dep)} image updated`);
    }
    case 'env': {
      if (has(p, '--list')) {
        return okOut(pick().map(ct => `# deployments/${nameOf(dep)}, container ${ct.name}\n${(ct.env ?? []).map((e: Obj) => e.value !== undefined ? `${e.name}=${e.value}` : `# ${e.name} from ${e.valueFrom?.secretKeyRef ? `secret ${e.valueFrom.secretKeyRef.name}, key ${e.valueFrom.secretKeyRef.key}` : `configmap ${e.valueFrom?.configMapKeyRef?.name}, key ${e.valueFrom?.configMapKeyRef?.key}`}`).join('\n')}`).join('\n'));
      }
      const from = flag(p, '--from');
      const ns = nsOf(dep);
      for (const ct of pick()) {
        ct.env = ct.env ?? [];
        if (from) {
          const [kw, name] = from.split('/') as [string, string];
          const isSecret = kw === 'secret';
          if (!['secret', 'configmap', 'cm'].includes(kw) || !name) return fail(`error: --from must be configmap/NAME or secret/NAME`);
          const src = find(c, isSecret ? 'Secret' : 'ConfigMap', ns, name);
          if (!src) return fail(`Error from server (NotFound): ${isSecret ? 'secrets' : 'configmaps'} "${name}" not found`);
          for (const key of Object.keys(src.data ?? {})) {
            ct.env = ct.env.filter((e: Obj) => e.name !== key);
            ct.env.push({ name: key, valueFrom: { [isSecret ? 'secretKeyRef' : 'configMapKeyRef']: { name, key } } });
          }
        }
        for (const a of args) {
          if (a.endsWith('-') && !a.includes('=')) {
            ct.env = ct.env.filter((e: Obj) => e.name !== a.slice(0, -1));
            continue;
          }
          const i = a.indexOf('=');
          if (i < 1) return fail(`error: envs must be of the form key=value, got "${a}"`);
          const key = a.slice(0, i), value = a.slice(i + 1);
          ct.env = ct.env.filter((e: Obj) => e.name !== key);
          ct.env.push({ name: key, value });
        }
        if (!ct.env.length) delete ct.env;
      }
      if (!from && !args.length) return fail('error: at least one environment variable must be provided');
      return commit(c, `deployment.apps/${nameOf(dep)} env updated`);
    }
    case 'resources': {
      const parseList = (s: string | undefined) => {
        const out: Record<string, string> = {};
        for (const part of (s ?? '').split(',').filter(Boolean)) {
          const [k, v] = part.split('=');
          if (!k || !v || !['cpu', 'memory'].includes(k)) throw new Error(`error: invalid resource "${part}": use cpu=250m,memory=256Mi`);
          out[k] = v;
        }
        return out;
      };
      const req = parseList(flag(p, '--requests')), lim = parseList(flag(p, '--limits'));
      if (!Object.keys(req).length && !Object.keys(lim).length) return fail('error: you must specify an update to requests or limits (in the form of --requests/--limits)');
      for (const ct of pick()) {
        ct.resources = ct.resources ?? {};
        if (Object.keys(req).length) ct.resources.requests = { ...(ct.resources.requests ?? {}), ...req };
        if (Object.keys(lim).length) ct.resources.limits = { ...(ct.resources.limits ?? {}), ...lim };
      }
      const err = validate(dep);
      if (err) return fail(err);
      return commit(c, `deployment.apps/${nameOf(dep)} resource requirements updated`);
    }
    default:
      return fail(`error: unknown command "${what}" for "kubectl set" (image, env, resources, selector)`);
  }
}

function rollout(c: Cluster, p: Parsed): CommandResult {
  const [action, ...restPos] = p.pos;
  const sub: Parsed = { ...p, pos: restPos };
  const dep = deploymentTarget(c, sub);
  if (isResult(dep)) return dep;
  const name = nameOf(dep);
  const sets = replicaSetsOf(c, dep);
  const rev = (rs: Obj) => Number(rs.metadata.annotations?.['deployment.kubernetes.io/revision'] ?? 0);
  switch (action) {
    case 'status': {
      const s = deploymentStatus(c, dep);
      const want = Number(dep.spec.replicas ?? 1);
      if (!s.stalled && s.ready >= want && s.replicas === want) return okOut(`deployment "${name}" successfully rolled out`);
      const lines: string[] = [];
      if (s.updated < want) lines.push(`Waiting for deployment "${name}" rollout to finish: ${s.updated} out of ${want} new replicas have been updated...`);
      else if (s.replicas > want) lines.push(`Waiting for deployment "${name}" rollout to finish: ${s.replicas - want} old replicas are pending termination...`);
      else lines.push(`Waiting for deployment "${name}" rollout to finish: ${s.ready} of ${want} updated replicas are available...`);
      const since = s.currentRs ? c.now - createdAt(s.currentRs) : 0;
      if (since > 600) lines.push(`error: deployment "${name}" exceeded its progress deadline`);
      else lines.push('(the simulator stops here; a real rollout status keeps waiting until it succeeds or hits the 10-minute progress deadline)');
      return { output: lines.join('\n'), ok: false, mutated: false };
    }
    case 'history': {
      const which = flag(p, '--revision');
      const sorted = [...sets].sort((a, b) => rev(a) - rev(b));
      if (which) {
        const rs = sorted.find(x => rev(x) === Number(which));
        if (!rs) return fail(`error: unable to find the specified revision`);
        const tpl = rs.spec.template;
        return okOut(`deployment.apps/${name} with revision #${which}\nPod Template:\n  Labels:\t${Object.entries(tpl.metadata?.labels ?? {}).map(([k, v]) => `${k}=${v}`).join('\n\t')}\n${rs.metadata.annotations?.['kubernetes.io/change-cause'] ? `  Annotations:\tkubernetes.io/change-cause: ${rs.metadata.annotations['kubernetes.io/change-cause']}\n` : ''}  Containers:\n${tpl.spec.containers.map((ct: Obj) => `   ${ct.name}:\n    Image:\t${ct.image}\n    Port:\t${ct.ports?.[0]?.containerPort ? `${ct.ports[0].containerPort}/TCP` : '<none>'}`).join('\n')}`);
      }
      return okOut(`deployment.apps/${name}\n${table(['REVISION', 'CHANGE-CAUSE'], sorted.map(rs => [String(rev(rs)), rs.metadata.annotations?.['kubernetes.io/change-cause'] ?? '<none>']))}`);
    }
    case 'undo': {
      const to = flag(p, '--to-revision');
      const sorted = [...sets].sort((a, b) => rev(b) - rev(a));
      const target = to && to !== '0' ? sorted.find(x => rev(x) === Number(to)) : sorted[1];
      if (!target) return fail(to ? `error: unable to find specified revision ${to} in history` : `error: no rollout history found for deployment "${name}"`);
      const tpl = clone(target.spec.template);
      delete tpl.metadata.labels['pod-template-hash'];
      if (templateHash(tpl) === templateHash(dep.spec.template)) return okOut(`deployment.apps/${name} skipped rollback (current template already matches revision ${rev(target)})`);
      dep.spec.template = tpl;
      return commit(c, `deployment.apps/${name} rolled back`);
    }
    case 'restart': {
      const tpl = dep.spec.template;
      tpl.metadata = tpl.metadata ?? {};
      tpl.metadata.annotations = { ...(tpl.metadata.annotations ?? {}), 'kubectl.kubernetes.io/restartedAt': iso(c.now) };
      return commit(c, `deployment.apps/${name} restarted`);
    }
    case 'pause':
    case 'resume':
      return fail(`error: rollout ${action} isn't simulated here`);
    default:
      return fail(`error: unknown command "${action ?? ''}" for "kubectl rollout" (status, history, undo, restart)`);
  }
}

function labelCmd(c: Cluster, p: Parsed, verb: 'label' | 'annotate'): CommandResult {
  const ns = nsFor(c, p);
  let type: ResType | undefined, name: string | undefined, rest: string[];
  const first = p.pos[0];
  if (!first) return fail(`error: one or more resources must be specified as <resource> <name> or <resource>/<name>`);
  if (first.includes('/')) {
    const [tw, n] = first.split('/') as [string, string];
    type = typeOf(tw);
    name = n;
    rest = p.pos.slice(1);
    if (!type) return UNKNOWN(tw);
  } else {
    type = typeOf(first);
    if (!type) return UNKNOWN(first);
    name = p.pos[1];
    rest = p.pos.slice(2);
  }
  if (!name) return fail('error: resource name is required');
  const o = find(c, type.kind, ns, name);
  if (!o) return notFound(type, name);
  if (!rest.length) return fail(`error: at least one ${verb === 'label' ? 'label' : 'annotation'} update is required`);
  const field = verb === 'label' ? 'labels' : 'annotations';
  const map: Record<string, string> = { ...(o.metadata[field] ?? {}) };
  for (const kvp of rest) {
    if (kvp.endsWith('-') && !kvp.includes('=')) {
      delete map[kvp.slice(0, -1)];
      continue;
    }
    const i = kvp.indexOf('=');
    if (i < 1) return fail(`error: invalid ${verb} format "${kvp}"`);
    const k = kvp.slice(0, i), v = kvp.slice(i + 1);
    if (k in map && map[k] !== v && !has(p, '--overwrite')) return fail(`error: '${k}' already has a value (${map[k]}), and --overwrite is false`);
    map[k] = v;
  }
  o.metadata[field] = map;
  return commit(c, `${ref(o)} ${verb === 'label' ? 'labeled' : 'annotated'}`);
}

// ────────────────────────────── patch ──────────────────────────────

const isPlain = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);

/** RFC 7386 merge patch: objects merge, null deletes, arrays replace. */
function mergePatch(target: unknown, patchV: unknown): unknown {
  if (!isPlain(patchV)) return clone(patchV);
  const out: Obj = isPlain(target) ? { ...target } : {};
  for (const [k, v] of Object.entries(patchV)) {
    if (v === null) delete out[k];
    else out[k] = mergePatch(out[k], v);
  }
  return out;
}

/** Strategic merge: like merge patch, but lists of objects with a "name" merge item by item. */
function strategicPatch(target: unknown, patchV: unknown): unknown {
  if (Array.isArray(patchV) && Array.isArray(target) && patchV.every(x => isPlain(x) && 'name' in x) && target.every(x => isPlain(x) && 'name' in x)) {
    const out = target.map(x => clone(x));
    for (const item of patchV as Obj[]) {
      const i = out.findIndex(x => x.name === item.name);
      if (i >= 0) out[i] = strategicPatch(out[i], item) as Obj;
      else out.push(clone(item));
    }
    return out;
  }
  if (!isPlain(patchV)) return clone(patchV);
  const out: Obj = isPlain(target) ? { ...target } : {};
  for (const [k, v] of Object.entries(patchV)) {
    if (v === null) delete out[k];
    else out[k] = strategicPatch(out[k], v);
  }
  return out;
}

function jsonPatch(doc: Obj, ops: unknown): Obj {
  if (!Array.isArray(ops)) throw new Error('error: unable to parse "json" patch: expected a list of operations');
  const out = clone(doc);
  for (const op of ops) {
    if (!isPlain(op) || typeof op.path !== 'string') throw new Error('error: each json patch operation needs "op" and "path"');
    const parts = op.path.split('/').slice(1).map((s: string) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
    const last = parts.pop();
    let node: unknown = out;
    for (const part of parts) {
      node = Array.isArray(node) ? node[Number(part)] : isPlain(node) ? node[part] : undefined;
      if (node === undefined) throw new Error(`The request is invalid: the server rejected our request due to an error in our request (doc is missing path: "${op.path}")`);
    }
    if (last === undefined) throw new Error('error: empty json patch path');
    if (op.op === 'remove') {
      if (Array.isArray(node)) node.splice(Number(last), 1);
      else if (isPlain(node)) {
        if (!(last in node)) throw new Error(`The request is invalid: unable to remove nonexistent key: ${last}`);
        delete node[last];
      }
    } else if (op.op === 'add' || op.op === 'replace') {
      if (op.op === 'replace' && isPlain(node) && !(last in node)) throw new Error(`The request is invalid: the server rejected our request due to an error in our request (doc is missing key: "${last}": missing value)`);
      if (Array.isArray(node)) {
        if (last === '-') node.push(op.value);
        else if (op.op === 'add') node.splice(Number(last), 0, op.value);
        else node[Number(last)] = op.value;
      } else if (isPlain(node)) node[last] = op.value;
    } else throw new Error(`error: json patch op "${String(op.op)}" isn't supported here (add, replace, remove)`);
  }
  return out;
}

function patch(c: Cluster, p: Parsed): CommandResult {
  const t = target(p);
  if ('output' in t) return t;
  const ns = nsFor(c, p);
  const o = find(c, t.type.kind, ns, t.name);
  if (!o) return notFound(t.type, t.name);
  const body = flag(p, '-p', '--patch');
  if (!body) return fail('error: must specify --patch or --patch-file containing the contents of the patch');
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return fail(`error: unable to parse "${body}": yaml: did not find expected node content (wrap the patch in single quotes and use JSON)`);
  }
  const kind = flag(p, '--type') ?? 'strategic';
  let next: Obj;
  if (kind === 'json') next = jsonPatch(o, parsed);
  else if (kind === 'merge') next = mergePatch(o, parsed) as Obj;
  else if (kind === 'strategic') next = strategicPatch(o, parsed) as Obj;
  else return fail(`error: --type must be one of [json merge strategic], not "${kind}"`);
  const err = validate(next);
  if (err) return fail(err);
  if (JSON.stringify(next) === JSON.stringify(o)) return okOut(`${ref(o)} patched (no change)`);
  c.objects[c.objects.indexOf(o)] = next;
  return commit(c, `${ref(o)} patched`);
}

// ────────────────────────────── exec, port-forward, top ──────────────────────────────

function exec(c: Cluster, p: Parsed): CommandResult {
  const ns = nsFor(c, p);
  const picked = pickPod(c, { ...p, pos: p.pos.slice(0, 1) }, ns);
  if (isResult(picked)) return picked;
  const pod = picked.pod;
  const st = podState(c, pod);
  const ct = pod.spec.containers[0];
  if (!st.node || st.containers[0]?.state !== 'Running') return fail(`error: unable to upgrade connection: container not found ("${ct.name}")`);
  const [cmd, ...args] = p.rest;
  if (!cmd) return fail('error: you must specify at least one command for the container');
  if (['sh', 'bash', '/bin/sh', '/bin/bash', 'ash'].includes(cmd) && args.length === 0) {
    return fail(`(an interactive shell can't open in this simulator: run one command instead, e.g. kubectl exec ${nameOf(pod)} -- env)`);
  }
  const env = {
    PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    HOSTNAME: nameOf(pod),
    ...containerEnv(c, ns, ct),
    KUBERNETES_SERVICE_HOST: '10.43.0.1',
    KUBERNETES_SERVICE_PORT: '443',
  } as Record<string, string>;
  for (const svc of list(c, 'Service', ns)) {
    const key = nameOf(svc).toUpperCase().replace(/-/g, '_');
    env[`${key}_SERVICE_HOST`] = svc.spec.clusterIP;
    env[`${key}_SERVICE_PORT`] = String(svc.spec.ports[0].port);
  }
  switch (cmd) {
    case 'env':
    case 'printenv':
      if (args[0]) return env[args[0]] !== undefined ? okOut(env[args[0]]!) : { output: '', ok: false, mutated: false };
      return okOut(Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n'));
    case 'hostname':
      return okOut(nameOf(pod));
    case 'cat':
      if (args[0] === '/etc/hostname') return okOut(nameOf(pod));
      if (args[0] === '/etc/resolv.conf') return okOut(`search ${ns}.svc.cluster.local svc.cluster.local cluster.local\nnameserver 10.43.0.10\noptions ndots:5`);
      return fail(`cat: can't open '${args[0] ?? ''}': No such file or directory`);
    case 'nslookup': {
      const host = args[0] ?? '';
      const short = host.split('.')[0]!;
      const svcNs = host.split('.')[1] ?? ns;
      const svc = find(c, 'Service', svcNs, short);
      if (!svc) return fail(`Server:\t\t10.43.0.10\nAddress:\t10.43.0.10:53\n\n** server can't find ${host}.${ns}.svc.cluster.local: NXDOMAIN`);
      return okOut(`Server:\t\t10.43.0.10\nAddress:\t10.43.0.10:53\n\nName:\t${short}.${svcNs}.svc.cluster.local\nAddress: ${svc.spec.clusterIP}`);
    }
    case 'wget':
    case 'curl': {
      const url = args.filter(a => !a.startsWith('-'))[0] ?? '';
      const m = /^(?:https?:\/\/)?([^/:]+)(?::(\d+))?(\/.*)?$/.exec(url);
      if (!m) return fail(`${cmd}: bad address '${url}'`);
      const [, host, port, path] = m;
      const short = host!.split('.')[0]!;
      const svcNs = host!.split('.')[1] ?? ns;
      const svc = find(c, 'Service', svcNs, short);
      if (!svc) return fail(`${cmd}: bad address '${host}'`);
      const sp = svc.spec.ports.find((x: Obj) => String(x.port) === (port ?? '80')) ?? (port ? undefined : svc.spec.ports[0]);
      if (!sp) return fail(`${cmd}: can't connect to remote host (${svc.spec.clusterIP}): Connection refused`);
      const eps = endpointsOf(c, svc).filter(e => e.ready);
      if (!eps.length) return fail(`${cmd}: can't connect to remote host (${svc.spec.clusterIP}): Connection refused`);
      const backend = find(c, 'Pod', svcNs, eps[0]!.pod);
      const info = backend ? lookupImage(backend.spec.containers[0].image) : undefined;
      if (info?.port !== eps[0]!.port) return fail(`${cmd}: can't connect to remote host (${svc.spec.clusterIP}): Connection refused`);
      return okOut(path && path !== '/' && path !== info?.health ? `HTTP/1.1 404 Not Found` : `HTTP/1.1 200 OK (served by ${eps[0]!.pod})`);
    }
    case 'ls':
      return okOut('app\nbin\ndev\netc\nhome\nlib\nproc\nroot\nsys\ntmp\nusr\nvar');
    default:
      return fail(`OCI runtime exec failed: exec failed: unable to start container process: exec: "${cmd}": executable file not found in $PATH: unknown\ncommand terminated with exit code 126\n(this simulator understands env, printenv, hostname, cat, ls, nslookup, wget/curl)`);
  }
}

function portForward(c: Cluster, p: Parsed): CommandResult {
  const ns = nsFor(c, p);
  const [w, ports] = p.pos;
  if (!w || !ports) return fail('error: TYPE/NAME and list of ports are required for port-forward');
  const [local, remote] = ports.split(':');
  let targetPort = Number(remote ?? local);
  let pod: Obj | undefined;
  if (w.startsWith('svc/') || w.startsWith('service/')) {
    const svc = find(c, 'Service', ns, w.split('/')[1]!);
    if (!svc) return fail(`Error from server (NotFound): services "${w.split('/')[1]}" not found`);
    const sp = svc.spec.ports.find((x: Obj) => x.port === targetPort);
    if (!sp) return fail(`error: Service ${nameOf(svc)} does not have a service port ${targetPort}`);
    targetPort = Number(sp.targetPort);
    const eps = endpointsOf(c, svc);
    if (!eps.length) return fail('error: timed out waiting for the condition');
    pod = find(c, 'Pod', ns, eps[0]!.pod);
  } else {
    const picked = pickPod(c, { ...p, pos: [w] }, ns);
    if (isResult(picked)) return picked;
    pod = picked.pod;
  }
  if (!pod || podState(c, pod).status !== 'Running') return fail(`error: unable to forward port because pod is not running. Current status=${pod ? podState(c, pod).phase : 'Unknown'}`);
  return okOut(`Forwarding from 127.0.0.1:${local} -> ${targetPort}\nForwarding from [::1]:${local} -> ${targetPort}\n(on a real machine this keeps running; open http://localhost:${local} in a browser, Ctrl+C to stop)`);
}

function top(c: Cluster, p: Parsed): CommandResult {
  const [what] = p.pos;
  if (what === 'nodes' || what === 'node' || what === 'no') {
    const rows = list(c, 'Node').map(n => {
      const pods = list(c, 'Pod').filter(x => podState(c, x).node === nameOf(n));
      const cpu = 60 + pods.reduce((a, x) => a + usage(c, x).cpu, 0);
      const mem = 600 + pods.reduce((a, x) => a + usage(c, x).mem, 0);
      return [nameOf(n), `${cpu}m`, `${Math.round((cpu / 2000) * 100)}%`, `${mem}Mi`, `${Math.round((mem / 4096) * 100)}%`];
    });
    return okOut(table(['NAME', 'CPU(cores)', 'CPU(%)', 'MEMORY(bytes)', 'MEMORY(%)'], rows));
  }
  if (what === 'pods' || what === 'pod' || what === 'po') {
    const allNs = has(p, '-A');
    const ns = nsFor(c, p);
    let pods = list(c, 'Pod', allNs ? undefined : ns).filter(x => podState(c, x).status === 'Running');
    const sel = flag(p, '-l');
    if (sel) pods = pods.filter(x => selector(sel).test(x.metadata.labels));
    if (!pods.length) return okOut(`No resources found in ${ns} namespace.`);
    pods = sortForList(pods);
    return okOut(table([...(allNs ? ['NAMESPACE'] : []), 'NAME', 'CPU(cores)', 'MEMORY(bytes)'], pods.map(x => [...(allNs ? [nsOf(x)] : []), nameOf(x), `${usage(c, x).cpu}m`, `${usage(c, x).mem}Mi`])));
  }
  return fail('error: top supports pods and nodes');
}

function config(c: Cluster, p: Parsed): CommandResult {
  const [sub] = p.pos;
  switch (sub) {
    case 'current-context':
      return okOut('k3d-lab');
    case 'get-contexts':
      return okOut(table(['CURRENT', 'NAME', 'CLUSTER', 'AUTHINFO', 'NAMESPACE'], [['*', 'k3d-lab', 'k3d-lab', 'admin@k3d-lab', c.namespace === 'default' ? '' : c.namespace]]));
    case 'set-context': {
      if (!has(p, '--current') && p.pos[1] !== 'k3d-lab') return fail('error: use kubectl config set-context --current --namespace=NAME');
      const ns = flag(p, '-n');
      if (ns === undefined) return okOut('Context "k3d-lab" modified.');
      c.namespace = ns;
      return { output: 'Context "k3d-lab" modified.', ok: true, mutated: true };
    }
    case 'view': {
      const out = flag(p, '-o');
      const view = {
        apiVersion: 'v1', kind: 'Config', 'current-context': 'k3d-lab',
        clusters: [{ name: 'k3d-lab', cluster: { server: 'https://0.0.0.0:6443', 'certificate-authority-data': 'DATA+OMITTED' } }],
        contexts: [{ name: 'k3d-lab', context: { cluster: 'k3d-lab', user: 'admin@k3d-lab', ...(c.namespace !== 'default' ? { namespace: c.namespace } : {}) } }],
        users: [{ name: 'admin@k3d-lab', user: { 'client-certificate-data': 'DATA+OMITTED', 'client-key-data': 'DATA+OMITTED' } }],
      };
      if (out?.startsWith('jsonpath')) return okOut(jsonpath(view, out.replace(/^jsonpath=?/, '')));
      return okOut(stringify(view).trimEnd());
    }
    case 'use-context':
      return p.pos[1] === 'k3d-lab' ? okOut('Switched to context "k3d-lab".') : fail(`error: no context exists with the name: "${p.pos[1] ?? ''}"`);
    default:
      return fail('error: kubectl config supports current-context, get-contexts, set-context --current --namespace=NS, view, use-context');
  }
}

const EXPLAIN: Record<string, string> = {
  'pod': 'KIND:       Pod\nVERSION:    v1\n\nDESCRIPTION:\n    Pod is a collection of containers that can run on a host. This resource is\n    created by clients and scheduled onto hosts.\n\nFIELDS:\n  apiVersion\t<string>\n  kind\t<string>\n  metadata\t<ObjectMeta>\n  spec\t<PodSpec>\n  status\t<PodStatus>',
  'deployment': 'GROUP:      apps\nKIND:       Deployment\nVERSION:    v1\n\nDESCRIPTION:\n    Deployment enables declarative updates for Pods and ReplicaSets.\n\nFIELDS:\n  apiVersion\t<string>\n  kind\t<string>\n  metadata\t<ObjectMeta>\n  spec\t<DeploymentSpec>\n  status\t<DeploymentStatus>',
  'deployment.spec': 'FIELDS:\n  minReadySeconds\t<integer>\n  paused\t<boolean>\n  progressDeadlineSeconds\t<integer>\n  replicas\t<integer>\n  revisionHistoryLimit\t<integer>\n  selector\t<LabelSelector> -required-\n  strategy\t<DeploymentStrategy>\n  template\t<PodTemplateSpec> -required-',
  'deployment.spec.replicas': 'FIELD: replicas <integer>\n\nDESCRIPTION:\n    Number of desired pods. This is a pointer to distinguish between explicit\n    zero and not specified. Defaults to 1.',
  'deployment.spec.strategy': 'FIELD: strategy <DeploymentStrategy>\n\nDESCRIPTION:\n    The deployment strategy to use to replace existing pods with new ones.\n\nFIELDS:\n  rollingUpdate\t<RollingUpdateDeployment>\n    maxSurge: how many pods above the desired count may exist during an update (default 25%).\n    maxUnavailable: how many pods may be unavailable during an update (default 25%).\n  type\t<string>\n    "Recreate" kills all existing pods before creating new ones.\n    "RollingUpdate" (default) replaces them gradually.',
  'deployment.spec.selector': 'FIELD: selector <LabelSelector>\n\nDESCRIPTION:\n    Label selector for pods. Existing ReplicaSets whose pods are selected by\n    this will be the ones affected by this deployment. It must match the pod\n    template\'s labels. It is immutable after creation.',
  'service.spec.type': 'FIELD: type <string>\n\nDESCRIPTION:\n    type determines how the Service is exposed. Defaults to ClusterIP.\n    "ClusterIP": a virtual IP reachable inside the cluster only.\n    "NodePort": also opens the same port (30000-32767) on every node.\n    "LoadBalancer": also asks the cloud (or k3d\'s servicelb) for an external IP.\n    "ExternalName": a DNS alias (CNAME) to another name.',
  'service.spec.ports': 'FIELDS:\n  name\t<string>\n  nodePort\t<integer>\n  port\t<integer> -required-\n    The port this service listens on.\n  protocol\t<string>\n  targetPort\t<IntOrString>\n    Port (number or name) on the pods to send traffic to. Defaults to port.',
  'pod.spec.containers.readinessprobe': 'FIELD: readinessProbe <Probe>\n\nDESCRIPTION:\n    Periodic probe of container service readiness. Container will be removed\n    from service endpoints if the probe fails.',
  'pod.spec.containers.livenessprobe': 'FIELD: livenessProbe <Probe>\n\nDESCRIPTION:\n    Periodic probe of container liveness. Container will be restarted if the\n    probe fails.',
  'pod.spec.containers.resources': 'FIELD: resources <ResourceRequirements>\n\nDESCRIPTION:\n    Compute Resources required by this container.\n\nFIELDS:\n  limits\t<map[string]Quantity>\n    Maximum amount of compute resources allowed (memory over the limit: OOMKilled).\n  requests\t<map[string]Quantity>\n    Minimum amount the scheduler reserves on a node (no node with room: Pending).',
};

function explain(p: Parsed): CommandResult {
  const q = (p.pos[0] ?? '').toLowerCase().replace(/^deployments?\b|^deploy\b/, 'deployment').replace(/^pods?\b|^po\b/, 'pod').replace(/^services?\b|^svc\b/, 'service');
  const hit = EXPLAIN[q];
  if (hit) return okOut(hit);
  return fail(`error: field "${p.pos[0] ?? ''}" isn't in this simulator's built-in docs. Try: ${Object.keys(EXPLAIN).join(', ')}`);
}

function apiResources(): CommandResult {
  const rows = [
    ['configmaps', 'cm', 'v1', 'true', 'ConfigMap'],
    ['endpoints', 'ep', 'v1', 'true', 'Endpoints'],
    ['events', 'ev', 'v1', 'true', 'Event'],
    ['namespaces', 'ns', 'v1', 'false', 'Namespace'],
    ['nodes', 'no', 'v1', 'false', 'Node'],
    ['pods', 'po', 'v1', 'true', 'Pod'],
    ['secrets', '', 'v1', 'true', 'Secret'],
    ['services', 'svc', 'v1', 'true', 'Service'],
    ['deployments', 'deploy', 'apps/v1', 'true', 'Deployment'],
    ['replicasets', 'rs', 'apps/v1', 'true', 'ReplicaSet'],
  ];
  return okOut(table(['NAME', 'SHORTNAMES', 'APIVERSION', 'NAMESPACED', 'KIND'], rows));
}

// ────────────────────────────── for graders ──────────────────────────────

/** Runs lines in order and returns each output (a script or a terminal session). */
export function runScript(c: Cluster, lines: string[], files: Files = {}): CommandResult[] {
  return lines.map(l => runLine(c, l, files));
}

/** Command lines from a script: one per line, blank lines and # comments dropped. */
export const scriptLines = (text: string) => text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

export { age, KINDS };

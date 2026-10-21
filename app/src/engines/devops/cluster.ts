/**
 * A small, deterministic Kubernetes cluster that runs in the browser.
 *
 * Objects are stored as plain Kubernetes JSON (apiVersion, kind, metadata,
 * spec), so `kubectl get -o yaml`, `apply` and `patch` work on the real shape.
 * After every change, `reconcile` plays the controllers: Deployments get
 * ReplicaSets, ReplicaSets get Pods, and each Pod's status is worked out from
 * its spec and the image registry (pull errors, missing config, crashes,
 * OOM kills, failing probes, unschedulable requests). A rolling update to a
 * broken template stalls the way it does on a real cluster: one new failing
 * pod, the old pods still serving.
 *
 * Time is simulated: every change happens at `now`, then the clock moves on
 * 20 seconds. Reads never move it, so the same reads give the same output.
 */

import { lookupImage, tagsOf } from './registry';

// The objects are free-form Kubernetes JSON; this is a simulator, not a typed client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Obj = Record<string, any>;

export interface KEvent {
  namespace: string;
  type: 'Normal' | 'Warning';
  reason: string;
  /** "pod/api-7d9f…", "deployment/api". */
  object: string;
  message: string;
  first: number;
  last: number;
  count: number;
  source: string;
}

export interface Cluster {
  /** Seconds since the Unix epoch. */
  now: number;
  /** Namespace of the current kubectl context. */
  namespace: string;
  objects: Obj[];
  /** Events recorded by controllers (pod events are derived from pod state). */
  events: KEvent[];
  /** Counter that keeps generated names deterministic. */
  seq: number;
}

/** "Now" when a fixture cluster is handed to the learner. */
export const START = Date.UTC(2026, 9, 21, 9, 0, 0) / 1000;
/** Seconds the clock moves after each change. */
export const STEP = 20;

export const NODES = [
  { name: 'k3d-lab-server-0', role: 'control-plane,master', ip: '172.18.0.2' },
  { name: 'k3d-lab-agent-0', role: '<none>', ip: '172.18.0.3' },
  { name: 'k3d-lab-agent-1', role: '<none>', ip: '172.18.0.4' },
];
/** Allocatable per node. */
export const NODE_CPU_M = 2000;
export const NODE_MEM_MI = 4096;
export const K8S_VERSION = 'v1.36.5+k3s1';

// ────────────────────────────── helpers ──────────────────────────────

export const clone = <T>(x: T): T => structuredClone(x);
export const iso = (t: number) => new Date(t * 1000).toISOString().replace('.000Z', 'Z');
export const fromIso = (s: string) => Date.parse(s) / 1000;
export const createdAt = (o: Obj) => fromIso(o.metadata.creationTimestamp);

/** FNV-1a, for names and IPs that look random but never change. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Kubernetes' "safe" alphabet for generated names (no vowels, no 0/1/3).
const SAFE = 'bcdfghjklmnpqrstvwxz2456789';
export function safeString(seed: string, n: number): string {
  let out = '';
  let h = hash(seed);
  for (let i = 0; i < n; i++) {
    if (i % 6 === 0) h = hash(`${seed}:${i}`);
    out += SAFE[h % SAFE.length];
    h = Math.floor(h / SAFE.length);
  }
  return out;
}

/** "250m" → 250, "1" → 1000, "0.5" → 500. */
export function cpuMilli(q: unknown): number {
  if (q === undefined || q === null || q === '') return 0;
  const s = String(q);
  return s.endsWith('m') ? Number(s.slice(0, -1)) : Math.round(Number(s) * 1000);
}

/** "128Mi" → 128, "1Gi" → 1024, "500M" → 477. Returns MiB. */
export function memMi(q: unknown): number {
  if (q === undefined || q === null || q === '') return 0;
  const m = /^(\d+(?:\.\d+)?)(Ki|Mi|Gi|Ti|K|M|G|k)?$/.exec(String(q));
  if (!m) return NaN;
  const n = Number(m[1]);
  const unit = m[2] ?? '';
  const bytes = { '': 1, Ki: 1024, Mi: 1024 ** 2, Gi: 1024 ** 3, Ti: 1024 ** 4, K: 1e3, k: 1e3, M: 1e6, G: 1e9 }[unit] ?? 1;
  return (n * bytes) / 1024 ** 2;
}

/** kubectl's HumanDuration: 45s, 3m12s, 47m, 5h3m, 26h, 3d4h, 12d. */
export function age(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 120) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 10) return s % 60 ? `${m}m${s % 60}s` : `${m}m`;
  if (m < 180) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 8) return m % 60 ? `${h}h${m % 60}m` : `${h}h`;
  if (h < 48) return `${h}h`;
  const d = Math.floor(h / 24);
  if (h < 24 * 8) return h % 24 ? `${d}d${h % 24}h` : `${d}d`;
  return `${d}d`;
}

export const nsOf = (o: Obj): string => o.metadata?.namespace ?? '';
export const nameOf = (o: Obj): string => o.metadata?.name ?? '';

export function find(c: Cluster, kind: string, ns: string, name: string): Obj | undefined {
  return c.objects.find(o => o.kind === kind && nameOf(o) === name && (NAMESPACED.has(kind) ? nsOf(o) === ns : true));
}

export const list = (c: Cluster, kind: string, ns?: string) =>
  c.objects.filter(o => o.kind === kind && (ns === undefined || !NAMESPACED.has(kind) || nsOf(o) === ns));

export const NAMESPACED = new Set(['Pod', 'Deployment', 'ReplicaSet', 'Service', 'ConfigMap', 'Secret', 'Endpoints']);

export function matches(labels: Record<string, string> | undefined, selector: Record<string, string> | undefined): boolean {
  if (!selector || Object.keys(selector).length === 0) return false;
  return Object.entries(selector).every(([k, v]) => labels?.[k] === v);
}

export function ownerOf(o: Obj): { kind: string; name: string } | undefined {
  const ref = o.metadata?.ownerReferences?.[0];
  return ref ? { kind: ref.kind, name: ref.name } : undefined;
}

// ────────────────────────────── pod status ──────────────────────────────

export interface ContainerState {
  name: string;
  image: string;
  ready: boolean;
  restarts: number;
  /** Seconds since the last restart, when restarts > 0. */
  lastRestartAgo: number;
  /** "Running", or the waiting reason ("CrashLoopBackOff", …). */
  state: string;
  /** Previous run: "Error", "OOMKilled". */
  lastTerminated?: { reason: string; exitCode: number };
  /** Events this container produces, newest last. */
  warnings: { reason: string; message: string; first: number; last: number; count: number }[];
  logs: string[];
  previousLogs?: string[];
}

export interface PodState {
  phase: 'Running' | 'Pending';
  /** What `kubectl get pods` shows in STATUS. */
  status: string;
  node: string | null;
  containers: ContainerState[];
  scheduleMessage?: string;
}

/** Restarts after `t` seconds of crash looping (kubelet back-off: 10s, 20s, 40s … capped at 5m). */
function backoff(t: number): { restarts: number; ago: number } {
  let n = 0, acc = 0, delay = 10;
  while (acc + delay <= t) {
    acc += delay;
    n++;
    delay = Math.min(delay * 2, 300);
  }
  return { restarts: n, ago: t - acc };
}

function resolveEnv(c: Cluster, ns: string, container: Obj): { env: Record<string, string>; error?: string } {
  const env: Record<string, string> = {};
  for (const from of container.envFrom ?? []) {
    if (from.configMapRef) {
      const cm = find(c, 'ConfigMap', ns, from.configMapRef.name);
      if (!cm) {
        if (from.configMapRef.optional) continue;
        return { env, error: `configmap "${from.configMapRef.name}" not found` };
      }
      Object.assign(env, cm.data ?? {});
    }
    if (from.secretRef) {
      const s = find(c, 'Secret', ns, from.secretRef.name);
      if (!s) {
        if (from.secretRef.optional) continue;
        return { env, error: `secret "${from.secretRef.name}" not found` };
      }
      for (const [k, v] of Object.entries(s.data ?? {})) env[k] = b64decode(String(v));
    }
  }
  for (const e of container.env ?? []) {
    if (e.value !== undefined) env[e.name] = String(e.value);
    else if (e.valueFrom?.secretKeyRef) {
      const ref = e.valueFrom.secretKeyRef;
      const s = find(c, 'Secret', ns, ref.name);
      if (!s) return { env, error: `secret "${ref.name}" not found` };
      if (!(ref.key in (s.data ?? {}))) return { env, error: `couldn't find key ${ref.key} in Secret ${ns}/${ref.name}` };
      env[e.name] = b64decode(String(s.data[ref.key]));
    } else if (e.valueFrom?.configMapKeyRef) {
      const ref = e.valueFrom.configMapKeyRef;
      const cm = find(c, 'ConfigMap', ns, ref.name);
      if (!cm) return { env, error: `configmap "${ref.name}" not found` };
      if (!(ref.key in (cm.data ?? {}))) return { env, error: `couldn't find key ${ref.key} in ConfigMap ${ns}/${ref.name}` };
      env[e.name] = String(cm.data[ref.key]);
    } else env[e.name] = '';
  }
  return { env };
}

export const containerEnv = (c: Cluster, ns: string, container: Obj) => resolveEnv(c, ns, container).env;

function podRequests(pod: Obj) {
  let cpu = 0, mem = 0;
  for (const ct of pod.spec?.containers ?? []) {
    cpu += cpuMilli(ct.resources?.requests?.cpu);
    mem += memMi(ct.resources?.requests?.memory) || 0;
  }
  return { cpu, mem };
}

/** Node a pod lands on: spread by name, or null when no node has room. */
function schedule(pod: Obj): { node: string | null; message?: string } {
  const { cpu, mem } = podRequests(pod);
  const short: string[] = [];
  if (cpu > NODE_CPU_M) short.push('Insufficient cpu');
  if (mem > NODE_MEM_MI) short.push('Insufficient memory');
  if (short.length) {
    return {
      node: null,
      message: `0/${NODES.length} nodes are available: ${short.map(s => `${NODES.length} ${s}`).join(', ')}. preemption: 0/${NODES.length} nodes are available: ${NODES.length} No preemption victims found for incoming pod.`,
    };
  }
  return { node: NODES[1 + (hash(nameOf(pod)) % 2)]!.name };
}

/** Works out a pod's status from its spec, the registry and the cluster. Pure: same inputs, same answer. */
export function podState(c: Cluster, pod: Obj): PodState {
  const ns = nsOf(pod);
  const born = createdAt(pod);
  const t = c.now - born;
  const sched = schedule(pod);
  const containers: ContainerState[] = [];
  for (const ct of pod.spec?.containers ?? []) {
    const base: ContainerState = { name: ct.name, image: ct.image, ready: false, restarts: 0, lastRestartAgo: 0, state: 'Running', warnings: [], logs: [] };
    if (!sched.node) {
      containers.push({ ...base, state: 'Pending' });
      continue;
    }
    const info = lookupImage(String(ct.image ?? ''));
    if (!info) {
      const name = String(ct.image ?? '');
      const repo = name.includes(':') ? name.slice(0, name.lastIndexOf(':')) : name;
      const known = tagsOf(repo);
      const why = known.length ? `${name}: not found` : `pull access denied, repository does not exist or may require authorization`;
      containers.push({
        ...base,
        state: 'ImagePullBackOff',
        warnings: [
          { reason: 'Failed', message: `Failed to pull image "${name}": rpc error: code = NotFound desc = failed to pull and unpack image "${name}": ${why}`, first: born + 2, last: c.now, count: Math.max(1, backoff(t).restarts) },
          { reason: 'Failed', message: 'Error: ErrImagePull', first: born + 2, last: c.now, count: Math.max(1, backoff(t).restarts) },
          { reason: 'BackOff', message: `Back-off pulling image "${name}"`, first: born + 12, last: c.now, count: Math.max(1, backoff(t).restarts * 2) },
          { reason: 'Failed', message: 'Error: ImagePullBackOff', first: born + 12, last: c.now, count: Math.max(1, backoff(t).restarts * 2) },
        ],
      });
      continue;
    }
    const resolved = resolveEnv(c, ns, ct);
    if (resolved.error) {
      containers.push({ ...base, state: 'CreateContainerConfigError', warnings: [{ reason: 'Failed', message: `Error: ${resolved.error}`, first: born + 2, last: c.now, count: Math.max(1, Math.floor(t / 15)) }] });
      continue;
    }
    const missing = (info.requires ?? []).find(v => !resolved.env[v]);
    const limit = memMi(ct.resources?.limits?.memory);
    const oom = limit > 0 && limit < info.memoryMi;
    if (missing || oom) {
      const { restarts, ago } = backoff(t);
      const logs = missing ? (info.crash?.(missing) ?? [`fatal: ${missing} is required`]) : info.log.slice(0, 2);
      containers.push({
        ...base,
        state: restarts > 0 ? 'CrashLoopBackOff' : oom ? 'OOMKilled' : 'Error',
        restarts,
        lastRestartAgo: ago,
        lastTerminated: oom ? { reason: 'OOMKilled', exitCode: 137 } : { reason: 'Error', exitCode: 1 },
        logs: restarts > 0 ? logs : logs,
        previousLogs: restarts > 0 ? logs : undefined,
        warnings: restarts > 0 ? [{ reason: 'BackOff', message: `Back-off restarting failed container ${ct.name} in pod ${nameOf(pod)}_${ns}(${uidOf(pod)})`, first: born + 12, last: c.now, count: restarts * 2 + 1 }] : [],
      });
      continue;
    }
    const probe = ct.readinessProbe?.httpGet;
    let ready = true;
    const warnings: ContainerState['warnings'] = [];
    if (probe) {
      const port = Number(probe.port);
      const ip = podIp(pod);
      if (port !== info.port) {
        ready = false;
        warnings.push({ reason: 'Unhealthy', message: `Readiness probe failed: Get "http://${ip}:${port}${probe.path ?? '/'}": dial tcp ${ip}:${port}: connect: connection refused`, first: born + 5, last: c.now, count: Math.max(1, Math.floor(t / 10)) });
      } else if ((probe.path ?? '/') !== info.health) {
        ready = false;
        warnings.push({ reason: 'Unhealthy', message: 'Readiness probe failed: HTTP probe failed with statuscode: 404', first: born + 5, last: c.now, count: Math.max(1, Math.floor(t / 10)) });
      }
    }
    const logs = [...info.log];
    if (!ready && probe) logs.push(`{"level":"warn","msg":"GET ${probe.path ?? '/'} 404 0ms"}`);
    containers.push({ ...base, ready, warnings, logs });
  }
  const waiting = containers.find(x => x.state !== 'Running');
  return {
    phase: sched.node ? 'Running' : 'Pending',
    status: !sched.node ? 'Pending' : waiting ? waiting.state : 'Running',
    node: sched.node,
    containers,
    scheduleMessage: sched.message,
  };
}

export const podReady = (c: Cluster, pod: Obj) => {
  const s = podState(c, pod);
  return s.node !== null && s.containers.length > 0 && s.containers.every(x => x.ready);
};

export function podIp(pod: Obj): string {
  const h = hash(nameOf(pod));
  return `10.42.${h % 3}.${(h >>> 8) % 250 + 3}`;
}

export function uidOf(o: Obj): string {
  const h = (k: string) => hash(`${o.kind}/${nsOf(o)}/${nameOf(o)}/${k}`).toString(16).padStart(8, '0');
  const a = h('a'), b = h('b'), d = h('d');
  return `${a}-${b.slice(0, 4)}-${b.slice(4)}-${d.slice(0, 4)}-${d.slice(4)}${h('e').slice(0, 8)}`;
}

/** What a pod would look like if created now from this template: is it healthy? */
function templateHealthy(c: Cluster, ns: string, template: Obj): boolean {
  const probe = { kind: 'Pod', metadata: { name: 'probe', namespace: ns, creationTimestamp: iso(c.now - 3600) }, spec: template.spec };
  return podReady(c, probe);
}

// ────────────────────────────── controllers ──────────────────────────────

/** The pod-template-hash of a template (labels added by the controller excluded). */
export function templateHash(template: Obj): string {
  const t = clone(template);
  if (t.metadata?.labels) delete t.metadata.labels['pod-template-hash'];
  return safeString(JSON.stringify(t), 10);
}

function event(c: Cluster, ns: string, type: KEvent['type'], reason: string, object: string, message: string, source = 'deployment-controller') {
  c.events.push({ namespace: ns, type, reason, object, message, first: c.now, last: c.now, count: 1, source });
}

const revisionOf = (rs: Obj) => Number(rs.metadata.annotations?.['deployment.kubernetes.io/revision'] ?? 0);

export function replicaSetsOf(c: Cluster, dep: Obj): Obj[] {
  return list(c, 'ReplicaSet', nsOf(dep)).filter(rs => ownerOf(rs)?.kind === 'Deployment' && ownerOf(rs)?.name === nameOf(dep));
}

export function podsOf(c: Cluster, owner: Obj): Obj[] {
  return list(c, 'Pod', nsOf(owner)).filter(p => ownerOf(p)?.name === nameOf(owner) && ownerOf(p)?.kind === owner.kind);
}

export const sortByAge = (xs: Obj[]) => [...xs].sort((a, b) => createdAt(a) - createdAt(b) || nameOf(a).localeCompare(nameOf(b)));

function newPod(c: Cluster, rs: Obj): Obj {
  c.seq++;
  const name = `${nameOf(rs)}-${safeString(`${nameOf(rs)}#${c.seq}`, 5)}`;
  const tpl = rs.spec.template;
  return {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      name,
      namespace: nsOf(rs),
      labels: { ...(tpl.metadata?.labels ?? {}) },
      creationTimestamp: iso(c.now),
      ownerReferences: [{ apiVersion: 'apps/v1', kind: 'ReplicaSet', name: nameOf(rs), controller: true }],
    },
    spec: clone(tpl.spec),
  };
}

function syncReplicaSet(c: Cluster, rs: Obj) {
  const want = Number(rs.spec.replicas ?? 1);
  const pods = sortByAge(podsOf(c, rs));
  if (pods.length > want) {
    // Scale down: unready pods go first, then the newest.
    const order = [...pods].sort((a, b) => Number(podReady(c, a)) - Number(podReady(c, b)) || createdAt(b) - createdAt(a));
    const drop = new Set(order.slice(0, pods.length - want));
    c.objects = c.objects.filter(o => !drop.has(o));
  }
  for (let i = pods.length; i < want; i++) c.objects.push(newPod(c, rs));
}

function reconcileDeployment(c: Cluster, dep: Obj) {
  const ns = nsOf(dep);
  const template = dep.spec.template;
  const h = templateHash(template);
  const all = replicaSetsOf(c, dep);
  let current = all.find(rs => rs.metadata.labels?.['pod-template-hash'] === h);
  const maxRev = Math.max(0, ...all.map(revisionOf));
  const replicas = Number(dep.spec.replicas ?? 1);
  if (!current) {
    const labels = { ...(template.metadata?.labels ?? {}), 'pod-template-hash': h };
    current = {
      apiVersion: 'apps/v1',
      kind: 'ReplicaSet',
      metadata: {
        name: `${nameOf(dep)}-${h}`,
        namespace: ns,
        labels,
        annotations: { 'deployment.kubernetes.io/revision': String(maxRev + 1), ...(dep.metadata.annotations?.['kubernetes.io/change-cause'] ? { 'kubernetes.io/change-cause': dep.metadata.annotations['kubernetes.io/change-cause'] } : {}) },
        creationTimestamp: iso(c.now),
        ownerReferences: [{ apiVersion: 'apps/v1', kind: 'Deployment', name: nameOf(dep), controller: true }],
      },
      spec: {
        replicas: 0,
        selector: { matchLabels: { ...(dep.spec.selector?.matchLabels ?? {}), 'pod-template-hash': h } },
        template: { ...clone(template), metadata: { ...(template.metadata ?? {}), labels } },
      },
    };
    c.objects.push(current);
  } else if (revisionOf(current) !== maxRev) {
    // Rolling back to an old template reuses its ReplicaSet under a new revision number.
    current.metadata.annotations['deployment.kubernetes.io/revision'] = String(maxRev + 1);
  }
  const old = all.filter(rs => rs !== current);
  const oldReady = old.reduce((n, rs) => n + podsOf(c, rs).filter(p => podReady(c, p)).length, 0);
  const healthy = templateHealthy(c, ns, current.spec.template);
  const before = new Map(all.map(rs => [nameOf(rs), Number(rs.spec.replicas ?? 0)]));
  const recreate = dep.spec.strategy?.type === 'Recreate';
  if (healthy || oldReady === 0 || recreate) {
    current.spec.replicas = replicas;
    for (const rs of old) rs.spec.replicas = 0;
  } else {
    // The rollout stalls: maxSurge (25%, at least 1) new pods that never get ready,
    // old pods kept down to maxUnavailable (25%, rounded down).
    const surge = Math.max(1, Math.ceil(replicas * 0.25));
    const unavailable = Math.floor(replicas * 0.25);
    current.spec.replicas = Math.min(replicas, surge + unavailable);
    let keep = replicas - unavailable;
    for (const rs of sortByAge(old).reverse()) {
      const have = Number(rs.spec.replicas ?? 0);
      rs.spec.replicas = Math.min(have, keep);
      keep -= rs.spec.replicas;
    }
  }
  for (const rs of [current, ...old]) {
    const was = before.get(nameOf(rs)) ?? 0;
    const now = Number(rs.spec.replicas);
    if (was !== now) {
      event(c, ns, 'Normal', 'ScalingReplicaSet', `deployment/${nameOf(dep)}`, `Scaled ${now > was ? 'up' : 'down'} replica set ${nameOf(rs)} from ${was} to ${now}`);
    }
    syncReplicaSet(c, rs);
  }
}

/** Brings every controller-owned object in line with its spec. Call after each change. */
export function reconcile(c: Cluster) {
  // Pods whose ReplicaSet is gone (deployment deleted) go too.
  const rsNames = new Set(list(c, 'ReplicaSet').map(rs => `${nsOf(rs)}/${nameOf(rs)}`));
  const depNames = new Set(list(c, 'Deployment').map(d => `${nsOf(d)}/${nameOf(d)}`));
  c.objects = c.objects.filter(o => {
    const owner = ownerOf(o);
    if (o.kind === 'Pod' && owner?.kind === 'ReplicaSet') return rsNames.has(`${nsOf(o)}/${owner.name}`);
    if (o.kind === 'ReplicaSet' && owner?.kind === 'Deployment') return depNames.has(`${nsOf(o)}/${owner.name}`);
    return true;
  });
  for (const dep of list(c, 'Deployment')) reconcileDeployment(c, dep);
  // Objects in a deleted namespace go with it.
  const namespaces = new Set(list(c, 'Namespace').map(nameOf));
  c.objects = c.objects.filter(o => !NAMESPACED.has(o.kind) || namespaces.has(nsOf(o)));
  // Every namespace gets the cluster CA bundle, as on a real cluster.
  for (const ns of list(c, 'Namespace')) {
    if (!find(c, 'ConfigMap', nameOf(ns), 'kube-root-ca.crt')) {
      c.objects.push({
        apiVersion: 'v1', kind: 'ConfigMap',
        metadata: { name: 'kube-root-ca.crt', namespace: nameOf(ns), creationTimestamp: ns.metadata.creationTimestamp },
        data: { 'ca.crt': '-----BEGIN CERTIFICATE-----\nMIIBdzCCAR2gAwIBAgIBADAKBggqhkjOPQQDAjAjMSEwHwYDVQQDDBhrM3Mtc2Vy\n-----END CERTIFICATE-----' },
      });
    }
  }
}

// ────────────────────────────── derived views ──────────────────────────────

export interface DeploymentStatus {
  replicas: number;
  updated: number;
  ready: number;
  available: number;
  /** The rollout is stuck on a template that doesn't become ready. */
  stalled: boolean;
  currentRs: Obj | undefined;
}

export function deploymentStatus(c: Cluster, dep: Obj): DeploymentStatus {
  const sets = replicaSetsOf(c, dep);
  const h = templateHash(dep.spec.template);
  const currentRs = sets.find(rs => rs.metadata.labels?.['pod-template-hash'] === h);
  const pods = sets.flatMap(rs => podsOf(c, rs));
  const ready = pods.filter(p => podReady(c, p)).length;
  const updatedPods = currentRs ? podsOf(c, currentRs) : [];
  const want = Number(dep.spec.replicas ?? 1);
  return {
    replicas: pods.length,
    updated: updatedPods.length,
    ready,
    available: ready,
    stalled: updatedPods.length < want || updatedPods.some(p => !podReady(c, p)),
    currentRs,
  };
}

export function endpointsOf(c: Cluster, svc: Obj): { ip: string; port: number; pod: string; ready: boolean }[] {
  const selector = svc.spec?.selector;
  const out: { ip: string; port: number; pod: string; ready: boolean }[] = [];
  for (const pod of list(c, 'Pod', nsOf(svc))) {
    if (!matches(pod.metadata.labels, selector)) continue;
    const st = podState(c, pod);
    if (!st.node) continue;
    for (const p of svc.spec.ports ?? []) {
      const target = typeof p.targetPort === 'string'
        ? Number(pod.spec.containers?.flatMap((ct: Obj) => ct.ports ?? []).find((cp: Obj) => cp.name === p.targetPort)?.containerPort ?? 0)
        : Number(p.targetPort ?? p.port);
      out.push({ ip: podIp(pod), port: target, pod: nameOf(pod), ready: st.containers.every(x => x.ready) });
    }
  }
  return out.sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));
}

/** Pod events (derived from its state) plus controller events, oldest first. Events older than an hour are gone. */
export function events(c: Cluster, ns?: string): KEvent[] {
  const out: KEvent[] = [];
  for (const pod of list(c, 'Pod', ns)) out.push(...podEvents(c, pod));
  out.push(...c.events.filter(e => ns === undefined || e.namespace === ns));
  return out.filter(e => c.now - e.last <= 3600).sort((a, b) => a.last - b.last || a.first - b.first || a.object.localeCompare(b.object));
}

export function podEvents(c: Cluster, pod: Obj): KEvent[] {
  const ns = nsOf(pod), name = nameOf(pod), born = createdAt(pod);
  const st = podState(c, pod);
  const object = `pod/${name}`;
  const ev = (type: KEvent['type'], reason: string, message: string, first: number, last = first, count = 1, source = 'kubelet'): KEvent =>
    ({ namespace: ns, type, reason, object, message, first, last, count, source });
  if (!st.node) {
    return [ev('Warning', 'FailedScheduling', st.scheduleMessage ?? '', born, c.now, Math.max(1, Math.floor((c.now - born) / 300) + 1), 'default-scheduler')];
  }
  const out = [ev('Normal', 'Scheduled', `Successfully assigned ${ns}/${name} to ${st.node}`, born, born, 1, 'default-scheduler')];
  for (const ct of st.containers) {
    if (ct.state === 'ImagePullBackOff') {
      out.push(ev('Normal', 'Pulling', `Pulling image "${ct.image}"`, born + 1, c.now, Math.max(1, ct.warnings[0]?.count ?? 1)));
    } else {
      out.push(ev('Normal', 'Pulled', `Container image "${ct.image}" already present on machine`, born + 1, ct.restarts ? c.now - ct.lastRestartAgo : born + 1, ct.restarts + 1));
      if (ct.state !== 'CreateContainerConfigError') {
        out.push(ev('Normal', 'Created', `Created container: ${ct.name}`, born + 1, ct.restarts ? c.now - ct.lastRestartAgo : born + 1, ct.restarts + 1));
        out.push(ev('Normal', 'Started', `Started container ${ct.name}`, born + 2, ct.restarts ? c.now - ct.lastRestartAgo : born + 2, ct.restarts + 1));
      }
    }
    for (const w of ct.warnings) out.push(ev(w.reason === 'BackOff' && ct.state === 'ImagePullBackOff' ? 'Normal' : 'Warning', w.reason, w.message, w.first, w.last, w.count));
  }
  return out;
}

// ────────────────────────────── base64 ──────────────────────────────

export const b64encode = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
export function b64decode(s: string): string {
  try {
    return new TextDecoder().decode(Uint8Array.from(atob(s), ch => ch.charCodeAt(0)));
  } catch {
    return s;
  }
}

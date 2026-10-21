/**
 * `kustomize build` for the fields the lessons use: resources (files and
 * other kustomization folders), namespace, namePrefix/nameSuffix, labels and
 * commonLabels, images, replicas, patches (strategic merge and JSON 6902),
 * and configMapGenerator/secretGenerator with their content-hash suffix.
 */

import { parseYaml } from './apply';
import { b64encode, clone, safeString, type Obj } from './cluster';

const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Normalises "overlays/prod/../../base" to "base". */
export function joinPath(dir: string, rel: string): string {
  const parts = [...(dir ? dir.split('/') : []), ...rel.split('/')];
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

// kustomize's legacy output order.
const ORDER = ['Namespace', 'ResourceQuota', 'LimitRange', 'ServiceAccount', 'Role', 'ClusterRole', 'RoleBinding', 'ClusterRoleBinding', 'ConfigMap', 'Secret', 'Service', 'PersistentVolumeClaim', 'Deployment', 'StatefulSet', 'DaemonSet', 'Job', 'CronJob', 'HorizontalPodAutoscaler', 'Ingress', 'HTTPRoute'];
const rank = (k: string) => (ORDER.includes(k) ? ORDER.indexOf(k) : ORDER.length);

function strategic(target: unknown, patch: unknown): unknown {
  if (Array.isArray(patch) && Array.isArray(target) && patch.every(x => isObj(x) && 'name' in x)) {
    const out = target.map(x => clone(x));
    for (const item of patch as Obj[]) {
      const i = out.findIndex(x => isObj(x) && x.name === item.name);
      if (i >= 0) out[i] = strategic(out[i], item);
      else out.push(clone(item));
    }
    return out;
  }
  if (!isObj(patch)) return clone(patch);
  const out: Obj = isObj(target) ? { ...target } : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k];
    else out[k] = strategic(out[k], v);
  }
  return out;
}

function json6902(doc: Obj, ops: Obj[]): Obj {
  const out = clone(doc);
  for (const op of ops) {
    const parts = String(op.path).split('/').slice(1).map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'));
    const last = parts.pop()!;
    let node: unknown = out;
    for (const part of parts) {
      node = Array.isArray(node) ? node[Number(part)] : isObj(node) ? node[part] : undefined;
      if (node === undefined) throw new Error(`patch path ${op.path} does not exist in ${doc.kind}/${doc.metadata?.name}`);
    }
    if (op.op === 'remove') {
      if (Array.isArray(node)) node.splice(Number(last), 1);
      else if (isObj(node)) delete node[last];
    } else if (Array.isArray(node)) {
      if (last === '-') node.push(op.value);
      else if (op.op === 'add') node.splice(Number(last), 0, op.value);
      else node[Number(last)] = op.value;
    } else if (isObj(node)) node[last] = op.value;
  }
  return out;
}

const podSpecOf = (o: Obj): Obj | undefined => (o.kind === 'Pod' ? o.spec : o.spec?.template?.spec);

function build(path: string, files: Record<string, string>, seen: string[]): Obj[] {
  const kfile = ['kustomization.yaml', 'kustomization.yml', 'Kustomization'].map(f => joinPath(path, f)).find(f => files[f] !== undefined);
  if (!kfile) throw new Error(`unable to find one of 'kustomization.yaml', 'kustomization.yml' or 'Kustomization' in directory '${path || '.'}'`);
  if (seen.includes(kfile)) throw new Error(`cycle detected: ${[...seen, kfile].join(' -> ')}`);
  const docs = parseYaml(files[kfile]!);
  if (docs[0]?.error) throw new Error(`${kfile}: ${docs[0].error}`);
  const k = docs[0]?.value;
  if (!isObj(k)) throw new Error(`${kfile} is empty`);
  return apply(k, path, files, [...seen, kfile]);
}

function apply(k: Obj, dir: string, files: Record<string, string>, seen: string[]): Obj[] {
  if (k.bases) throw new Error('"bases" was removed: list folders under "resources" instead');
  let objs: Obj[] = [];
  for (const r of (k.resources ?? []) as unknown[]) {
    const p = joinPath(dir, String(r));
    if (files[p] !== undefined && /\.ya?ml$/.test(p)) {
      for (const d of parseYaml(files[p]!)) {
        if (d.error) throw new Error(`${p}: ${d.error}`);
        if (isObj(d.value)) objs.push(clone(d.value));
      }
    } else if (Object.keys(files).some(f => f.startsWith(`${p}/`))) objs.push(...build(p, files, seen));
    else throw new Error(`accumulating resources: '${p}' doesn't exist (files you can use: ${Object.keys(files).join(', ')})`);
  }
  // Generators: content hash suffix, so a config change rolls the pods.
  const renamed: Record<string, string> = {};
  const gen = (list: unknown, kind: 'ConfigMap' | 'Secret') => {
    for (const g of (Array.isArray(list) ? list : []) as Obj[]) {
      const data: Record<string, string> = {};
      for (const lit of (g.literals ?? []) as string[]) {
        const i = String(lit).indexOf('=');
        if (i < 1) throw new Error(`invalid literal "${lit}": expected KEY=VALUE`);
        data[String(lit).slice(0, i)] = kind === 'Secret' ? b64encode(String(lit).slice(i + 1)) : String(lit).slice(i + 1);
      }
      const hashed = g.options?.disableNameSuffixHash ? g.name : `${g.name}-${safeString(JSON.stringify(data), 10)}`;
      renamed[`${kind}/${g.name}`] = hashed;
      objs.push({ apiVersion: 'v1', kind, metadata: { name: hashed }, ...(kind === 'Secret' ? { type: 'Opaque' } : {}), data });
    }
  };
  gen(k.configMapGenerator, 'ConfigMap');
  gen(k.secretGenerator, 'Secret');
  // Patches.
  for (const p of (k.patches ?? k.patchesStrategicMerge ?? []) as (Obj | string)[]) {
    const text = typeof p === 'string' ? files[joinPath(dir, p)] : p.path ? files[joinPath(dir, p.path)] : p.patch;
    if (text === undefined) throw new Error(`patch file ${typeof p === 'string' ? p : p.path} doesn't exist`);
    const parsed = parseYaml(String(text))[0];
    if (parsed?.error) throw new Error(`patch: ${parsed.error}`);
    const body = parsed?.value;
    const tgt = isObj(p) ? p.target : undefined;
    const hit = (o: Obj) => (tgt ? (!tgt.kind || o.kind === tgt.kind) && (!tgt.name || o.metadata?.name === tgt.name) : isObj(body) && o.kind === body.kind && o.metadata?.name === body.metadata?.name);
    const targets = objs.filter(hit);
    if (!targets.length) throw new Error(`no resource matches patch target ${tgt ? `${tgt.kind ?? '*'}/${tgt.name ?? '*'}` : isObj(body) ? `${body.kind}/${body.metadata?.name}` : ''}`);
    objs = objs.map(o => (hit(o) ? (Array.isArray(body) ? json6902(o, body as Obj[]) : (strategic(o, body) as Obj)) : o));
  }
  // Images.
  for (const img of (k.images ?? []) as Obj[]) {
    for (const o of objs) {
      for (const ct of [...(podSpecOf(o)?.containers ?? []), ...(podSpecOf(o)?.initContainers ?? [])] as Obj[]) {
        const ref = String(ct.image ?? '');
        const at = ref.lastIndexOf(':') > ref.lastIndexOf('/') ? ref.lastIndexOf(':') : ref.length;
        const repo = ref.slice(0, at);
        if (repo !== img.name) continue;
        const tag = img.digest ? `@${img.digest}` : img.newTag !== undefined ? `:${img.newTag}` : ref.slice(at);
        ct.image = `${img.newName ?? repo}${tag}`;
      }
    }
  }
  // Replicas.
  for (const r of (k.replicas ?? []) as Obj[]) {
    const hit = objs.filter(o => o.metadata?.name === r.name && ['Deployment', 'StatefulSet', 'ReplicaSet'].includes(o.kind));
    if (!hit.length) throw new Error(`replicas: no Deployment named "${r.name}"`);
    for (const o of hit) o.spec.replicas = Number(r.count);
  }
  // Labels.
  const addLabels = (pairs: Record<string, string>, selectors: boolean) => {
    for (const o of objs) {
      o.metadata = { ...o.metadata, labels: { ...(o.metadata?.labels ?? {}), ...pairs } };
      if (!selectors) continue;
      if (o.kind === 'Service') o.spec.selector = { ...(o.spec?.selector ?? {}), ...pairs };
      if (o.spec?.selector?.matchLabels) o.spec.selector.matchLabels = { ...o.spec.selector.matchLabels, ...pairs };
      if (o.spec?.template) o.spec.template.metadata = { ...(o.spec.template.metadata ?? {}), labels: { ...(o.spec.template.metadata?.labels ?? {}), ...pairs } };
    }
  };
  if (isObj(k.commonLabels)) addLabels(k.commonLabels as Record<string, string>, true);
  for (const l of (k.labels ?? []) as Obj[]) addLabels(l.pairs ?? {}, Boolean(l.includeSelectors));
  if (isObj(k.commonAnnotations)) for (const o of objs) o.metadata = { ...o.metadata, annotations: { ...(o.metadata?.annotations ?? {}), ...k.commonAnnotations } };
  // Names (and references to generated names).
  const prefix = String(k.namePrefix ?? ''), suffix = String(k.nameSuffix ?? '');
  for (const o of objs) {
    if (o.kind !== 'Namespace' && (prefix || suffix)) {
      const old = o.metadata.name;
      o.metadata.name = `${prefix}${old}${suffix}`;
      if (o.kind === 'ConfigMap' || o.kind === 'Secret') renamed[`${o.kind}/${old}`] = o.metadata.name;
    }
  }
  for (const o of objs) {
    const spec = podSpecOf(o);
    if (!spec) continue;
    for (const ct of (spec.containers ?? []) as Obj[]) {
      for (const f of (ct.envFrom ?? []) as Obj[]) {
        if (f.configMapRef && renamed[`ConfigMap/${f.configMapRef.name}`]) f.configMapRef.name = renamed[`ConfigMap/${f.configMapRef.name}`];
        if (f.secretRef && renamed[`Secret/${f.secretRef.name}`]) f.secretRef.name = renamed[`Secret/${f.secretRef.name}`];
      }
      for (const e of (ct.env ?? []) as Obj[]) {
        const cm = e.valueFrom?.configMapKeyRef, s = e.valueFrom?.secretKeyRef;
        if (cm && renamed[`ConfigMap/${cm.name}`]) cm.name = renamed[`ConfigMap/${cm.name}`];
        if (s && renamed[`Secret/${s.name}`]) s.name = renamed[`Secret/${s.name}`];
      }
    }
    for (const v of (spec.volumes ?? []) as Obj[]) {
      if (v.configMap && renamed[`ConfigMap/${v.configMap.name}`]) v.configMap.name = renamed[`ConfigMap/${v.configMap.name}`];
      if (v.secret && renamed[`Secret/${v.secret.secretName}`]) v.secret.secretName = renamed[`Secret/${v.secret.secretName}`];
    }
  }
  if (k.namespace) for (const o of objs) if (o.kind !== 'Namespace') o.metadata = { ...o.metadata, namespace: k.namespace };
  return objs.sort((a, b) => rank(a.kind) - rank(b.kind) || String(a.metadata?.name).localeCompare(String(b.metadata?.name)));
}

/** Renders a kustomization (the learner's file) with the read-only files next to it. */
export function renderKustomize(k: Obj, files: Record<string, string>, dir = ''): { ok: true; objects: Obj[] } | { ok: false; error: string } {
  try {
    return { ok: true, objects: apply(k, dir, files, [joinPath(dir, 'kustomization.yaml')]) };
  } catch (e) {
    return { ok: false, error: `kustomize build: ${(e as Error).message}` };
  }
}

/**
 * `kubectl apply` for the simulated cluster: validates manifests the way the
 * API server does (with the same error messages for the usual mistakes),
 * fills in defaults, then creates or updates the stored objects.
 */

import { parseAllDocuments } from 'yaml';
import {
  b64encode, clone, find, hash, iso, nameOf, NAMESPACED, nsOf, reconcile, STEP,
  type Cluster, type Obj,
} from './cluster';

/** Kinds the simulator understands, with their API group/version. */
export const KINDS: Record<string, { apiVersion: string; resource: string; group: string }> = {
  Namespace: { apiVersion: 'v1', resource: 'namespace', group: '' },
  Pod: { apiVersion: 'v1', resource: 'pod', group: '' },
  Service: { apiVersion: 'v1', resource: 'service', group: '' },
  ConfigMap: { apiVersion: 'v1', resource: 'configmap', group: '' },
  Secret: { apiVersion: 'v1', resource: 'secret', group: '' },
  Deployment: { apiVersion: 'apps/v1', resource: 'deployment', group: 'apps' },
  ReplicaSet: { apiVersion: 'apps/v1', resource: 'replicaset', group: 'apps' },
};

/** "deployment.apps/web", "service/web". */
export const ref = (o: Obj) => {
  const k = KINDS[o.kind];
  return `${k?.resource ?? String(o.kind).toLowerCase()}${k?.group ? `.${k.group}` : ''}/${nameOf(o)}`;
};

export interface YamlDoc {
  /** Parsed value, or null for an empty document. */
  value: unknown;
  error?: string;
}

/** Splits a YAML stream ("---" separated) into documents, with readable syntax errors. */
export function parseYaml(text: string): YamlDoc[] {
  const docs = parseAllDocuments(text, { prettyErrors: true });
  const list = Array.isArray(docs) ? docs : [docs];
  return list.map(d => {
    const err = d.errors[0];
    if (err) {
      const line = err.linePos?.[0]?.line;
      return { value: null, error: `${line ? `line ${line}: ` : ''}${err.message.split('\n')[0]}` };
    }
    return { value: d.toJS() };
  });
}

const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);

const DNS1123 = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

/** Problems the API server would reject the object for, in its own words. */
export function validate(o: Obj, file = 'manifest.yaml'): string | null {
  if (!o.apiVersion || !o.kind) {
    const missing = [!o.apiVersion && 'apiVersion', !o.kind && 'kind'].filter(Boolean).join(', ');
    return `error: error validating "${file}": error validating data: [${missing} not set]; if you choose to ignore these errors, turn validation off with --validate=false`;
  }
  const k = KINDS[o.kind];
  if (!k) return `error: resource mapping not found for name: "${o.metadata?.name ?? ''}" namespace: "" from "${file}": no matches for kind "${o.kind}" in version "${o.apiVersion}"\nensure CRDs are installed first`;
  if (k.apiVersion !== o.apiVersion) {
    return `error: resource mapping not found for name: "${o.metadata?.name ?? ''}" namespace: "" from "${file}": no matches for kind "${o.kind}" in version "${o.apiVersion}"\nensure CRDs are installed first`;
  }
  const name = o.metadata?.name;
  if (!name) return `error: error when retrieving current configuration of:\nResource: "${k.resource}", Name: "", Namespace: ""\nfrom server for: "${file}": resource name may not be empty`;
  if (!DNS1123.test(String(name)) || String(name).length > 63) {
    return `The ${o.kind} "${name}" is invalid: metadata.name: Invalid value: "${name}": a lowercase RFC 1123 label must consist of lower case alphanumeric characters or '-', and must start and end with an alphanumeric character`;
  }
  const containersErr = (spec: Obj | undefined, at: string) => {
    const cs = spec?.containers;
    if (!Array.isArray(cs) || cs.length === 0) return `The ${o.kind} "${name}" is invalid: ${at}.containers: Required value`;
    for (const [i, ct] of cs.entries()) {
      if (!isObj(ct) || !ct.name) return `The ${o.kind} "${name}" is invalid: ${at}.containers[${i}].name: Required value`;
      if (!ct.image) return `The ${o.kind} "${name}" is invalid: ${at}.containers[${i}].image: Required value`;
      for (const [j, p] of (ct.ports ?? []).entries()) {
        if (!isObj(p) || typeof p.containerPort !== 'number') return `The ${o.kind} "${name}" is invalid: ${at}.containers[${i}].ports[${j}].containerPort: Required value`;
      }
      for (const side of ['requests', 'limits'] as const) {
        for (const [res, q] of Object.entries(ct.resources?.[side] ?? {})) {
          if (!/^\d+(\.\d+)?(m|Ki|Mi|Gi|Ti|K|M|G|k)?$/.test(String(q))) {
            return `The ${o.kind} "${name}" is invalid: ${at}.containers[${i}].resources.${side}[${res}]: Invalid value: "${q}": must be a quantity like 250m, 128Mi or 1Gi`;
          }
        }
      }
    }
    return null;
  };
  if (o.kind === 'Deployment') {
    const sel = o.spec?.selector?.matchLabels;
    const labels = o.spec?.template?.metadata?.labels;
    if (!isObj(sel) || Object.keys(sel).length === 0) return `The Deployment "${name}" is invalid: spec.selector: Required value`;
    const mismatch = Object.entries(sel).some(([key, v]) => labels?.[key] !== v);
    if (mismatch) {
      return `The Deployment "${name}" is invalid: spec.template.metadata.labels: Invalid value: ${JSON.stringify(labels ?? {})}: \`selector\` does not match template \`labels\``;
    }
    return containersErr(o.spec?.template?.spec, 'spec.template.spec');
  }
  if (o.kind === 'Pod') return containersErr(o.spec, 'spec');
  if (o.kind === 'Service') {
    const ports = o.spec?.ports;
    if (!Array.isArray(ports) || ports.length === 0) return `The Service "${name}" is invalid: spec.ports: Required value`;
    for (const [i, p] of ports.entries()) {
      if (!isObj(p) || typeof p.port !== 'number') return `The Service "${name}" is invalid: spec.ports[${i}].port: Required value`;
      if (p.nodePort !== undefined && (p.nodePort < 30000 || p.nodePort > 32767)) {
        return `The Service "${name}" is invalid: spec.ports[${i}].nodePort: Invalid value: ${p.nodePort}: provided port is not in the valid range. The range of valid ports is 30000-32767`;
      }
    }
    const type = o.spec.type ?? 'ClusterIP';
    if (!['ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'].includes(type)) {
      return `The Service "${name}" is invalid: spec.type: Unsupported value: "${type}": supported values: "ClusterIP", "ExternalName", "LoadBalancer", "NodePort"`;
    }
  }
  if (o.kind === 'ConfigMap') {
    for (const [key, v] of Object.entries(o.data ?? {})) {
      if (typeof v !== 'string') return `Error from server (BadRequest): error when creating "${file}": ConfigMap in version "v1" cannot be handled as a ConfigMap: json: cannot unmarshal ${typeof v === 'number' ? 'number' : 'bool'} into Go struct field ConfigMap.data of type string (key "${key}": quote the value)`;
    }
  }
  if (o.kind === 'Secret') {
    for (const [key, v] of Object.entries(o.data ?? {})) {
      if (typeof v !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(v)) {
        return `Error from server (BadRequest): error when creating "${file}": Secret in version "v1" cannot be handled as a Secret: illegal base64 data at input byte 0 (key "${key}": use stringData for plain text)`;
      }
    }
  }
  return null;
}

/** Defaults the API server fills in. */
function defaults(o: Obj, ns: string): Obj {
  const x = clone(o);
  x.metadata = { ...x.metadata };
  if (NAMESPACED.has(x.kind)) x.metadata.namespace = x.metadata.namespace ?? ns;
  else delete x.metadata.namespace;
  if (x.kind === 'Deployment') {
    x.spec.replicas = x.spec.replicas ?? 1;
    x.spec.strategy = x.spec.strategy ?? { type: 'RollingUpdate', rollingUpdate: { maxSurge: '25%', maxUnavailable: '25%' } };
  }
  if (x.kind === 'Service') {
    x.spec = { ...x.spec };
    x.spec.type = x.spec.type ?? 'ClusterIP';
    x.spec.ports = x.spec.ports.map((p: Obj, i: number) => ({
      protocol: 'TCP',
      ...p,
      targetPort: p.targetPort ?? p.port,
      ...(x.spec.type === 'NodePort' || x.spec.type === 'LoadBalancer' ? { nodePort: p.nodePort ?? 30000 + (hash(`${nameOf(x)}:${i}`) % 2768) } : {}),
    }));
    if (!x.spec.clusterIP) {
      const h = hash(`${nsOf(x)}/${nameOf(x)}`);
      x.spec.clusterIP = `10.43.${h % 250}.${(h >>> 8) % 250 + 2}`;
    }
  }
  if (x.kind === 'Secret') {
    x.type = x.type ?? 'Opaque';
    if (x.stringData) {
      x.data = { ...(x.data ?? {}) };
      for (const [k, v] of Object.entries(x.stringData)) x.data[k] = b64encode(String(v));
      delete x.stringData;
    }
  }
  return x;
}

export interface ApplyResult {
  ok: boolean;
  output: string;
}

/** Applies parsed objects; `verb` controls the wording ("created"/"configured"). */
export function applyObjects(c: Cluster, objs: Obj[], opts: { file?: string; mode?: 'apply' | 'create' } = {}): ApplyResult {
  const file = opts.file ?? 'manifest.yaml';
  const lines: string[] = [];
  for (const raw of objs) {
    const err = validate(raw, file);
    if (err) return { ok: false, output: [...lines, err].join('\n') };
    const ns = raw.metadata?.namespace ?? c.namespace;
    if (NAMESPACED.has(raw.kind) && raw.kind !== 'Namespace' && !find(c, 'Namespace', '', ns)) {
      return { ok: false, output: [...lines, `Error from server (NotFound): error when creating "${file}": namespaces "${ns}" not found`].join('\n') };
    }
    const obj = defaults(raw, ns);
    const existing = find(c, obj.kind, nsOf(obj), nameOf(obj));
    if (existing) {
      if (opts.mode === 'create') return { ok: false, output: [...lines, `Error from server (AlreadyExists): ${KINDS[obj.kind]!.resource}s "${nameOf(obj)}" already exists`].join('\n') };
      const keep = { creationTimestamp: existing.metadata.creationTimestamp };
      const same = JSON.stringify({ ...existing, metadata: { ...existing.metadata, ...keep } }) === JSON.stringify({ ...obj, metadata: { ...obj.metadata, ...keep } });
      if (obj.kind === 'Service') obj.spec.clusterIP = existing.spec.clusterIP;
      Object.assign(obj.metadata, keep);
      c.objects[c.objects.indexOf(existing)] = obj;
      lines.push(`${ref(obj)} ${same ? 'unchanged' : 'configured'}`);
    } else {
      obj.metadata.creationTimestamp = iso(c.now);
      c.objects.push(obj);
      lines.push(`${ref(obj)} created`);
    }
  }
  reconcile(c);
  c.now += STEP;
  return { ok: true, output: lines.join('\n') };
}

/** `kubectl apply -f` with YAML text. */
export function applyYaml(c: Cluster, text: string, file = 'manifest.yaml'): ApplyResult {
  const docs = parseYaml(text);
  const bad = docs.find(d => d.error);
  if (bad) return { ok: false, output: `error: error parsing ${file}: error converting YAML to JSON: yaml: ${bad.error}` };
  const objs = docs.map(d => d.value).filter(v => v !== null && v !== undefined);
  if (objs.length === 0) return { ok: false, output: `error: no objects passed to apply` };
  const notObj = objs.find(v => !isObj(v));
  if (notObj !== undefined) return { ok: false, output: `error: error validating "${file}": error validating data: invalid object: the top level must be a mapping (key: value), not a ${Array.isArray(notObj) ? 'list' : typeof notObj}` };
  return applyObjects(c, objs as Obj[], { file });
}

// ─────────────────── builders (fixtures and `kubectl create`) ───────────────────

export interface ContainerOpts {
  name?: string;
  image: string;
  port?: number;
  env?: Record<string, string>;
  envFrom?: { configMap?: string; secret?: string }[];
  secretEnv?: { name: string; secret: string; key: string }[];
  requests?: { cpu?: string; memory?: string };
  limits?: { cpu?: string; memory?: string };
  readiness?: { path: string; port: number };
}

export function container(o: ContainerOpts, fallbackName: string): Obj {
  const ct: Obj = { name: o.name ?? fallbackName, image: o.image };
  if (o.port) ct.ports = [{ containerPort: o.port }];
  if (o.envFrom?.length) ct.envFrom = o.envFrom.map(f => (f.configMap ? { configMapRef: { name: f.configMap } } : { secretRef: { name: f.secret } }));
  const env = [
    ...Object.entries(o.env ?? {}).map(([name, value]) => ({ name, value })),
    ...(o.secretEnv ?? []).map(s => ({ name: s.name, valueFrom: { secretKeyRef: { name: s.secret, key: s.key } } })),
  ];
  if (env.length) ct.env = env;
  if (o.requests || o.limits) ct.resources = { ...(o.requests ? { requests: o.requests } : {}), ...(o.limits ? { limits: o.limits } : {}) };
  if (o.readiness) ct.readinessProbe = { httpGet: { path: o.readiness.path, port: o.readiness.port }, periodSeconds: 10 };
  return ct;
}

export function deployment(name: string, ns: string, opts: { replicas?: number; labels?: Record<string, string>; containers: ContainerOpts[] }): Obj {
  const labels = opts.labels ?? { app: name };
  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: { name, namespace: ns, labels: { ...labels } },
    spec: {
      replicas: opts.replicas ?? 1,
      selector: { matchLabels: { app: labels.app ?? name } },
      template: { metadata: { labels: { ...labels } }, spec: { containers: opts.containers.map(ct => container(ct, name)) } },
    },
  };
}

export function service(name: string, ns: string, opts: { selector: Record<string, string>; port: number; targetPort?: number; type?: string; nodePort?: number }): Obj {
  return {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name, namespace: ns },
    spec: {
      ...(opts.type ? { type: opts.type } : {}),
      selector: opts.selector,
      ports: [{ port: opts.port, targetPort: opts.targetPort ?? opts.port, ...(opts.nodePort ? { nodePort: opts.nodePort } : {}) }],
    },
  };
}

export const configMap = (name: string, ns: string, data: Record<string, string>): Obj =>
  ({ apiVersion: 'v1', kind: 'ConfigMap', metadata: { name, namespace: ns }, data });

export const secret = (name: string, ns: string, data: Record<string, string>): Obj =>
  ({ apiVersion: 'v1', kind: 'Secret', metadata: { name, namespace: ns }, type: 'Opaque', stringData: data });

export const namespace = (name: string): Obj => ({ apiVersion: 'v1', kind: 'Namespace', metadata: { name } });

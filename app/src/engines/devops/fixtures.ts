/**
 * The clusters exercises start from. Each one is built by replaying history
 * on a fresh cluster (install, then releases days ago, then the incident a
 * few minutes ago), so ages, ReplicaSets, rollout history and events look
 * like a cluster that has been running for a week.
 *
 *   empty         a new k3d cluster: system pods only
 *   shop          ShipIt (api, web, worker, redis) in "shop", Prometheus and Grafana in "monitoring"
 *   image-typo    shop, after a web release with a tag that doesn't exist
 *   missing-env   shop, after a worker release that lost its config
 *   pending       shop, plus a reports deployment that asks for more CPU than any node has
 *   no-endpoints  shop, after the api Service selector was changed by mistake
 *   oom           shop, after the worker memory limit was cut too low
 *   readiness     shop, after an api release whose readiness probe checks the wrong path
 *   config-typo   shop, after the worker was pointed at a ConfigMap name with a typo
 */

import { configMap, deployment, namespace, secret, service, applyObjects } from './apply';
import { find, iso, NODES, reconcile, START, type Cluster, type Obj } from './cluster';

export type ClusterId = 'empty' | 'shop' | 'image-typo' | 'missing-env' | 'pending' | 'no-endpoints' | 'oom' | 'readiness' | 'config-typo';

export const CLUSTERS: Record<ClusterId, string> = {
  empty: 'A new k3d cluster: three nodes and the system pods, nothing else.',
  shop: 'ShipIt running in the shop namespace (api, web, worker, redis), monitoring in monitoring.',
  'image-typo': 'ShipIt, a few minutes after a web release.',
  'missing-env': 'ShipIt, a few minutes after a worker release.',
  pending: 'ShipIt, plus a new reports deployment.',
  'no-endpoints': 'ShipIt, a few minutes after someone tidied up the api Service.',
  oom: 'ShipIt, a few minutes after the worker\'s resources were tuned.',
  readiness: 'ShipIt, a few minutes after api 1.5.0 was released.',
  'config-typo': 'ShipIt, a few minutes after the worker\'s config was refactored.',
};

const DAY = 86400;

function at(c: Cluster, t: number, objs: Obj[]) {
  c.now = t;
  const r = applyObjects(c, objs);
  if (!r.ok) throw new Error(`fixture: ${r.output}`);
}

/** Changes a deployment the way `kubectl set image` / `patch` would, at time t. */
function change(c: Cluster, t: number, ns: string, name: string, fn: (d: Obj) => void, cause?: string) {
  c.now = t;
  const d = find(c, 'Deployment', ns, name);
  if (!d) throw new Error(`fixture: no deployment ${ns}/${name}`);
  fn(d);
  if (cause) d.metadata.annotations = { ...(d.metadata.annotations ?? {}), 'kubernetes.io/change-cause': cause };
  reconcile(c);
}

function base(): Cluster {
  const c: Cluster = { now: START - 6 * DAY, namespace: 'default', objects: [], events: [], seq: 0 };
  for (const n of NODES) {
    c.objects.push({ apiVersion: 'v1', kind: 'Node', metadata: { name: n.name, labels: { 'kubernetes.io/hostname': n.name }, creationTimestamp: iso(c.now) } });
  }
  at(c, START - 6 * DAY, [namespace('default'), namespace('kube-system'), namespace('kube-public'), namespace('kube-node-lease')]);
  at(c, START - 6 * DAY + 30, [
    deployment('coredns', 'kube-system', { labels: { 'k8s-app': 'kube-dns', app: 'coredns' }, containers: [{ image: 'rancher/mirrored-coredns-coredns:1.12.3', port: 53, requests: { cpu: '100m', memory: '70Mi' }, limits: { memory: '170Mi' } }] }),
    deployment('local-path-provisioner', 'kube-system', { containers: [{ image: 'rancher/local-path-provisioner:v0.0.32' }] }),
    deployment('metrics-server', 'kube-system', { labels: { 'k8s-app': 'metrics-server', app: 'metrics-server' }, containers: [{ image: 'rancher/mirrored-metrics-server:v0.8.0', port: 10250, requests: { cpu: '100m', memory: '70Mi' } }] }),
    service('kube-dns', 'kube-system', { selector: { 'k8s-app': 'kube-dns' }, port: 53 }),
    service('metrics-server', 'kube-system', { selector: { 'k8s-app': 'metrics-server' }, port: 443, targetPort: 10250 }),
  ]);
  return c;
}

function apiContainer(image: string, extra: Partial<Parameters<typeof deployment>[2]['containers'][number]> = {}) {
  return {
    name: 'api',
    image,
    port: 8000,
    envFrom: [{ configMap: 'api-config' }],
    secretEnv: [{ name: 'DATABASE_URL', secret: 'api-secrets', key: 'DATABASE_URL' }],
    requests: { cpu: '100m', memory: '128Mi' },
    limits: { memory: '256Mi' },
    readiness: { path: '/health', port: 8000 },
    ...extra,
  };
}

function shop(): Cluster {
  const c = base();
  const t0 = START - 5 * DAY;
  at(c, t0, [namespace('shop'), namespace('monitoring')]);
  at(c, t0 + 60, [
    configMap('api-config', 'shop', { LOG_LEVEL: 'info', REDIS_URL: 'redis://redis:6379/0', ORDERS_PAGE_SIZE: '50' }),
    secret('api-secrets', 'shop', { DATABASE_URL: 'postgres://shipit:s3cret-dev@shipit-db-rw:5432/shipit' }),
    deployment('redis', 'shop', { labels: { app: 'redis', tier: 'data' }, containers: [{ image: 'redis:7.4', port: 6379, requests: { cpu: '50m', memory: '64Mi' } }] }),
    service('redis', 'shop', { selector: { app: 'redis' }, port: 6379 }),
  ]);
  const api = deployment('api', 'shop', { replicas: 3, labels: { app: 'api', tier: 'backend' }, containers: [apiContainer('ghcr.io/msaouab/shipit-api:1.3.0')] });
  api.metadata.annotations = { 'kubernetes.io/change-cause': 'release 1.3.0' };
  const web = deployment('web', 'shop', {
    replicas: 2, labels: { app: 'web', tier: 'frontend' },
    containers: [{ image: 'ghcr.io/msaouab/shipit-web:2.0.0', port: 3000, env: { API_URL: 'http://api' }, requests: { cpu: '50m', memory: '96Mi' }, limits: { memory: '192Mi' }, readiness: { path: '/', port: 3000 } }],
  });
  web.metadata.annotations = { 'kubernetes.io/change-cause': 'release 2.0.0' };
  const worker = deployment('worker', 'shop', {
    labels: { app: 'worker', tier: 'backend' },
    containers: [{ image: 'ghcr.io/msaouab/shipit-worker:1.4.0', envFrom: [{ configMap: 'api-config' }], requests: { cpu: '100m', memory: '128Mi' }, limits: { memory: '384Mi' } }],
  });
  worker.spec.strategy = { type: 'Recreate' };
  at(c, t0 + 120, [
    api, web, worker,
    service('api', 'shop', { selector: { app: 'api' }, port: 80, targetPort: 8000 }),
    service('web', 'shop', { selector: { app: 'web' }, port: 80, targetPort: 3000, type: 'NodePort', nodePort: 30080 }),
  ]);
  at(c, t0 + 300, [
    deployment('prometheus', 'monitoring', { containers: [{ image: 'prom/prometheus:v3.5.0', port: 9090, requests: { cpu: '200m', memory: '400Mi' } }] }),
    deployment('grafana', 'monitoring', { containers: [{ image: 'grafana/grafana:12.1.0', port: 3000, requests: { cpu: '100m', memory: '128Mi' } }] }),
    service('prometheus', 'monitoring', { selector: { app: 'prometheus' }, port: 9090 }),
    service('grafana', 'monitoring', { selector: { app: 'grafana' }, port: 80, targetPort: 3000 }),
  ]);
  change(c, START - 4 * DAY, 'shop', 'api', d => { d.spec.template.spec.containers[0].image = 'ghcr.io/msaouab/shipit-api:1.3.2'; }, 'hotfix 1.3.2: retry the redis connection');
  change(c, START - 2 * DAY, 'shop', 'api', d => { d.spec.template.spec.containers[0].image = 'ghcr.io/msaouab/shipit-api:1.4.0'; }, 'release 1.4.0: order search');
  change(c, START - 2 * DAY + 600, 'shop', 'web', d => { d.spec.template.spec.containers[0].image = 'ghcr.io/msaouab/shipit-web:2.1.0'; }, 'release 2.1.0');
  return c;
}

const INCIDENT = START - 12 * 60;

const BUILDERS: Record<ClusterId, () => Cluster> = {
  empty: base,
  shop,
  'image-typo': () => {
    const c = shop();
    change(c, INCIDENT, 'shop', 'web', d => { d.spec.template.spec.containers[0].image = 'ghcr.io/msaouab/shipit-web:2.1.1'; }, 'release 2.1.1: checkout button colour');
    return c;
  },
  'missing-env': () => {
    const c = shop();
    change(c, INCIDENT, 'shop', 'worker', d => {
      const ct = d.spec.template.spec.containers[0];
      ct.image = 'ghcr.io/msaouab/shipit-worker:1.5.0';
      delete ct.envFrom;
      ct.env = [{ name: 'LOG_LEVEL', value: 'info' }];
    }, 'release 1.5.0: explicit env');
    return c;
  },
  pending: () => {
    const c = shop();
    c.now = INCIDENT;
    const reports = deployment('reports', 'shop', {
      labels: { app: 'reports', tier: 'backend' },
      containers: [{ image: 'ghcr.io/msaouab/shipit-worker:1.5.0', envFrom: [{ configMap: 'api-config' }], requests: { cpu: '4', memory: '256Mi' }, limits: { memory: '512Mi' } }],
    });
    at(c, INCIDENT, [reports]);
    return c;
  },
  'no-endpoints': () => {
    const c = shop();
    c.now = INCIDENT;
    const svc = find(c, 'Service', 'shop', 'api')!;
    svc.spec.selector = { app: 'api-server' };
    reconcile(c);
    return c;
  },
  oom: () => {
    const c = shop();
    change(c, INCIDENT, 'shop', 'worker', d => { d.spec.template.spec.containers[0].resources = { requests: { cpu: '100m', memory: '64Mi' }, limits: { memory: '128Mi' } }; });
    return c;
  },
  readiness: () => {
    const c = shop();
    change(c, INCIDENT, 'shop', 'api', d => {
      const ct = d.spec.template.spec.containers[0];
      ct.image = 'ghcr.io/msaouab/shipit-api:1.5.0';
      ct.readinessProbe.httpGet.path = '/healthz';
    }, 'release 1.5.0: switch probes to /healthz');
    return c;
  },
  'config-typo': () => {
    const c = shop();
    change(c, INCIDENT, 'shop', 'worker', d => { d.spec.template.spec.containers[0].envFrom = [{ configMapRef: { name: 'api-confg' } }]; });
    return c;
  },
};

const cache = new Map<ClusterId, string>();

/** A fresh copy of a fixture cluster, with the clock at START. */
export function makeCluster(id: ClusterId): Cluster {
  let frozen = cache.get(id);
  if (!frozen) {
    const c = BUILDERS[id]();
    c.now = START;
    frozen = JSON.stringify(c);
    cache.set(id, frozen);
  }
  return JSON.parse(frozen) as Cluster;
}

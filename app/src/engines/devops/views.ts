/**
 * How kubectl shows objects: aligned tables, full API objects (status
 * included) for -o yaml/json/jsonpath, and `describe` text.
 */

import {
  age, clone, createdAt, deploymentStatus, endpointsOf, events, K8S_VERSION, list, nameOf, NODES, NODE_CPU_M, NODE_MEM_MI,
  nsOf, ownerOf, podIp, podState, podsOf, replicaSetsOf, uidOf, iso, b64decode, cpuMilli, memMi,
  type Cluster, type KEvent, type Obj,
} from './cluster';
import { KINDS, ref } from './apply';
import { lookupImage } from './registry';

/** kubectl's table layout: left aligned, three spaces between columns, no trailing spaces. */
export function table(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map(r => (r[i] ?? '').length)));
  const line = (cells: string[]) => cells.map((c, i) => (i === cells.length - 1 ? c : c.padEnd(widths[i]! + 3))).join('').trimEnd();
  return [line(header), ...rows.map(line)].join('\n');
}

const labelsText = (l: Record<string, string> | undefined) => (l && Object.keys(l).length ? Object.entries(l).map(([k, v]) => `${k}=${v}`).join(',') : '<none>');
const ago = (c: Cluster, o: Obj) => age(c.now - createdAt(o));

export function restartsText(c: Cluster, pod: Obj): string {
  const st = podState(c, pod);
  const n = st.containers.reduce((a, x) => a + x.restarts, 0);
  const last = st.containers.find(x => x.restarts > 0);
  return last ? `${n} (${age(last.lastRestartAgo)} ago)` : String(n);
}

export interface Column {
  header: string;
  get: (o: Obj) => string;
  wide?: boolean;
}

export function columns(c: Cluster, kind: string): Column[] {
  switch (kind) {
    case 'Pod':
      return [
        { header: 'NAME', get: nameOf },
        { header: 'READY', get: p => { const s = podState(c, p); return `${s.containers.filter(x => x.ready).length}/${s.containers.length}`; } },
        { header: 'STATUS', get: p => podState(c, p).status },
        { header: 'RESTARTS', get: p => restartsText(c, p) },
        { header: 'AGE', get: p => ago(c, p) },
        { header: 'IP', get: p => (podState(c, p).node ? podIp(p) : '<none>'), wide: true },
        { header: 'NODE', get: p => podState(c, p).node ?? '<none>', wide: true },
        { header: 'NOMINATED NODE', get: () => '<none>', wide: true },
        { header: 'READINESS GATES', get: () => '<none>', wide: true },
      ];
    case 'Deployment':
      return [
        { header: 'NAME', get: nameOf },
        { header: 'READY', get: d => `${deploymentStatus(c, d).ready}/${d.spec.replicas ?? 1}` },
        { header: 'UP-TO-DATE', get: d => String(deploymentStatus(c, d).updated) },
        { header: 'AVAILABLE', get: d => String(deploymentStatus(c, d).available) },
        { header: 'AGE', get: d => ago(c, d) },
        { header: 'CONTAINERS', get: d => d.spec.template.spec.containers.map((x: Obj) => x.name).join(','), wide: true },
        { header: 'IMAGES', get: d => d.spec.template.spec.containers.map((x: Obj) => x.image).join(','), wide: true },
        { header: 'SELECTOR', get: d => labelsText(d.spec.selector?.matchLabels), wide: true },
      ];
    case 'ReplicaSet':
      return [
        { header: 'NAME', get: nameOf },
        { header: 'DESIRED', get: rs => String(rs.spec.replicas ?? 0) },
        { header: 'CURRENT', get: rs => String(podsOf(c, rs).length) },
        { header: 'READY', get: rs => String(podsOf(c, rs).filter(p => podState(c, p).containers.every(x => x.ready) && podState(c, p).node).length) },
        { header: 'AGE', get: rs => ago(c, rs) },
        { header: 'CONTAINERS', get: rs => rs.spec.template.spec.containers.map((x: Obj) => x.name).join(','), wide: true },
        { header: 'IMAGES', get: rs => rs.spec.template.spec.containers.map((x: Obj) => x.image).join(','), wide: true },
        { header: 'SELECTOR', get: rs => labelsText(rs.spec.selector?.matchLabels), wide: true },
      ];
    case 'Service':
      return [
        { header: 'NAME', get: nameOf },
        { header: 'TYPE', get: s => s.spec.type ?? 'ClusterIP' },
        { header: 'CLUSTER-IP', get: s => s.spec.clusterIP },
        { header: 'EXTERNAL-IP', get: s => (s.spec.type === 'LoadBalancer' ? '<pending>' : '<none>') },
        { header: 'PORT(S)', get: s => s.spec.ports.map((p: Obj) => `${p.port}${p.nodePort ? `:${p.nodePort}` : ''}/${p.protocol ?? 'TCP'}`).join(',') },
        { header: 'AGE', get: s => ago(c, s) },
        { header: 'SELECTOR', get: s => labelsText(s.spec.selector), wide: true },
      ];
    case 'Node':
      return [
        { header: 'NAME', get: nameOf },
        { header: 'STATUS', get: () => 'Ready' },
        { header: 'ROLES', get: n => NODES.find(x => x.name === nameOf(n))?.role ?? '<none>' },
        { header: 'AGE', get: n => ago(c, n) },
        { header: 'VERSION', get: () => K8S_VERSION },
        { header: 'INTERNAL-IP', get: n => NODES.find(x => x.name === nameOf(n))?.ip ?? '', wide: true },
        { header: 'EXTERNAL-IP', get: () => '<none>', wide: true },
        { header: 'OS-IMAGE', get: () => 'K3s v1.36.5+k3s1', wide: true },
        { header: 'KERNEL-VERSION', get: () => '6.10.14-linuxkit', wide: true },
        { header: 'CONTAINER-RUNTIME', get: () => 'containerd://2.1.4-k3s1', wide: true },
      ];
    case 'Namespace':
      return [{ header: 'NAME', get: nameOf }, { header: 'STATUS', get: () => 'Active' }, { header: 'AGE', get: n => ago(c, n) }];
    case 'ConfigMap':
      return [{ header: 'NAME', get: nameOf }, { header: 'DATA', get: m => String(Object.keys(m.data ?? {}).length) }, { header: 'AGE', get: m => ago(c, m) }];
    case 'Secret':
      return [
        { header: 'NAME', get: nameOf },
        { header: 'TYPE', get: s => s.type ?? 'Opaque' },
        { header: 'DATA', get: s => String(Object.keys(s.data ?? {}).length) },
        { header: 'AGE', get: s => ago(c, s) },
      ];
    case 'Endpoints':
      return [
        { header: 'NAME', get: nameOf },
        {
          header: 'ENDPOINTS',
          get: s => {
            const eps = endpointsOf(c, s).filter(e => e.ready).map(e => `${e.ip}:${e.port}`);
            if (!eps.length) return '<none>';
            return eps.length > 3 ? `${eps.slice(0, 3).join(',')} + ${eps.length - 3} more...` : eps.join(',');
          },
        },
        { header: 'AGE', get: s => ago(c, s) },
      ];
    default:
      return [{ header: 'NAME', get: nameOf }, { header: 'AGE', get: o => ago(c, o) }];
  }
}

export function eventsTable(c: Cluster, evs: KEvent[], withNs: boolean): string {
  const header = [...(withNs ? ['NAMESPACE'] : []), 'LAST SEEN', 'TYPE', 'REASON', 'OBJECT', 'MESSAGE'];
  return table(header, evs.map(e => [...(withNs ? [e.namespace] : []), age(c.now - e.last), e.type, e.reason, e.object, e.message]));
}

// ────────────────────────────── API objects ──────────────────────────────

/** The object as the API server returns it: metadata filled in, status computed. */
export function apiObject(c: Cluster, o: Obj): Obj {
  const x = clone(o);
  x.metadata = { ...x.metadata, uid: uidOf(o) };
  if (o.kind === 'Pod') {
    const st = podState(c, o);
    x.status = {
      phase: st.phase,
      ...(st.node ? { hostIP: NODES.find(n => n.name === st.node)?.ip, podIP: podIp(o) } : {}),
      startTime: o.metadata.creationTimestamp,
      conditions: [
        { type: 'PodScheduled', status: st.node ? 'True' : 'False', ...(st.node ? {} : { reason: 'Unschedulable', message: st.scheduleMessage }) },
        ...(st.node ? [
          { type: 'Initialized', status: 'True' },
          { type: 'ContainersReady', status: st.containers.every(ct => ct.ready) ? 'True' : 'False' },
          { type: 'Ready', status: st.containers.every(ct => ct.ready) ? 'True' : 'False' },
        ] : []),
      ],
      ...(st.node ? {
        containerStatuses: st.containers.map(ct => ({
          name: ct.name,
          image: ct.image,
          ready: ct.ready,
          restartCount: ct.restarts,
          started: ct.state === 'Running',
          state: ct.state === 'Running' ? { running: { startedAt: iso(c.now - (ct.restarts ? ct.lastRestartAgo : c.now - createdAt(o))) } } : { waiting: { reason: ct.state } },
          ...(ct.lastTerminated ? { lastState: { terminated: { reason: ct.lastTerminated.reason, exitCode: ct.lastTerminated.exitCode } } } : {}),
        })),
      } : {}),
    };
    if (st.node) x.spec = { ...x.spec, nodeName: st.node };
  }
  if (o.kind === 'Deployment') {
    const s = deploymentStatus(c, o);
    x.metadata.annotations = { 'deployment.kubernetes.io/revision': s.currentRs?.metadata.annotations?.['deployment.kubernetes.io/revision'] ?? '1', ...(x.metadata.annotations ?? {}) };
    x.status = {
      replicas: s.replicas,
      updatedReplicas: s.updated,
      readyReplicas: s.ready,
      availableReplicas: s.available,
      ...(s.replicas - s.available > 0 ? { unavailableReplicas: s.replicas - s.available } : {}),
      conditions: [
        { type: 'Available', status: s.available >= (o.spec.replicas ?? 1) - Math.floor((o.spec.replicas ?? 1) * 0.25) ? 'True' : 'False' },
        { type: 'Progressing', status: s.stalled && s.currentRs && c.now - createdAt(s.currentRs) > 600 ? 'False' : 'True', reason: s.stalled ? (s.currentRs && c.now - createdAt(s.currentRs) > 600 ? 'ProgressDeadlineExceeded' : 'ReplicaSetUpdated') : 'NewReplicaSetAvailable' },
      ],
    };
  }
  if (o.kind === 'ReplicaSet') {
    const pods = podsOf(c, o);
    x.status = { replicas: pods.length, readyReplicas: pods.filter(p => podState(c, p).containers.every(ct => ct.ready) && podState(c, p).node).length };
  }
  if (o.kind === 'Namespace') x.status = { phase: 'Active' };
  if (o.kind === 'Node') {
    x.status = {
      capacity: { cpu: String(NODE_CPU_M / 1000), memory: `${NODE_MEM_MI}Mi`, pods: '110' },
      allocatable: { cpu: String(NODE_CPU_M / 1000), memory: `${NODE_MEM_MI}Mi`, pods: '110' },
      nodeInfo: { kubeletVersion: K8S_VERSION, containerRuntimeVersion: 'containerd://2.1.4-k3s1', osImage: 'K3s v1.36.5+k3s1' },
      addresses: [{ type: 'InternalIP', address: NODES.find(n => n.name === nameOf(o))?.ip }],
      conditions: [{ type: 'Ready', status: 'True', reason: 'KubeletReady' }],
    };
  }
  return x;
}

export const listObject = (c: Cluster, items: Obj[]): Obj => ({ apiVersion: 'v1', kind: 'List', items: items.map(o => apiObject(c, o)), metadata: { resourceVersion: '' } });

// ────────────────────────────── describe ──────────────────────────────

function kv(rows: [string, string | undefined][], indent = '', width?: number): string {
  const w = width ?? Math.max(...rows.map(([k]) => k.length)) + 2;
  return rows.filter(([, v]) => v !== undefined).map(([k, v]) => `${indent}${`${k}:`.padEnd(w)}${v}`).join('\n');
}

const labelBlock = (l: Record<string, string> | undefined, pad: number) => {
  const entries = Object.entries(l ?? {});
  if (!entries.length) return '<none>';
  return entries.map(([k, v], i) => (i ? ' '.repeat(pad) : '') + `${k}=${v}`).join('\n');
};

function eventsBlock(c: Cluster, object: string, ns: string): string {
  const evs = events(c, ns).filter(e => e.object === object);
  if (!evs.length) return 'Events:  <none>';
  const rows = evs.map(e => {
    const span = e.count > 1 ? `${age(c.now - e.last)} (x${e.count} over ${age(c.now - e.first)})` : age(c.now - e.last);
    return [e.type, e.reason, span, e.source, e.message];
  });
  const t = table(['Type', 'Reason', 'Age', 'From', 'Message'], [['----', '------', '----', '----', '-------'], ...rows]);
  return `Events:\n${t.split('\n').map(l => `  ${l}`).join('\n')}`;
}

function containerBlock(ct: Obj, state?: ReturnType<typeof podState>['containers'][number]): string {
  const lines = [`  ${ct.name}:`];
  const rows: [string, string | undefined][] = [
    ['Image', ct.image],
    ['Port', ct.ports?.length ? ct.ports.map((p: Obj) => `${p.containerPort}/TCP`).join(', ') : '<none>'],
  ];
  const out = [kv(rows, '    ', 16)];
  if (state) {
    if (state.state === 'Running') out.push(kv([['State', 'Running']], '    ', 16));
    else out.push(`${kv([['State', 'Waiting']], '    ', 16)}\n${kv([['Reason', state.state]], '      ', 14)}`);
    if (state.lastTerminated) {
      out.push(`${kv([['Last State', 'Terminated']], '    ', 16)}\n${kv([['Reason', state.lastTerminated.reason], ['Exit Code', String(state.lastTerminated.exitCode)]], '      ', 14)}`);
    }
    out.push(kv([['Ready', state.ready ? 'True' : 'False'], ['Restart Count', String(state.restarts)]], '    ', 16));
  }
  for (const side of ['limits', 'requests'] as const) {
    const r = ct.resources?.[side];
    if (r && Object.keys(r).length) {
      out.push(`    ${side === 'limits' ? 'Limits' : 'Requests'}:\n${Object.entries(r).map(([k, v]) => `      ${`${k}:`.padEnd(8)}${v}`).join('\n')}`);
    }
  }
  const probe = ct.readinessProbe?.httpGet;
  if (probe) out.push(kv([['Readiness', `http-get http://:${probe.port}${probe.path ?? '/'} delay=${ct.readinessProbe.initialDelaySeconds ?? 0}s timeout=1s period=${ct.readinessProbe.periodSeconds ?? 10}s #success=1 #failure=3`]], '    ', 16));
  const live = ct.livenessProbe?.httpGet;
  if (live) out.push(kv([['Liveness', `http-get http://:${live.port}${live.path ?? '/'} delay=${ct.livenessProbe.initialDelaySeconds ?? 0}s timeout=1s period=${ct.livenessProbe.periodSeconds ?? 10}s #success=1 #failure=3`]], '    ', 16));
  if (ct.envFrom?.length) {
    out.push(`    Environment Variables from:\n${ct.envFrom.map((f: Obj) => f.configMapRef ? `      ${f.configMapRef.name}  ConfigMap  Optional: ${Boolean(f.configMapRef.optional)}` : `      ${f.secretRef?.name}  Secret  Optional: ${Boolean(f.secretRef?.optional)}`).join('\n')}`);
  }
  const env = (ct.env ?? []).map((e: Obj) => {
    const v = e.value !== undefined ? String(e.value)
      : e.valueFrom?.secretKeyRef ? `<set to the key '${e.valueFrom.secretKeyRef.key}' in secret '${e.valueFrom.secretKeyRef.name}'>  Optional: false`
        : e.valueFrom?.configMapKeyRef ? `<set to the key '${e.valueFrom.configMapKeyRef.key}' of config map '${e.valueFrom.configMapKeyRef.name}'>  Optional: false` : '';
    return `      ${e.name}:  ${v}`;
  });
  out.push(env.length ? `    Environment:\n${env.join('\n')}` : '    Environment:      <none>');
  return [...lines, ...out].join('\n');
}

export function describe(c: Cluster, o: Obj): string {
  const ns = nsOf(o);
  if (o.kind === 'Pod') {
    const st = podState(c, o);
    const owner = ownerOf(o);
    const head = kv([
      ['Name', nameOf(o)],
      ['Namespace', ns],
      ['Priority', '0'],
      ['Service Account', 'default'],
      ['Node', st.node ? `${st.node}/${NODES.find(n => n.name === st.node)?.ip}` : '<none>'],
      ['Start Time', st.node ? new Date(createdAt(o) * 1000).toUTCString().replace('GMT', '+0000') : undefined],
      ['Labels', labelBlock(o.metadata.labels, 18)],
      ['Annotations', '<none>'],
      ['Status', st.phase],
      ['IP', st.node ? podIp(o) : ''],
      ['Controlled By', owner ? `${owner.kind}/${owner.name}` : undefined],
    ], '', 18);
    const containers = `Containers:\n${(o.spec.containers ?? []).map((ct: Obj, i: number) => containerBlock(ct, st.node ? st.containers[i] : undefined)).join('\n')}`;
    const ready = st.node && st.containers.every(x => x.ready);
    const conds = st.node
      ? table(['Type', 'Status'], [['PodReadyToStartContainers', 'True'], ['Initialized', 'True'], ['Ready', ready ? 'True' : 'False'], ['ContainersReady', ready ? 'True' : 'False'], ['PodScheduled', 'True']])
      : table(['Type', 'Status'], [['PodScheduled', 'False']]);
    const res = (o.spec.containers ?? []).some((ct: Obj) => ct.resources?.requests || ct.resources?.limits);
    const qos = !res ? 'BestEffort' : (o.spec.containers ?? []).every((ct: Obj) => ct.resources?.limits && JSON.stringify(ct.resources.limits) === JSON.stringify(ct.resources.requests ?? ct.resources.limits)) ? 'Guaranteed' : 'Burstable';
    return [
      head,
      containers,
      `Conditions:\n${conds.split('\n').map(l => `  ${l}`).join('\n')}`,
      kv([['QoS Class', qos], ['Node-Selectors', '<none>'], ['Tolerations', 'node.kubernetes.io/not-ready:NoExecute op=Exists for 300s\n                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s']], '', 29),
      eventsBlock(c, `pod/${nameOf(o)}`, ns),
    ].join('\n');
  }
  if (o.kind === 'Deployment') {
    const s = deploymentStatus(c, o);
    const want = o.spec.replicas ?? 1;
    const sets = replicaSetsOf(c, o);
    const rsText = (rs: Obj) => `${nameOf(rs)} (${podsOf(c, rs).length}/${rs.spec.replicas} replicas created)`;
    const old = sets.filter(rs => rs !== s.currentRs && Number(rs.spec.replicas) > 0);
    const strategy = o.spec.strategy?.type ?? 'RollingUpdate';
    return [
      kv([
        ['Name', nameOf(o)],
        ['Namespace', ns],
        ['CreationTimestamp', new Date(createdAt(o) * 1000).toUTCString().replace('GMT', '+0000')],
        ['Labels', labelBlock(o.metadata.labels, 24)],
        ['Annotations', `deployment.kubernetes.io/revision: ${s.currentRs?.metadata.annotations?.['deployment.kubernetes.io/revision'] ?? '1'}`],
        ['Selector', labelsText(o.spec.selector?.matchLabels)],
        ['Replicas', `${want} desired | ${s.updated} updated | ${s.replicas} total | ${s.available} available | ${Math.max(0, s.replicas - s.available)} unavailable`],
        ['StrategyType', strategy],
        ['MinReadySeconds', '0'],
        ['RollingUpdateStrategy', strategy === 'RollingUpdate' ? '25% max unavailable, 25% max surge' : undefined],
      ], '', 24),
      `Pod Template:\n  ${kv([['Labels', labelBlock(o.spec.template.metadata?.labels, 10)]], '', 8)}\n  Containers:\n${(o.spec.template.spec.containers ?? []).map((ct: Obj) => containerBlock(ct).split('\n').map(l => `  ${l}`).join('\n')).join('\n')}`,
      `Conditions:\n${table(['Type', 'Status', 'Reason'], [['----', '------', '------'], ...(apiObject(c, o).status.conditions as Obj[]).map(x => [x.type, x.status, x.reason ?? 'MinimumReplicasAvailable'])]).split('\n').map(l => `  ${l}`).join('\n')}`,
      kv([['OldReplicaSets', old.length ? old.map(rsText).join(', ') : '<none>'], ['NewReplicaSet', s.currentRs ? rsText(s.currentRs) : '<none>']], '', 16),
      eventsBlock(c, `deployment/${nameOf(o)}`, ns),
    ].join('\n');
  }
  if (o.kind === 'Service') {
    const eps = endpointsOf(c, o).filter(e => e.ready);
    const p = o.spec.ports;
    return [
      kv([
        ['Name', nameOf(o)],
        ['Namespace', ns],
        ['Labels', labelBlock(o.metadata.labels, 19)],
        ['Annotations', '<none>'],
        ['Selector', labelsText(o.spec.selector)],
        ['Type', o.spec.type ?? 'ClusterIP'],
        ['IP Family Policy', 'SingleStack'],
        ['IP Families', 'IPv4'],
        ['IP', o.spec.clusterIP],
        ['IPs', o.spec.clusterIP],
        ...p.flatMap((x: Obj) => [
          ['Port', `${x.name ?? '<unset>'}  ${x.port}/${x.protocol ?? 'TCP'}`] as [string, string],
          ['TargetPort', `${x.targetPort}/${x.protocol ?? 'TCP'}`] as [string, string],
          ...(x.nodePort ? [['NodePort', `${x.name ?? '<unset>'}  ${x.nodePort}/${x.protocol ?? 'TCP'}`] as [string, string]] : []),
          ['Endpoints', eps.length ? eps.map(e => `${e.ip}:${e.port}`).join(',') : ''] as [string, string],
        ]),
        ['Session Affinity', 'None'],
        ['Internal Traffic Policy', 'Cluster'],
      ], '', 25),
      'Events:                   <none>',
    ].join('\n');
  }
  if (o.kind === 'ConfigMap' || o.kind === 'Secret') {
    const head = kv([['Name', nameOf(o)], ['Namespace', ns], ['Labels', labelBlock(o.metadata.labels, 14)], ['Annotations', '<none>']], '', 14);
    if (o.kind === 'ConfigMap') {
      const data = Object.entries(o.data ?? {}).map(([k, v]) => `${k}:\n----\n${v}\n`).join('\n');
      return `${head}\n\nData\n====\n${data}\nBinaryData\n====\n\nEvents:  <none>`;
    }
    const data = Object.entries(o.data ?? {}).map(([k, v]) => `${k}:  ${new TextEncoder().encode(b64decode(String(v))).length} bytes`).join('\n');
    return `${head}\n\nType:  ${o.type ?? 'Opaque'}\n\nData\n====\n${data}`;
  }
  if (o.kind === 'Node') {
    const pods = list(c, 'Pod').filter(p => podState(c, p).node === nameOf(o));
    const cpu = pods.reduce((a, p) => a + p.spec.containers.reduce((b: number, ct: Obj) => b + cpuMilli(ct.resources?.requests?.cpu), 0), 0);
    const mem = pods.reduce((a, p) => a + p.spec.containers.reduce((b: number, ct: Obj) => b + (memMi(ct.resources?.requests?.memory) || 0), 0), 0);
    return [
      kv([['Name', nameOf(o)], ['Roles', NODES.find(n => n.name === nameOf(o))?.role ?? '<none>'], ['Labels', `kubernetes.io/hostname=${nameOf(o)}`]], '', 20),
      `Allocatable:\n  cpu:     ${NODE_CPU_M / 1000}\n  memory:  ${NODE_MEM_MI}Mi\n  pods:    110`,
      `Non-terminated Pods:          (${pods.length} in total)\n${table(['  Namespace', 'Name', 'CPU Requests', 'Memory Requests', 'Age'], pods.map(p => [`  ${nsOf(p)}`, nameOf(p), p.spec.containers[0]?.resources?.requests?.cpu ?? '0 (0%)', p.spec.containers[0]?.resources?.requests?.memory ?? '0 (0%)', ago(c, p)]))}`,
      `Allocated resources:\n  (Total limits may be over 100 percent, i.e., overcommitted.)\n  Resource           Requests\n  --------           --------\n  cpu                ${cpu}m (${Math.round((100 * cpu) / NODE_CPU_M)}%)\n  memory             ${Math.round(mem)}Mi (${Math.round((100 * mem) / NODE_MEM_MI)}%)`,
      'Events:              <none>',
    ].join('\n');
  }
  if (o.kind === 'Namespace') {
    return `${kv([['Name', nameOf(o)], ['Labels', `kubernetes.io/metadata.name=${nameOf(o)}`], ['Annotations', '<none>'], ['Status', 'Active']], '', 13)}\n\nNo resource quota.\n\nNo LimitRange resource.`;
  }
  if (o.kind === 'ReplicaSet') {
    const pods = podsOf(c, o);
    return [
      kv([
        ['Name', nameOf(o)],
        ['Namespace', ns],
        ['Selector', labelsText(o.spec.selector?.matchLabels)],
        ['Labels', labelBlock(o.metadata.labels, 14)],
        ['Annotations', Object.entries(o.metadata.annotations ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n              ') || '<none>'],
        ['Controlled By', `Deployment/${ownerOf(o)?.name}`],
        ['Replicas', `${pods.length} current / ${o.spec.replicas} desired`],
        ['Pods Status', `${pods.filter(p => podState(c, p).status === 'Running').length} Running / ${pods.filter(p => podState(c, p).status !== 'Running').length} Waiting / 0 Succeeded / 0 Failed`],
      ], '', 14),
      eventsBlock(c, `replicaset/${nameOf(o)}`, ns),
    ].join('\n');
  }
  return `Name:  ${nameOf(o)}`;
}

/** Plausible `kubectl top pods` numbers, stable per pod. */
export function usage(c: Cluster, pod: Obj): { cpu: number; mem: number } {
  const st = podState(c, pod);
  if (!st.node || st.containers.some(x => x.state !== 'Running')) return { cpu: 0, mem: 0 };
  let cpu = 0, mem = 0;
  for (const ct of pod.spec.containers) {
    const info = lookupImage(ct.image);
    const h = (nameOf(pod).length * 7 + ct.image.length) % 9;
    cpu += 1 + h;
    mem += Math.round((info?.memoryMi ?? 50) * (0.7 + h / 30));
  }
  return { cpu, mem };
}

export { KINDS, ref };

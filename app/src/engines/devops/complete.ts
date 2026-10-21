/** Tab completion for the terminal: verbs, resource types, object names and common flags. */

import { list, nameOf, type Cluster } from './cluster';

const VERBS = ['get', 'describe', 'logs', 'create', 'apply', 'delete', 'scale', 'expose', 'set', 'rollout', 'label', 'annotate', 'patch', 'exec', 'port-forward', 'top', 'config', 'explain', 'api-resources', 'version', 'cluster-info', 'run'];
const TYPES = ['pods', 'deployments', 'replicasets', 'services', 'nodes', 'namespaces', 'events', 'configmaps', 'secrets', 'endpoints', 'all'];
const KIND: Record<string, string> = {
  pod: 'Pod', pods: 'Pod', po: 'Pod', deploy: 'Deployment', deployment: 'Deployment', deployments: 'Deployment',
  svc: 'Service', service: 'Service', services: 'Service', rs: 'ReplicaSet', replicasets: 'ReplicaSet',
  cm: 'ConfigMap', configmap: 'ConfigMap', configmaps: 'ConfigMap', secret: 'Secret', secrets: 'Secret',
  ns: 'Namespace', namespace: 'Namespace', namespaces: 'Namespace', no: 'Node', nodes: 'Node', node: 'Node',
};
const FLAGS = ['--namespace', '-n', '-A', '--all-namespaces', '-o', '--output', '-l', '--selector', '--show-labels', '--replicas', '--image', '--port', '--target-port', '--type', '--previous', '--tail', '--to-revision', '--from-literal', '--dry-run=client', '--overwrite', '--sort-by', '--limits', '--requests', '--from'];
const SUB: Record<string, string[]> = {
  rollout: ['status', 'history', 'undo', 'restart'],
  set: ['image', 'env', 'resources', 'selector'],
  create: ['namespace', 'deployment', 'configmap', 'secret', 'service'],
  config: ['set-context', 'current-context', 'get-contexts', 'view'],
  top: ['pods', 'nodes'],
};

export function completions(c: Cluster, line: string): string[] {
  const words = line.split(/\s+/);
  const word = words[words.length - 1] ?? '';
  const prev = words.slice(0, -1).filter(Boolean);
  const pick = (xs: string[]) => [...new Set(xs)].filter(x => x.startsWith(word) && x !== word).sort();
  if (prev.length === 0) return pick(['kubectl', 'k', 'clear', 'help']);
  if (prev[0] !== 'kubectl' && prev[0] !== 'k') return [];
  if (word.startsWith('-')) return pick(FLAGS);
  const last = prev[prev.length - 1]!;
  const ns = (() => {
    const i = prev.findIndex(w => w === '-n' || w === '--namespace');
    return i >= 0 ? prev[i + 1] : prev.find(w => w.startsWith('--namespace='))?.slice(12) ?? c.namespace;
  })();
  if (last === '-n' || last === '--namespace') return pick(list(c, 'Namespace').map(nameOf));
  if (last === '-o' || last === '--output') return pick(['wide', 'yaml', 'json', 'name', 'jsonpath=']);
  if (prev.length === 1) return pick(VERBS);
  const verb = prev[1]!;
  if (prev.length === 2 && SUB[verb]) return pick(SUB[verb]!);
  // "deploy/" → names of deployments
  const slash = /^([\w.]+)\/(.*)$/.exec(word);
  if (slash) {
    const kind = KIND[slash[1]!];
    return kind ? pick(list(c, kind, kind === 'Node' || kind === 'Namespace' ? undefined : ns).map(o => `${slash[1]}/${nameOf(o)}`)) : [];
  }
  const kind = KIND[last];
  if (kind) return pick(list(c, kind, kind === 'Node' || kind === 'Namespace' ? undefined : ns).map(nameOf));
  if (['get', 'describe', 'delete', 'label', 'annotate', 'explain'].includes(verb) || (SUB[verb] && prev.length === 3)) {
    return pick([...TYPES, 'deploy', 'svc', 'po', 'cm', 'ns', 'deploy/', 'svc/', 'pod/']);
  }
  if (verb === 'logs' || verb === 'exec' || verb === 'port-forward') return pick([...list(c, 'Pod', ns).map(nameOf), 'deploy/', 'svc/']);
  if (verb === 'scale' || verb === 'expose') return pick(['deployment/', 'deploy/', ...list(c, 'Deployment', ns).map(d => `deploy/${nameOf(d)}`)]);
  return [];
}

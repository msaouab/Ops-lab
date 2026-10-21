/**
 * The DevOps playground's state. It lives for the whole visit (like the SQL
 * playground's code), so leaving the page and coming back keeps the cluster.
 */

import type { Cluster } from './cluster';
import { makeCluster, type ClusterId } from './fixtures';

export interface PlaygroundEntry {
  cmd: string;
  output: string;
  ok: boolean;
}

export const devopsPlayground: {
  clusterId: ClusterId;
  cluster: Cluster | null;
  entries: PlaygroundEntry[];
  /** Editor text and its file name, for kubectl apply -f. */
  yaml: string;
  filename: string;
  /** Commands from a lesson's "Edit in playground", run when the page opens. */
  pending: string[];
} = {
  clusterId: 'shop',
  cluster: null,
  entries: [],
  yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hello
  template:
    metadata:
      labels:
        app: hello
    spec:
      containers:
        - name: hello
          image: traefik/whoami:v1.11
          ports:
            - containerPort: 80
`,
  filename: 'hello.yaml',
  pending: [],
};

export function playgroundCluster(): Cluster {
  devopsPlayground.cluster ??= makeCluster(devopsPlayground.clusterId);
  return devopsPlayground.cluster;
}

export function resetPlayground(id: ClusterId = devopsPlayground.clusterId): Cluster {
  devopsPlayground.clusterId = id;
  devopsPlayground.cluster = makeCluster(id);
  devopsPlayground.entries = [];
  return devopsPlayground.cluster;
}

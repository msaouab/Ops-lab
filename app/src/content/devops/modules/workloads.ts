import type { Module } from '../../types';
import { all, at, command, deploy, firstContainer, healthy, imageOf, manifest, obj, quiz, rule } from '../rules';

const workloadsModule: Module = {
  id: 'workloads',
  title: 'Pods & Deployments',
  tags: 'pod · ReplicaSet · scale · rollout · undo',
  parents: ['k8s-basics'],
  summary: 'Run an app on Kubernetes: a Deployment keeps N copies alive, rolls out new versions without downtime, and rolls back when a release goes wrong.',
  lesson: [
    {
      heading: 'Pod, ReplicaSet, Deployment',
      body: 'A <b>pod</b> is one or more containers that share a network and run together: the smallest thing Kubernetes runs. You almost never create pods directly. A <b>Deployment</b> manages <b>ReplicaSets</b>, and each ReplicaSet keeps a fixed number of identical pods alive. A new version means a new ReplicaSet.',
      code: `kubectl get deploy,rs,pods -n shop -l app=api
kubectl describe deploy api -n shop`,
    },
    {
      heading: 'Self-healing and scaling',
      body: 'Delete a pod and its ReplicaSet creates a replacement within seconds. <code>kubectl scale</code> changes the desired count; the controller does the rest.',
      code: `kubectl delete pod -n shop -l app=web
kubectl get pods -n shop -l app=web
kubectl scale deploy/web --replicas=4 -n shop
kubectl get deploy web -n shop`,
    },
    {
      heading: 'Rolling updates',
      body: 'Changing the pod template (a new image, an env var) creates a new ReplicaSet and shifts pods over gradually: new pods must be <b>ready</b> before old ones are removed, so users see no downtime. <code>maxSurge</code> and <code>maxUnavailable</code> control the pace.',
      code: `kubectl set image deploy/web web=ghcr.io/msaouab/shipit-web:2.2.0 -n shop
kubectl rollout status deploy/web -n shop
kubectl get rs -n shop -l app=web`,
    },
    {
      heading: 'History and rollback',
      body: 'Every template change is a <b>revision</b>. <code>rollout history</code> lists them (the <code>change-cause</code> annotation says why); <code>rollout undo</code> goes back to the previous one, or <code>--to-revision=N</code>. Rolling back is the fastest fix for a bad release: restore service first, investigate after.',
      code: `kubectl rollout history deploy/api -n shop
kubectl rollout undo deploy/api -n shop
kubectl rollout history deploy/api -n shop`,
    },
    {
      heading: 'The same thing as YAML',
      body: 'Commands are great for exploring, but real deployments live in files in Git (that is GitOps, later). A Deployment needs a <code>selector</code> that matches its template\'s labels, and each container an image (and ideally resources). <b>Run</b> applies this file to an empty cluster and shows what came up.',
      lang: 'yaml',
      flavor: 'kubernetes',
      filename: 'hello.yaml',
      code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello
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
            - containerPort: 80`,
      note: { label: 'Interview tip', body: '<code>kubectl create deployment hello --image=nginx:1.29 --dry-run=client -o yaml</code> generates this skeleton for you. Nobody types YAML from memory.' },
    },
  ],
  exercises: [
    command({
      slug: 'scale-for-a-sale',
      title: 'Scale up for a sale',
      difficulty: 'Easy',
      cluster: 'shop',
      mode: 'state',
      prompt: 'Black Friday starts in an hour. Scale the <code>api</code> deployment in <code>shop</code> to <b>5</b> replicas, and make sure all 5 are running.',
      hint: 'kubectl scale deploy/api --replicas=5 -n shop, then check with kubectl get deploy api -n shop.',
      solution: `kubectl scale deploy/api --replicas=5 -n shop
kubectl get deploy api -n shop`,
      check: c => all(
        () => (Number(deploy(c, 'shop', 'api').spec.replicas) === 5 ? true : `api wants ${deploy(c, 'shop', 'api').spec.replicas} replicas, not 5`),
        () => healthy(c, 'shop', 'api'),
      ),
    }),
    command({
      slug: 'release-web-2-2-0',
      title: 'Release web 2.2.0',
      difficulty: 'Easy',
      cluster: 'shop',
      mode: 'state',
      prompt: 'Version <code>2.2.0</code> of the web front end is ready: <code>ghcr.io/msaouab/shipit-web:2.2.0</code>. Roll it out to the <code>web</code> deployment in <code>shop</code> and confirm the rollout finished.',
      hint: 'kubectl set image deploy/web web=<image> -n shop, then kubectl rollout status deploy/web -n shop. The container is named web.',
      solution: `kubectl set image deploy/web web=ghcr.io/msaouab/shipit-web:2.2.0 -n shop
kubectl rollout status deploy/web -n shop`,
      check: c => all(
        () => (imageOf(c, 'shop', 'web') === 'ghcr.io/msaouab/shipit-web:2.2.0' ? true : `web runs ${imageOf(c, 'shop', 'web')}`),
        () => healthy(c, 'shop', 'web'),
      ),
    }),
    command({
      slug: 'roll-back-the-api',
      title: 'Roll back the API',
      difficulty: 'Medium',
      cluster: 'shop',
      mode: 'state',
      prompt: 'Customers report broken order search since the last <code>api</code> release. Roll the <code>api</code> deployment in <code>shop</code> back to the version it ran before (check the history first: which version is that?).',
      hint: 'kubectl rollout history deploy/api -n shop shows the revisions; kubectl rollout undo deploy/api -n shop returns to the previous one.',
      solution: `kubectl rollout history deploy/api -n shop
kubectl rollout undo deploy/api -n shop`,
      check: c => all(
        () => (imageOf(c, 'shop', 'api') === 'ghcr.io/msaouab/shipit-api:1.3.2' ? true : `api runs ${imageOf(c, 'shop', 'api')}; the previous release was 1.3.2`),
        () => healthy(c, 'shop', 'api'),
      ),
    }),
    manifest({
      slug: 'write-a-deployment',
      title: 'Write a Deployment',
      difficulty: 'Medium',
      flavor: 'kubernetes',
      filename: 'whoami.yaml',
      prompt: 'Write a Deployment named <code>whoami</code> in the <code>default</code> namespace: <b>3</b> replicas of <code>traefik/whoami:v1.11</code>, container port <code>80</code>, pods labelled <code>app: whoami</code>, and resource requests of <code>50m</code> CPU and <code>32Mi</code> memory. Run it: all 3 pods must come up.',
      hint: 'The selector.matchLabels must equal the template labels. Resources go under the container: resources: { requests: { cpu: 50m, memory: 32Mi } }.',
      starter: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: whoami
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: whoami
          image: traefik/whoami
`,
      solution: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: whoami
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: whoami
  template:
    metadata:
      labels:
        app: whoami
    spec:
      containers:
        - name: whoami
          image: traefik/whoami:v1.11
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 32Mi
`,
      rules: [
        rule('A Deployment named whoami', m => (obj(m, 'Deployment', 'whoami') ? true : 'missing')),
        rule('3 replicas', m => (Number(at(obj(m, 'Deployment', 'whoami'), 'spec.replicas')) === 3 ? true : `spec.replicas is ${at(obj(m, 'Deployment', 'whoami'), 'spec.replicas')}`)),
        rule('Selector matches the pod labels app: whoami', m => {
          const d = obj(m, 'Deployment', 'whoami');
          const sel = at(d, 'spec.selector.matchLabels') as Record<string, string> | undefined;
          const labels = at(d, 'spec.template.metadata.labels') as Record<string, string> | undefined;
          if (sel?.app !== 'whoami') return 'spec.selector.matchLabels should be app: whoami';
          return labels?.app === 'whoami' ? true : 'spec.template.metadata.labels should include app: whoami';
        }),
        rule('Pinned image traefik/whoami:v1.11 on port 80', m => {
          const ct = firstContainer(obj(m, 'Deployment', 'whoami'));
          if (ct.image !== 'traefik/whoami:v1.11') return `image is ${ct.image}`;
          return (ct.ports ?? []).some((p: { containerPort?: number }) => p.containerPort === 80) ? true : 'containerPort 80 is missing';
        }),
        rule('Requests 50m CPU and 32Mi memory', m => {
          const r = at(firstContainer(obj(m, 'Deployment', 'whoami')), 'resources.requests') as Record<string, unknown> | undefined;
          return String(r?.cpu) === '50m' && String(r?.memory) === '32Mi' ? true : `resources.requests is ${JSON.stringify(r ?? null)}`;
        }),
        rule('All 3 pods run after kubectl apply', m => {
          const r = m.cluster();
          if (!r.ok) return r.output;
          return healthy(r.cluster, 'default', 'whoami');
        }),
      ],
    }),
    quiz({
      slug: 'deployments-check',
      title: 'Deployments check',
      difficulty: 'Easy',
      prompt: 'Rolling updates and rollbacks come up in every Kubernetes interview.',
      hint: 'Think about what a Deployment owns, and what "ready" means during a rollout.',
      questions: [
        { q: 'You change only the replica count of a Deployment. Does it create a new ReplicaSet?', options: ['Yes, every change does', 'No: only changes to the pod template create a new ReplicaSet (and revision)', 'Only if you use kubectl apply', 'Only when scaling down'], answer: 1, why: 'Replicas live outside the template. Scaling resizes the current ReplicaSet; a new image or env var changes the template and triggers a rollout.' },
        { q: 'During a rolling update, when is an old pod removed?', options: ['Immediately', 'When a new pod is ready (passes its readiness probe), within maxUnavailable', 'After all new pods are created, ready or not', 'Never, both versions keep running'], answer: 1, why: 'The Deployment only scales down old pods as new ones become ready. A failing readiness probe therefore pauses the rollout instead of taking the app down.' },
        { q: 'A release is broken in production. What is the fastest safe action?', options: ['Debug live in the pod', 'kubectl rollout undo, then investigate', 'Delete the namespace', 'Scale to zero'], answer: 1, why: 'Restore service first: rollout undo brings back the previous ReplicaSet in seconds. Then find the cause in logs and events.' },
        { q: 'Why not create bare pods instead of a Deployment?', options: ['Bare pods are not allowed', 'Nothing recreates a bare pod when it dies or its node fails, and you get no rolling updates', 'Pods cannot have labels', 'Pods cannot use images'], answer: 1, why: 'A Deployment gives self-healing, scaling and versioned rollouts. A bare pod is gone for good if its node disappears.' },
      ],
    }),
  ],
};

export default workloadsModule;

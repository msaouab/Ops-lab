import type { Module } from '../../types';
import { all, at, command, deploy, firstContainer, healthy, manifest, obj, quiz, rule } from '../rules';

const configModule: Module = {
  id: 'config',
  title: 'Config, Secrets & Health',
  tags: 'ConfigMap · Secret · env · probes · resources',
  parents: ['workloads', 'services'],
  summary: 'The same image runs in dev and prod: configuration comes from outside. Then tell Kubernetes how much the app needs and how to know it is healthy.',
  lesson: [
    {
      heading: 'ConfigMaps and Secrets',
      body: 'Never bake environment-specific values into the image. A <b>ConfigMap</b> holds plain settings; a <b>Secret</b> holds credentials. Both are injected into containers as environment variables or files.',
      code: `kubectl get configmap api-config -n shop -o yaml
kubectl get secret api-secrets -n shop
kubectl exec deploy/api -n shop -- printenv REDIS_URL`,
      note: { label: 'Common trap', body: 'Secrets are only <b>base64-encoded</b>, not encrypted. Anyone allowed to read Secrets in the namespace can decode them. Restrict access with RBAC, and never commit them to Git in plain form (use Sealed Secrets or an external secret store).' },
    },
    {
      heading: 'Injecting configuration',
      body: '<code>envFrom</code> loads every key of a ConfigMap or Secret as environment variables; <code>env[].valueFrom</code> picks single keys. Environment variables are read when the container starts, so changing a ConfigMap needs a rollout restart to take effect.',
      lang: 'yaml',
      flavor: 'kubernetes',
      filename: 'config.yaml',
      code: `apiVersion: v1
kind: ConfigMap
metadata:
  name: hello-config
data:
  GREETING: hi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello
spec:
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
          envFrom:
            - configMapRef:
                name: hello-config`,
    },
    {
      heading: 'Requests and limits',
      body: '<b>Requests</b> are what the scheduler reserves on a node: a pod only lands where its requests fit. <b>Limits</b> are hard caps: a container that uses more memory than its limit is killed (<code>OOMKilled</code>); CPU above the limit is only slowed down.',
      code: `kubectl top pods -n shop
kubectl describe node k3d-lab-agent-0`,
    },
    {
      heading: 'Probes: ready vs alive',
      body: 'A <b>readiness</b> probe answers "can I receive traffic?": failing it removes the pod from the Service, without restarting it. A <b>liveness</b> probe answers "am I stuck?": failing it restarts the container. A <b>startup</b> probe gives slow apps time before liveness begins.',
      list: [
        'Readiness may check dependencies (database reachable). Liveness should not, or a database outage restarts every healthy pod.',
        'A readiness probe pointing at the wrong path keeps new pods unready forever, which pauses the rollout. That protects users, but the release never completes.',
      ],
      code: `kubectl describe deploy api -n shop
kubectl get pods -n shop -l app=api`,
    },
  ],
  exercises: [
    command({
      slug: 'a-typo-in-the-config',
      title: 'A typo in the config',
      difficulty: 'Medium',
      cluster: 'config-typo',
      mode: 'state',
      prompt: 'After a refactor of the worker\'s configuration, its new pod never starts. Find the cause in the pod\'s events and fix the <code>worker</code> deployment in <code>shop</code> so it runs again with the same <code>api-config</code> settings as before.',
      hint: 'kubectl describe pod -n shop -l app=worker shows an event about a ConfigMap that is not found. Compare its name with kubectl get configmap -n shop, then patch the deployment\'s envFrom.',
      solution: `kubectl get pods -n shop -l app=worker
kubectl describe pod -n shop -l app=worker
kubectl get configmap -n shop
kubectl patch deploy worker -n shop -p '{"spec":{"template":{"spec":{"containers":[{"name":"worker","envFrom":[{"configMapRef":{"name":"api-config"}}]}]}}}}'
kubectl get pods -n shop -l app=worker`,
      check: c => all(
        () => (JSON.stringify(deploy(c, 'shop', 'worker').spec.template.spec.containers[0].envFrom ?? []).includes('"api-config"') ? true : 'the worker should load its settings from the api-config ConfigMap'),
        () => healthy(c, 'shop', 'worker'),
      ),
    }),
    command({
      slug: 'the-worker-lost-its-config',
      title: 'The worker lost its config',
      difficulty: 'Medium',
      cluster: 'missing-env',
      mode: 'state',
      prompt: 'Worker <code>1.5.0</code> crash-loops a few minutes after its release. Read its logs, find what is missing, and give the worker its settings back from the <code>api-config</code> ConfigMap, <b>keeping</b> version 1.5.0.',
      hint: 'kubectl logs deploy/worker -n shop says which variable is required. kubectl set env deploy/worker --from=configmap/api-config -n shop adds every key of the ConfigMap.',
      solution: `kubectl get pods -n shop -l app=worker
kubectl logs deploy/worker -n shop
kubectl set env deploy/worker --from=configmap/api-config -n shop
kubectl get pods -n shop -l app=worker`,
      check: c => all(
        () => (String(deploy(c, 'shop', 'worker').spec.template.spec.containers[0].image).endsWith(':1.5.0') ? true : 'keep worker 1.5.0: fix the config instead of rolling back'),
        () => healthy(c, 'shop', 'worker'),
      ),
    }),
    command({
      slug: 'readiness-on-the-wrong-path',
      title: 'Readiness on the wrong path',
      difficulty: 'Hard',
      cluster: 'readiness',
      mode: 'state',
      prompt: 'API <code>1.5.0</code> was released a few minutes ago, but the rollout is stuck: the new pods stay <code>0/1</code>. The app still serves its health check at <code>/health</code>. Fix the readiness probe of the <code>api</code> deployment so the rollout completes on version 1.5.0.',
      hint: 'kubectl describe pod on a new api pod shows "Readiness probe failed" with the path it calls. Patch spec.template.spec.containers[0].readinessProbe.httpGet.path back to /health (a JSON patch is the precise tool).',
      solution: `kubectl get pods -n shop -l app=api
kubectl describe deploy api -n shop
kubectl patch deployment api -n shop --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/health"}]'
kubectl rollout status deploy/api -n shop`,
      check: c => all(
        () => (String(deploy(c, 'shop', 'api').spec.template.spec.containers[0].image).endsWith(':1.5.0') ? true : 'keep api 1.5.0: fix the probe instead of rolling back'),
        () => healthy(c, 'shop', 'api'),
      ),
    }),
    manifest({
      slug: 'a-production-ready-deployment',
      title: 'A production-ready Deployment',
      difficulty: 'Hard',
      flavor: 'kubernetes',
      filename: 'web.yaml',
      prompt: 'Turn this bare Deployment into one you would ship: add a ConfigMap <code>web-config</code> with <code>API_URL: http://api</code> loaded through <code>envFrom</code>, requests of <code>50m</code> CPU and <code>96Mi</code> memory, a memory limit of <code>192Mi</code>, and an HTTP <b>readiness</b> probe on <code>/</code> port <code>80</code>. The image must be pinned. After apply, the pods must be ready.',
      hint: 'Put the ConfigMap in the same file above the Deployment (separated by ---). Under the container: envFrom, resources: { requests, limits }, readinessProbe: { httpGet: { path: /, port: 80 } }.',
      starter: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx
          ports:
            - containerPort: 80
`,
      solution: `apiVersion: v1
kind: ConfigMap
metadata:
  name: web-config
data:
  API_URL: http://api
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx:1.29
          ports:
            - containerPort: 80
          envFrom:
            - configMapRef:
                name: web-config
          resources:
            requests:
              cpu: 50m
              memory: 96Mi
            limits:
              memory: 192Mi
          readinessProbe:
            httpGet:
              path: /
              port: 80
`,
      rules: [
        rule('ConfigMap web-config with API_URL', m => (at(obj(m, 'ConfigMap', 'web-config'), 'data.API_URL') === 'http://api' ? true : 'data.API_URL should be http://api')),
        rule('The container loads it with envFrom', m => (JSON.stringify(firstContainer(obj(m, 'Deployment', 'web')).envFrom ?? []).includes('"web-config"') ? true : 'envFrom has no configMapRef to web-config')),
        rule('Pinned image (not nginx or nginx:latest)', m => {
          const img = String(firstContainer(obj(m, 'Deployment', 'web')).image);
          return /:[\w.-]+$/.test(img) && !img.endsWith(':latest') ? true : `image "${img}" is not pinned`;
        }),
        rule('Requests 50m CPU / 96Mi, limit 192Mi', m => {
          const r = firstContainer(obj(m, 'Deployment', 'web')).resources ?? {};
          return String(r.requests?.cpu) === '50m' && String(r.requests?.memory) === '96Mi' && String(r.limits?.memory) === '192Mi' ? true : `resources is ${JSON.stringify(r)}`;
        }),
        rule('HTTP readiness probe on / port 80', m => {
          const p = at(firstContainer(obj(m, 'Deployment', 'web')), 'readinessProbe.httpGet') as { path?: string; port?: number } | undefined;
          return p?.path === '/' && Number(p?.port) === 80 ? true : `readinessProbe.httpGet is ${JSON.stringify(p ?? null)}`;
        }),
        rule('Pods are ready after kubectl apply', m => {
          const r = m.cluster();
          if (!r.ok) return r.output;
          return healthy(r.cluster, 'default', 'web');
        }),
      ],
    }),
    quiz({
      slug: 'config-and-probes-check',
      title: 'Config and probes check',
      difficulty: 'Medium',
      prompt: 'Questions about configuration, resources and health checks.',
      hint: 'Requests are for scheduling, limits for enforcement; readiness is about traffic, liveness about restarts.',
      questions: [
        { q: 'You update a ConfigMap used through envFrom. When do running pods see the new values?', options: ['Immediately', 'After the pods restart (e.g. kubectl rollout restart)', 'Never', 'After the next node reboot only'], answer: 1, why: 'Environment variables are fixed when the process starts. Mounted ConfigMap files do update (eventually), env vars do not.' },
        { q: 'A container exceeds its memory limit. What happens?', options: ['It is slowed down', 'It is killed (OOMKilled) and restarted', 'The node gets more memory', 'Nothing, limits are advisory'], answer: 1, why: 'Memory cannot be throttled, so the kernel kills the process. CPU above the limit is throttled instead.' },
        { q: 'Should a liveness probe check the database connection?', options: ['Yes, always', 'No: if the database is down, every app pod would be restarted for nothing', 'Only in production', 'Only for StatefulSets'], answer: 1, why: 'Liveness should only detect a stuck process. Dependency checks belong in readiness, which just stops traffic.' },
        { q: 'Is a Kubernetes Secret encrypted?', options: ['Yes, with AES by default everywhere', 'No, it is base64-encoded; protect it with RBAC and encryption at rest', 'Only when created with kubectl', 'Only in the default namespace'], answer: 1, why: 'base64 is an encoding, not encryption. Access control and encryption at rest (or an external secret manager) do the protecting.' },
      ],
    }),
  ],
};

export default configModule;

import type { Module } from '../../types';
import { all, at, command, hasEndpoints, healthy, manifest, need, obj, quiz, rule } from '../rules';
import { find } from '../../../engines/devops/cluster';

const servicesModule: Module = {
  id: 'services',
  title: 'Services & Networking',
  tags: 'ClusterIP · NodePort · selector · endpoints · DNS',
  parents: ['k8s-basics'],
  summary: 'Pods come and go with new IPs. A Service gives them one stable name and address, and load-balances across whichever pods are ready.',
  lesson: [
    {
      heading: 'Why Services exist',
      body: 'Every pod gets its own IP, but pods are replaced all the time, so their IPs change. A <b>Service</b> is a stable virtual IP and DNS name in front of a set of pods chosen by a <b>label selector</b>. Inside the cluster, the <code>web</code> pods simply call <code>http://api</code>.',
      code: `kubectl get svc -n shop
kubectl describe svc api -n shop`,
    },
    {
      heading: 'Selectors and endpoints',
      body: 'The Service keeps a list of <b>endpoints</b>: the IPs of pods that match its selector <b>and are ready</b>. If the endpoints list is empty, the Service has nowhere to send traffic. That is the first thing to check when "the service does not answer".',
      code: `kubectl get endpoints -n shop
kubectl get pods -n shop -l app=api -o wide`,
      note: { label: 'Common trap', body: 'A selector with a typo, or labels that changed in a new release, silently empties the endpoints. Everything looks healthy: pods Running, Service present. Only <code>kubectl get endpoints</code> shows the problem.' },
    },
    {
      heading: 'Service types',
      body: 'How far the Service is reachable:',
      list: [
        '<b>ClusterIP</b> (default): only inside the cluster. For APIs, databases, caches.',
        '<b>NodePort</b>: also on a port (30000–32767) of every node. Handy on a local cluster.',
        '<b>LoadBalancer</b>: a cloud load balancer with a public IP (k3d emulates it).',
        'For HTTP from the internet, put an <b>Ingress</b> or <b>Gateway</b> in front of ClusterIP Services: one entry point, routing by host and path, TLS.',
      ],
      code: `kubectl expose deployment web --name=web-lb --type=LoadBalancer --port=80 --target-port=3000 -n shop
kubectl get svc web-lb -n shop`,
    },
    {
      heading: 'DNS names',
      body: 'Every Service gets a DNS name: <code>&lt;service&gt;.&lt;namespace&gt;.svc.cluster.local</code>. From the same namespace the short name (<code>api</code>) is enough; from another namespace use <code>api.shop</code>.',
      code: `kubectl exec deploy/web -n shop -- wget -qO- http://api/health
kubectl get svc prometheus -n monitoring`,
    },
    {
      heading: 'A Service as YAML',
      body: '<code>port</code> is what clients call; <code>targetPort</code> is the container port the traffic goes to. Run it: the preview applies the Deployment and the Service, then shows the endpoints.',
      lang: 'yaml',
      flavor: 'kubernetes',
      filename: 'whoami.yaml',
      code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: whoami
spec:
  replicas: 2
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
---
apiVersion: v1
kind: Service
metadata:
  name: whoami
spec:
  selector:
    app: whoami
  ports:
    - port: 80
      targetPort: 80`,
    },
  ],
  exercises: [
    command({
      slug: 'expose-the-api',
      title: 'Expose the API on a node port',
      difficulty: 'Easy',
      cluster: 'shop',
      mode: 'state',
      prompt: 'A partner needs to test the API from outside the cluster. Create a <b>NodePort</b> Service named <code>api-public</code> in <code>shop</code> that sends port <code>80</code> to the api pods\' port <code>8000</code>. It must have ready endpoints.',
      hint: 'kubectl expose deployment api --name=api-public --type=NodePort --port=80 --target-port=8000 -n shop',
      solution: `kubectl expose deployment api --name=api-public --type=NodePort --port=80 --target-port=8000 -n shop
kubectl get svc api-public -n shop`,
      check: c => all(
        () => {
          const s = need(find(c, 'Service', 'shop', 'api-public'), 'service "api-public" doesn\'t exist in shop');
          if (s.spec.type !== 'NodePort') return `api-public is a ${s.spec.type ?? 'ClusterIP'} service`;
          const p = s.spec.ports?.[0];
          return p?.port === 80 && String(p?.targetPort) === '8000' ? true : `api-public maps ${p?.port} -> ${p?.targetPort}; expected 80 -> 8000`;
        },
        () => hasEndpoints(c, 'shop', 'api-public'),
      ),
    }),
    command({
      slug: 'the-api-has-no-endpoints',
      title: 'The API has no endpoints',
      difficulty: 'Medium',
      cluster: 'no-endpoints',
      mode: 'state',
      prompt: 'Since someone "tidied up" the <code>api</code> Service, the web front end gets errors calling the API, yet every pod is Running. Find out why the Service sends traffic nowhere, and fix the Service (not the pods).',
      hint: 'Compare kubectl describe svc api -n shop (its Selector) with the labels on the api pods (kubectl get pods -n shop --show-labels). kubectl set selector svc/api app=api -n shop fixes it.',
      solution: `kubectl get endpoints api -n shop
kubectl describe svc api -n shop
kubectl get pods -n shop -l tier=backend --show-labels
kubectl set selector svc/api app=api -n shop
kubectl get endpoints api -n shop`,
      check: c => all(
        () => hasEndpoints(c, 'shop', 'api'),
        () => healthy(c, 'shop', 'api'),
      ),
    }),
    manifest({
      slug: 'deployment-and-service',
      title: 'Deployment plus Service',
      difficulty: 'Medium',
      flavor: 'kubernetes',
      filename: 'echo.yaml',
      prompt: 'In one file, write a Deployment <code>echo</code> (2 replicas of <code>traefik/whoami:v1.11</code>, label <code>app: echo</code>, container port <code>80</code>) and a ClusterIP Service <code>echo</code> that listens on port <code>8080</code> and forwards to the pods\' port <code>80</code>. Separate the two objects with <code>---</code>. After apply, the Service must have ready endpoints.',
      hint: 'Service: spec.selector app: echo, ports: [{ port: 8080, targetPort: 80 }]. The selector must match the pod template labels exactly.',
      starter: `apiVersion: v1
kind: Service
metadata:
  name: echo
spec:
  selector:
    app: echo-server
  ports:
    - port: 8080
`,
      solution: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: echo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: echo
  template:
    metadata:
      labels:
        app: echo
    spec:
      containers:
        - name: echo
          image: traefik/whoami:v1.11
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: echo
spec:
  selector:
    app: echo
  ports:
    - port: 8080
      targetPort: 80
`,
      rules: [
        rule('A Deployment echo with 2 replicas', m => (Number(at(obj(m, 'Deployment', 'echo'), 'spec.replicas')) === 2 ? true : 'spec.replicas should be 2')),
        rule('A ClusterIP Service echo on port 8080 → 80', m => {
          const s = obj(m, 'Service', 'echo');
          if (s.spec?.type && s.spec.type !== 'ClusterIP') return `type is ${s.spec.type}`;
          const p = s.spec?.ports?.[0];
          return p?.port === 8080 && Number(p?.targetPort) === 80 ? true : `ports[0] is ${JSON.stringify(p ?? null)}; expected port 8080, targetPort 80`;
        }),
        rule('The Service selects the echo pods', m => (at(obj(m, 'Service', 'echo'), 'spec.selector.app') === 'echo' ? true : `selector is ${JSON.stringify(at(obj(m, 'Service', 'echo'), 'spec.selector'))}; the pods are labelled app: echo`)),
        rule('After apply, the Service has ready endpoints', m => {
          const r = m.cluster();
          if (!r.ok) return r.output;
          return hasEndpoints(r.cluster, 'default', 'echo');
        }),
      ],
    }),
    quiz({
      slug: 'networking-check',
      title: 'Networking check',
      difficulty: 'Easy',
      prompt: 'Service questions that separate people who used Kubernetes from people who read about it.',
      hint: 'Selectors, readiness, and how far each Service type reaches.',
      questions: [
        { q: 'Pods are Running but the Service returns nothing. What do you check first?', options: ['The node CPU', 'kubectl get endpoints: does the selector match ready pods?', 'Restart the cluster', 'The Docker image size'], answer: 1, why: 'No endpoints means the selector matches no ready pods: a label typo or failing readiness probes. Running is not the same as ready.' },
        { q: 'A pod fails its readiness probe. What happens to traffic?', options: ['It still receives traffic', 'It is removed from the Service endpoints until it is ready again', 'The Service is deleted', 'The pod is restarted'], answer: 1, why: 'Readiness controls endpoints (traffic). Liveness controls restarts. They are different probes with different jobs.' },
        { q: 'The web pods in namespace shop call the Service prometheus in namespace monitoring. Which name works?', options: ['prometheus', 'prometheus.monitoring', 'monitoring/prometheus', 'pods/prometheus'], answer: 1, why: 'The short name only resolves in the same namespace. Across namespaces use <service>.<namespace> (or the full .svc.cluster.local name).' },
        { q: 'Which type do you use for a database only the app talks to?', options: ['NodePort', 'LoadBalancer', 'ClusterIP', 'ExternalName'], answer: 2, why: 'Keep internal services internal. Exposing a database on node ports or a public load balancer is an unnecessary attack surface.' },
      ],
    }),
  ],
};

export default servicesModule;

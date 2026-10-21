import type { Module } from '../../types';
import { command, quiz } from '../rules';

const k8sBasicsModule: Module = {
  id: 'k8s-basics',
  title: 'Kubernetes & kubectl',
  tags: 'cluster · nodes · namespaces · get · describe · -o',
  parents: ['containers'],
  summary: 'What a cluster is made of, and kubectl: the one tool you use to look at it and change it. Learn to find anything fast.',
  lesson: [
    {
      heading: 'A cluster in one picture',
      body: 'Kubernetes runs your containers on a group of machines (<b>nodes</b>) and keeps them in the state you asked for. You describe the <b>desired state</b> (YAML); controllers keep fixing reality to match it, forever.',
      list: [
        '<b>Control plane</b>: the <code>kube-apiserver</code> (everything talks to it), <code>etcd</code> (the database of desired state), the <code>scheduler</code> (picks a node for each pod), the <code>controller-manager</code> (the reconcile loops)',
        '<b>Each node</b>: the <code>kubelet</code> (starts the containers it is told to), <code>kube-proxy</code> (service networking), a container runtime (containerd)',
        '<b>kubectl</b> only sends requests to the API server. It never touches nodes directly.',
      ],
      code: `kubectl get nodes
kubectl get pods -n kube-system`,
      note: { label: 'Your lab', body: 'This terminal simulates <code>k3d-lab</code>: the same 3-node k3d cluster you create with <code>make cluster-up</code> in <code>kube-lab/</code>, with a sample app called ShipIt running in the <code>shop</code> namespace.' },
    },
    {
      heading: 'Namespaces and contexts',
      body: 'A <b>namespace</b> is a folder for objects: <code>shop</code> holds the app, <code>monitoring</code> holds Prometheus. Most commands need <code>-n &lt;namespace&gt;</code>, or <code>-A</code> for all of them. A <b>context</b> remembers which cluster, user and default namespace kubectl uses.',
      code: `kubectl get ns
kubectl get pods -A
kubectl config set-context --current --namespace=shop
kubectl get pods`,
    },
    {
      heading: 'get, describe, logs: the three you use all day',
      body: '<code>get</code> lists objects (one line each). <code>describe</code> shows one object in detail, with its <b>Events</b> at the bottom, which is where Kubernetes tells you why something is wrong. <code>logs</code> shows what the container printed.',
      code: `kubectl get deploy,svc -n shop
kubectl describe deploy api -n shop
kubectl logs deploy/api -n shop --tail=3`,
    },
    {
      heading: 'Labels select things',
      body: 'Labels are key/value tags on objects. Deployments, Services and you all use <b>selectors</b> to find objects by label. <code>-l</code> filters any <code>get</code>; <code>--show-labels</code> prints them.',
      code: `kubectl get pods -n shop --show-labels
kubectl get pods -n shop -l tier=backend
kubectl get pods -n shop -l 'app in (api,web)'`,
    },
    {
      heading: 'Output formats: get exactly the field you need',
      body: '<code>-o wide</code> adds columns (node, IP). <code>-o yaml</code> shows the full object as stored. <code>-o jsonpath</code> extracts one field, which is ideal in scripts and CI.',
      code: `kubectl get pods -n shop -o wide
kubectl get deploy api -n shop -o jsonpath='{.spec.template.spec.containers[0].image}'
kubectl get pods -n shop -o jsonpath='{range .items[*]}{.metadata.name}{"\\t"}{.status.phase}{"\\n"}{end}'`,
      note: { label: 'Interview tip', body: '<code>kubectl explain deployment.spec.strategy</code> prints the documentation for any field, offline. It is allowed in the CKA exam and saves you from guessing YAML.' },
    },
  ],
  exercises: [
    command({
      slug: 'list-the-shop-pods',
      title: 'List the shop pods',
      difficulty: 'Easy',
      cluster: 'shop',
      mode: 'output',
      prompt: 'Print every pod in the <code>shop</code> namespace, in the default table format.',
      hint: 'kubectl get pods, plus the namespace flag.',
      solution: 'kubectl get pods -n shop',
    }),
    command({
      slug: 'backend-pods-only',
      title: 'Backend pods only',
      difficulty: 'Easy',
      cluster: 'shop',
      mode: 'output',
      prompt: 'The pods of ShipIt carry a <code>tier</code> label. List only the pods in <code>shop</code> whose tier is <code>backend</code>.',
      hint: 'Run kubectl get pods -n shop --show-labels to see the labels, then filter with -l key=value.',
      solution: 'kubectl get pods -n shop -l tier=backend',
    }),
    command({
      slug: 'which-image-is-running',
      title: 'Which image is running?',
      difficulty: 'Medium',
      cluster: 'shop',
      mode: 'output',
      prompt: 'A teammate asks which image version the <code>api</code> deployment runs. Print <b>only</b> the image of its first container, nothing else (no table, no YAML).',
      hint: 'kubectl get deploy api -n shop -o jsonpath=\'{.spec.template.spec.containers[0].image}\'',
      solution: "kubectl get deploy api -n shop -o jsonpath='{.spec.template.spec.containers[0].image}'",
    }),
    command({
      slug: 'read-a-secret',
      title: 'Read a secret',
      difficulty: 'Medium',
      cluster: 'shop',
      mode: 'output',
      prompt: 'The API cannot reach its database and you want to check the connection string. Print the decoded value of the <code>DATABASE_URL</code> key of the <code>api-secrets</code> Secret in <code>shop</code>.',
      hint: 'Secret data is base64. Extract .data.DATABASE_URL with jsonpath, then pipe it into base64 -d.',
      solution: "kubectl get secret api-secrets -n shop -o jsonpath='{.data.DATABASE_URL}' | base64 -d",
    }),
    quiz({
      slug: 'cluster-architecture',
      title: 'How a cluster works',
      difficulty: 'Easy',
      prompt: 'Check that you can explain what happens behind <code>kubectl apply</code>.',
      hint: 'Follow one request: kubectl → API server → etcd → scheduler → kubelet.',
      questions: [
        { q: 'Which component chooses the node a new pod runs on?', options: ['kubelet', 'kube-scheduler', 'etcd', 'kube-proxy'], answer: 1, why: 'The scheduler watches for pods with no node and assigns one, based on requested resources, taints and affinity. The kubelet on that node then starts it.' },
        { q: 'Where is the desired state of the cluster stored?', options: ['On each node', 'In etcd, behind the API server', 'In kubectl\'s config file', 'In the container registry'], answer: 1, why: 'etcd is the cluster\'s key-value store. Only the API server talks to it; every other component reads and writes through the API server.' },
        { q: 'You delete a pod that belongs to a Deployment. What happens?', options: ['It is gone until you redeploy', 'The ReplicaSet notices one pod is missing and creates a new one', 'The node restarts it with the same name', 'kubectl asks for confirmation and keeps it'], answer: 1, why: 'Controllers reconcile desired vs actual state. The ReplicaSet wants N pods, sees N-1, and creates a replacement (with a new name).' },
        { q: 'Why would kubectl get pods return "No resources found"?', options: ['The cluster is down', 'You are in the wrong namespace (default) and the pods live elsewhere', 'Pods are hidden from kubectl', 'You need -o wide'], answer: 1, why: 'Without -n, kubectl uses the context\'s default namespace. Use -n shop, -A, or set the context namespace.' },
      ],
    }),
  ],
};

export default k8sBasicsModule;

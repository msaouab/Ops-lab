import type { Module } from '../../types';
import { at, firstContainer, manifest, obj, quiz, rendered, rule } from '../rules';

const BASE = {
  'base/kustomization.yaml': `resources:
  - deployment.yaml
  - service.yaml
`,
  'base/deployment.yaml': `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/msaouab/shipit-api:1.4.0
          ports:
            - containerPort: 8000
`,
  'base/service.yaml': `apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8000
`,
};

const gitopsModule: Module = {
  id: 'gitops',
  title: 'GitOps & Argo CD',
  tags: 'pull model · Application · sync · self-heal · kustomize',
  parents: ['cicd', 'debugging'],
  summary: 'Git becomes the single source of truth for what runs. Argo CD inside the cluster pulls changes from Git and keeps the cluster equal to it.',
  lesson: [
    {
      heading: 'Push vs pull deployment',
      body: 'In a <b>push</b> pipeline, CI holds cluster credentials and runs <code>kubectl apply</code>. In <b>GitOps</b> (pull), CI only builds images and updates a Git repo of manifests; an agent <i>inside</i> the cluster (Argo CD) watches that repo and applies it.',
      list: [
        '<b>Safer</b>: no cluster credentials in CI.',
        '<b>Auditable</b>: every change to production is a commit, with an author and a review.',
        '<b>Rollback</b> = <code>git revert</code>.',
        '<b>Drift-proof</b>: a manual <code>kubectl edit</code> is detected, and reverted with self-heal.',
      ],
    },
    {
      heading: 'An Argo CD Application',
      body: 'An <b>Application</b> says: take this path of this repo at this revision, and apply it to this cluster and namespace. <code>automated</code> syncs on every commit; <code>prune</code> deletes what was removed from Git; <code>selfHeal</code> reverts manual changes. Run it to see what <code>argocd app get</code> would report.',
      lang: 'yaml',
      flavor: 'argocd',
      filename: 'argocd/apps/shipit-dev.yaml',
      code: `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shipit-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/msaouab/ops-lab.git
    targetRevision: main
    path: kube-lab/project-2-shipit/deploy/overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: shipit-dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true`,
    },
    {
      heading: 'Kustomize: one base, several environments',
      body: 'Do not copy YAML per environment. A <b>base</b> holds the shared manifests; each <b>overlay</b> changes only what differs: namespace, image tag, replica count, a patch. <code>kustomize build</code> (and Argo CD) renders the final YAML.',
      lang: 'yaml',
      flavor: 'kustomize',
      filename: 'overlays/dev/kustomization.yaml',
      files: BASE,
      code: `resources:
  - ../../base
namespace: shipit-dev
images:
  - name: ghcr.io/msaouab/shipit-api
    newTag: sha-3f9c2a1`,
    },
    {
      heading: 'The whole loop',
      body: 'Putting the pieces together, the way <code>kube-lab/project-2-shipit</code> does it:',
      list: [
        '1. A developer merges to <code>main</code>.',
        '2. GitHub Actions tests, builds <code>shipit-api:sha-3f9c2a1</code> and pushes it to GHCR.',
        '3. CI commits the new tag into <code>overlays/dev/kustomization.yaml</code>.',
        '4. Argo CD sees the commit and syncs <code>shipit-dev</code>: a rolling update starts.',
        '5. Promotion to prod is a pull request that changes <code>overlays/prod</code>; merging it is the deployment.',
      ],
      note: { label: 'Real cluster', body: 'This is exactly <b>Level 4–5</b> of <code>kube-lab/project-2-shipit</code>. After this module, do it for real: <code>make cluster-up</code> and <code>make bootstrap</code>.' },
    },
  ],
  exercises: [
    manifest({
      slug: 'an-argo-cd-application',
      title: 'An Argo CD Application',
      difficulty: 'Medium',
      flavor: 'argocd',
      filename: 'argocd/apps/shipit-prod.yaml',
      prompt: 'Write the Argo CD <code>Application</code> named <code>shipit-prod</code> (in namespace <code>argocd</code>, project <code>default</code>). It deploys the path <code>kube-lab/project-2-shipit/deploy/overlays/prod</code> of <code>https://github.com/msaouab/ops-lab.git</code> at <code>main</code> into namespace <code>shipit-prod</code> of the local cluster (<code>https://kubernetes.default.svc</code>). Sync automatically, prune deleted objects, revert manual changes, and create the namespace if needed.',
      hint: 'syncPolicy: { automated: { prune: true, selfHeal: true }, syncOptions: [CreateNamespace=true] }.',
      starter: `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shipit-prod
spec:
  source:
    repoURL: https://github.com/msaouab/ops-lab.git
`,
      solution: `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shipit-prod
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/msaouab/ops-lab.git
    targetRevision: main
    path: kube-lab/project-2-shipit/deploy/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: shipit-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
`,
      rules: [
        rule('An Application shipit-prod in namespace argocd', m => {
          const a = obj(m, 'Application', 'shipit-prod');
          return a.metadata?.namespace === 'argocd' ? true : 'metadata.namespace should be argocd (Applications live where Argo CD runs)';
        }),
        rule('Project default', m => (at(obj(m, 'Application'), 'spec.project') === 'default' ? true : 'spec.project should be default')),
        rule('Source: the repo, main, the prod overlay', m => {
          const s = (at(obj(m, 'Application'), 'spec.source') ?? {}) as Record<string, string>;
          if (s.repoURL !== 'https://github.com/msaouab/ops-lab.git') return `repoURL is ${s.repoURL}`;
          if (s.targetRevision !== 'main') return `targetRevision is ${s.targetRevision ?? '(missing)'}`;
          return s.path === 'kube-lab/project-2-shipit/deploy/overlays/prod' ? true : `path is ${s.path ?? '(missing)'}`;
        }),
        rule('Destination: local cluster, namespace shipit-prod', m => {
          const d = (at(obj(m, 'Application'), 'spec.destination') ?? {}) as Record<string, string>;
          return d.server === 'https://kubernetes.default.svc' && d.namespace === 'shipit-prod' ? true : `destination is ${JSON.stringify(d)}`;
        }),
        rule('Automated sync with prune and self-heal', m => {
          const a = at(obj(m, 'Application'), 'spec.syncPolicy.automated') as Record<string, boolean> | undefined;
          return a?.prune === true && a?.selfHeal === true ? true : `syncPolicy.automated is ${JSON.stringify(a ?? null)}`;
        }),
        rule('Creates the namespace', m => (JSON.stringify(at(obj(m, 'Application'), 'spec.syncPolicy.syncOptions') ?? []).includes('CreateNamespace=true') ? true : 'add syncOptions: [CreateNamespace=true]')),
      ],
    }),
    manifest({
      slug: 'a-production-overlay',
      title: 'A production overlay',
      difficulty: 'Medium',
      flavor: 'kustomize',
      filename: 'overlays/prod/kustomization.yaml',
      files: BASE,
      prompt: 'The base (shown as read-only files) deploys the api with 1 replica and image <code>1.4.0</code>. Write the <b>prod</b> overlay: it uses <code>../../base</code>, puts everything in namespace <code>shipit-prod</code>, runs <b>3</b> replicas of <code>api</code>, and pins the image <code>ghcr.io/msaouab/shipit-api</code> to tag <code>sha-3f9c2a1</code>. Do not copy the base YAML: only describe the differences. Run it to see the rendered result.',
      hint: 'resources: [../../base], namespace: shipit-prod, replicas: [{ name: api, count: 3 }], images: [{ name: ghcr.io/msaouab/shipit-api, newTag: sha-3f9c2a1 }].',
      starter: `resources:
  - ../../base
`,
      solution: `resources:
  - ../../base
namespace: shipit-prod
replicas:
  - name: api
    count: 3
images:
  - name: ghcr.io/msaouab/shipit-api
    newTag: sha-3f9c2a1
`,
      rules: [
        rule('Builds on the base', m => (JSON.stringify(at(m.doc, 'resources') ?? []).includes('../../base') ? true : 'resources should include ../../base')),
        rule('Everything lands in shipit-prod', m => (m.rendered.every(o => o.metadata?.namespace === 'shipit-prod') ? true : 'set namespace: shipit-prod')),
        rule('api runs 3 replicas', m => (Number(at(rendered(m, 'Deployment', 'api'), 'spec.replicas')) === 3 ? true : `the rendered api has ${at(rendered(m, 'Deployment', 'api'), 'spec.replicas')} replicas`)),
        rule('api image pinned to sha-3f9c2a1', m => (firstContainer(rendered(m, 'Deployment', 'api')).image === 'ghcr.io/msaouab/shipit-api:sha-3f9c2a1' ? true : `the rendered image is ${firstContainer(rendered(m, 'Deployment', 'api')).image}`)),
        rule('No copied base YAML', m => (m.objects.length === 1 && !at(m.doc, 'apiVersion') ? true : 'the overlay should only be a kustomization, not copied manifests')),
      ],
    }),
    quiz({
      slug: 'gitops-check',
      title: 'GitOps check',
      difficulty: 'Medium',
      prompt: 'Explain GitOps the way an interviewer expects.',
      hint: 'Who holds the credentials, what is the source of truth, and what happens to manual changes?',
      questions: [
        { q: 'In GitOps, who applies manifests to the cluster?', options: ['The CI pipeline with kubectl', 'An agent inside the cluster (Argo CD) that pulls from Git', 'Developers by hand', 'The container registry'], answer: 1, why: 'That is the pull model: CI never needs cluster credentials, and the cluster converges to whatever Git says.' },
        { q: 'Someone runs kubectl scale on an Argo CD app with selfHeal enabled. What happens?', options: ['The change stays', 'Argo CD detects the drift and reverts the cluster to what Git says', 'The app is deleted', 'Git is updated automatically'], answer: 1, why: 'Git is the source of truth. To change replicas, commit the change; self-heal undoes changes made around Git.' },
        { q: 'How do you roll back a bad production release in GitOps?', options: ['kubectl rollout undo in prod', 'git revert the commit that changed the prod overlay', 'Delete the Application', 'Rebuild the image'], answer: 1, why: 'A manual undo would be reverted by self-heal. Reverting the commit is auditable and Argo CD applies it.' },
        { q: 'What does prune: true do?', options: ['Deletes old images', 'Deletes cluster objects that were removed from Git', 'Removes failed pods', 'Shrinks replica counts'], answer: 1, why: 'Without prune, deleting a manifest from Git leaves the object running in the cluster forever.' },
      ],
    }),
  ],
};

export default gitopsModule;

import type { Module } from '../../types';
import type { ManifestInput } from '../../../engines/devops/manifest';
import { planRun, triggers, type WorkflowEvent } from '../../../engines/devops/manifest';
import { at, job, jobs, manifest, need, quiz, rule, steps, usesStep } from '../rules';

const PR: WorkflowEvent = { name: 'pull_request', ref: 'refs/pull/42/merge' };
const MAIN: WorkflowEvent = { name: 'push', ref: 'refs/heads/main' };

function ranJob(m: ManifestInput, ev: WorkflowEvent, test: (id: string) => boolean): boolean {
  if (!triggers(m.doc, ev)) return false;
  const plan = planRun(m.doc, ev);
  if (typeof plan === 'string') throw new Error(plan);
  return plan.some(j => test(j.id) && j.result === 'success');
}

const deployJobId = (m: ManifestInput) => Object.keys(jobs(m)).find(id => steps(jobs(m)[id]!).some(s => /deploy-pages|vercel/.test(String(s.uses ?? '') + String(s.run ?? ''))));

const deliveryModule: Module = {
  id: 'delivery',
  title: 'Deploying: Pages, Vercel & Services',
  tags: 'GitHub Pages · Vercel · previews · managed services',
  parents: ['gitops'],
  summary: 'Kubernetes is not always the answer. Know when a static host or a platform like Vercel is better, how to deploy there from CI, and how apps use external services.',
  lesson: [
    {
      heading: 'Pick the target by what you run',
      body: 'Choose the simplest platform that fits, and explain the trade-off:',
      list: [
        '<b>GitHub Pages</b>: static files only (HTML, a built SPA, docs). Free, deployed from a workflow, no server code.',
        '<b>Vercel / Netlify</b>: front ends and serverless functions. Deploy on every push, a <b>preview URL for every pull request</b>, CDN and TLS included. Little control, nothing to operate.',
        '<b>A VM</b> (Oracle, a VPS): full control, you patch and run everything (systemd, nginx).',
        '<b>Kubernetes</b>: many services, scaling, self-healing, GitOps. The most power and the most to operate.',
      ],
      note: { label: 'Interview tip', body: '"It depends" is only a good answer if you say on what: traffic, team size, number of services, state, budget, who is on call.' },
    },
    {
      heading: 'GitHub Pages from a workflow',
      body: 'Build the site, upload it as a Pages artifact, then deploy it. Pages deploys need two permissions (<code>pages: write</code>, <code>id-token: write</code>) and the <code>github-pages</code> environment. Only deploy from main: pull requests just build.',
      lang: 'yaml',
      flavor: 'workflow',
      filename: '.github/workflows/pages.yml',
      code: `name: Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: github-pages
    steps:
      - uses: actions/checkout@v5
      - run: npm ci && npm run build
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist
      - uses: actions/deploy-pages@v4`,
    },
    {
      heading: 'Vercel: previews for every pull request',
      body: 'Connecting a repo in the Vercel dashboard is enough for most projects: every push to main deploys production, every PR gets its own preview URL. From CI instead, use the Vercel CLI with a token stored as a <b>secret</b>.',
      lang: 'yaml',
      flavor: 'workflow',
      filename: '.github/workflows/vercel.yml',
      code: `name: Vercel
on:
  push:
    branches: [main]
  pull_request:
jobs:
  preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npx vercel@latest deploy --token=\${{ secrets.VERCEL_TOKEN }}
  production:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npx vercel@latest deploy --prod --token=\${{ secrets.VERCEL_TOKEN }}`,
    },
    {
      heading: 'External (managed) services',
      body: 'Databases, queues, email and storage are often bought, not run: a managed Postgres (Neon, Supabase, RDS), S3-compatible storage, an SMTP provider. The app reaches them through a URL and credentials injected as environment variables or Secrets, never hard-coded.',
      list: [
        'Locally and in CI: a container (compose, a GitHub Actions <code>services:</code> container).',
        'In Kubernetes: a Secret with the connection URL; or an <code>ExternalName</code> Service for a stable in-cluster name.',
        'Trade-off: less to operate and backups included, versus cost, vendor lock-in and network latency.',
      ],
      code: `kubectl get secret api-secrets -n shop -o jsonpath='{.data.DATABASE_URL}' | base64 -d`,
    },
  ],
  exercises: [
    manifest({
      slug: 'deploy-docs-to-github-pages',
      title: 'Deploy to GitHub Pages',
      difficulty: 'Medium',
      flavor: 'workflow',
      filename: '.github/workflows/pages.yml',
      prompt: 'Publish the built front end (<code>npm run build</code> outputs <code>dist/</code>) to GitHub Pages. The deployment must happen only for pushes to <code>main</code>, never for pull requests. Use <code>actions/upload-pages-artifact</code> with path <code>dist</code> and <code>actions/deploy-pages</code>, the <code>github-pages</code> environment, and the permissions Pages needs (<code>pages: write</code>, <code>id-token: write</code>), keeping <code>contents: read</code>.',
      hint: 'on: push: branches: [main]. permissions at the top level: contents: read, pages: write, id-token: write. The deploy job sets environment: github-pages.',
      starter: `name: Pages
on: [push, pull_request]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npm ci && npm run build
`,
      solution: `name: Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: github-pages
    steps:
      - uses: actions/checkout@v5
      - run: npm ci && npm run build
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist
      - uses: actions/deploy-pages@v4
`,
      rules: [
        rule('Deploys on a push to main', m => (ranJob(m, MAIN, id => id === deployJobId(m)) ? true : 'no job runs actions/deploy-pages for a push to main')),
        rule('Never deploys for a pull request', m => (!ranJob(m, PR, id => id === deployJobId(m)) ? true : 'a pull request would deploy to Pages')),
        rule('Uploads dist as the Pages artifact', m => {
          const s = need(usesStep(job(m, need(deployJobId(m), 'no job with actions/deploy-pages')), /actions\/upload-pages-artifact@/), 'no actions/upload-pages-artifact step');
          return s.with?.path === 'dist' ? true : `upload-pages-artifact path is ${s.with?.path ?? '(missing)'}`;
        }),
        rule('Uses the github-pages environment', m => {
          const env = at(job(m, need(deployJobId(m), 'no deploy job')), 'environment');
          const name = typeof env === 'string' ? env : (env as { name?: string } | undefined)?.name;
          return name === 'github-pages' ? true : 'the deploy job needs environment: github-pages';
        }),
        rule('Permissions: contents read, pages and id-token write', m => {
          const p = { ...((at(m.doc, 'permissions') as object) ?? {}), ...((at(job(m, need(deployJobId(m), 'no deploy job')), 'permissions') as object) ?? {}) } as Record<string, string>;
          return p.contents === 'read' && p.pages === 'write' && p['id-token'] === 'write' ? true : `permissions are ${JSON.stringify(p)}`;
        }),
      ],
    }),
    manifest({
      slug: 'vercel-previews-and-production',
      title: 'Vercel previews and production',
      difficulty: 'Medium',
      flavor: 'workflow',
      filename: '.github/workflows/vercel.yml',
      prompt: 'Deploy to Vercel from CI. Pull requests get a <b>preview</b> deployment (<code>vercel deploy</code>), pushes to <code>main</code> deploy <b>production</b> (<code>vercel deploy --prod</code>), and no other event deploys anything. The token comes from the <code>VERCEL_TOKEN</code> secret; it must not appear in the file.',
      hint: 'on: push to main and pull_request. A preview job with if: github.event_name == \'pull_request\' and a production job with if: github.event_name == \'push\'. Pass --token=${{ secrets.VERCEL_TOKEN }}.',
      starter: `name: Vercel
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npx vercel@latest deploy --prod --token=vcp_1234secret
`,
      solution: `name: Vercel
on:
  push:
    branches: [main]
  pull_request:
jobs:
  preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npx vercel@latest deploy --token=\${{ secrets.VERCEL_TOKEN }}
  production:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npx vercel@latest deploy --prod --token=\${{ secrets.VERCEL_TOKEN }}
`,
      rules: [
        rule('No token written in the file', m => (/token=(?!\$\{\{)/.test(m.text) ? 'a token is written in the workflow; use ${{ secrets.VERCEL_TOKEN }}' : true)),
        rule('Every deploy uses the VERCEL_TOKEN secret', m => {
          const runs = Object.values(jobs(m)).flatMap(j => steps(j)).map(s => String(s.run ?? '')).filter(r => /vercel/.test(r));
          if (!runs.length) return 'no step runs vercel';
          return runs.every(r => /secrets\.VERCEL_TOKEN/.test(r)) ? true : 'pass --token=${{ secrets.VERCEL_TOKEN }} to every vercel command';
        }),
        rule('A pull request deploys a preview, not production', m => {
          const prodRuns = (ev: WorkflowEvent) => ranJob(m, ev, id => steps(jobs(m)[id]!).some(s => /vercel.*--prod/.test(String(s.run ?? ''))));
          const previewRuns = (ev: WorkflowEvent) => ranJob(m, ev, id => steps(jobs(m)[id]!).some(s => /vercel(@\S+)? deploy(?!.*--prod)/.test(String(s.run ?? ''))));
          if (prodRuns(PR)) return 'a pull request would deploy production';
          return previewRuns(PR) ? true : 'no preview deployment runs for a pull request';
        }),
        rule('A push to main deploys production, not a preview', m => {
          const prodRuns = ranJob(m, MAIN, id => steps(jobs(m)[id]!).some(s => /vercel.*--prod/.test(String(s.run ?? ''))));
          const previewRuns = ranJob(m, MAIN, id => steps(jobs(m)[id]!).some(s => /vercel(@\S+)? deploy(?!.*--prod)/.test(String(s.run ?? ''))));
          if (!prodRuns) return 'a push to main does not deploy production';
          return previewRuns ? 'a push to main also deploys a preview' : true;
        }),
        rule('Pushes to other branches deploy nothing', m => (!ranJob(m, { name: 'push', ref: 'refs/heads/feature/login' }, () => true) ? true : 'a push to a feature branch triggers a deployment')),
      ],
    }),
    quiz({
      slug: 'choose-the-platform',
      title: 'Choose the platform',
      difficulty: 'Medium',
      prompt: 'Pick the deployment target an experienced engineer would choose, and know why.',
      hint: 'Static vs dynamic, one service vs many, and how much you want to operate.',
      questions: [
        { q: 'A documentation site built to static HTML. Best target?', options: ['A Kubernetes cluster', 'GitHub Pages (or any static host)', 'A VM with nginx you patch yourself', 'A managed database'], answer: 1, why: 'Static files need no server. Pages is free, deploys from a workflow, and there is nothing to operate.' },
        { q: 'A Next.js front end where reviewers want to try every pull request. Best fit?', options: ['Vercel, for preview URLs per pull request', 'A single VM', 'GitHub Pages', 'A CronJob'], answer: 0, why: 'Preview deployments per PR are Vercel\'s core feature; it also handles server rendering, CDN and TLS.' },
        { q: 'Ten services, autoscaling, and a team that already runs Argo CD. Best fit?', options: ['GitHub Pages', 'Kubernetes with GitOps', 'Vercel for everything', 'One big VM'], answer: 1, why: 'Many interdependent services with scaling and rollout needs are what Kubernetes is for, and the team can operate it.' },
        { q: 'How should the app reach a managed Postgres in production?', options: ['Hard-code the URL in the code', 'Inject the connection URL as a Secret / environment variable', 'Bake it into the Docker image', 'Put it in the README'], answer: 1, why: 'Configuration and credentials come from the environment. The same image then runs in dev, preview and prod.' },
      ],
    }),
  ],
};

export default deliveryModule;

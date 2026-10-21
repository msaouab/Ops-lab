import type { Module } from '../../types';
import type { ManifestInput } from '../../../engines/devops/manifest';
import { planRun, triggers, type WorkflowEvent } from '../../../engines/devops/manifest';
import { at, job, manifest, need, quiz, rule, runStep, stepIndex, steps, usesStep } from '../rules';

const PR: WorkflowEvent = { name: 'pull_request', ref: 'refs/pull/42/merge' };
const MAIN: WorkflowEvent = { name: 'push', ref: 'refs/heads/main' };
const BRANCH: WorkflowEvent = { name: 'push', ref: 'refs/heads/feature/login' };

/** Did `jobId` run (not skipped) for this event? */
function ran(m: ManifestInput, ev: WorkflowEvent, jobId: string): boolean {
  if (!triggers(m.doc, ev)) return false;
  const plan = planRun(m.doc, ev);
  if (typeof plan === 'string') throw new Error(plan);
  return plan.some(j => j.id === jobId && j.result === 'success');
}

const cicdModule: Module = {
  id: 'cicd',
  title: 'CI/CD with GitHub Actions',
  tags: 'workflow · jobs · needs · matrix · secrets · GHCR',
  parents: ['containers'],
  summary: 'Every push is tested automatically (CI), and every merge to main produces an image ready to deploy (CD). Write the workflows that do it.',
  lesson: [
    {
      heading: 'CI and CD',
      body: '<b>Continuous integration</b>: every push and pull request is built and tested, so broken code never reaches main. <b>Continuous delivery</b>: every change on main produces a deployable artifact (an image tagged with the commit), and deploying is one automatic step.',
      list: [
        'A <b>workflow</b> is a YAML file in <code>.github/workflows/</code>.',
        '<code>on:</code> says which events start it (push, pull_request, a schedule, a manual button).',
        '<b>Jobs</b> run in parallel on fresh runners unless <code>needs:</code> orders them.',
        'Each job has <b>steps</b>: <code>uses:</code> an action someone published, or <code>run:</code> a shell command.',
      ],
    },
    {
      heading: 'Your first workflow',
      body: 'Run shows which jobs would run for a pull request, a push to main, a push to a feature branch and a tag. Check the CI job runs on all of them.',
      lang: 'yaml',
      flavor: 'workflow',
      filename: '.github/workflows/ci.yml',
      code: `name: CI
on:
  push:
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test`,
    },
    {
      heading: 'Ordering jobs and conditions',
      body: '<code>needs: test</code> runs a job only after <code>test</code> succeeds. <code>if:</code> skips a job unless a condition holds: build images only for pushes to main, never for pull requests from forks.',
      lang: 'yaml',
      flavor: 'workflow',
      filename: '.github/workflows/ci.yml',
      code: `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npm ci && npm test
  build:
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: docker build -t shipit-web .`,
    },
    {
      heading: 'Secrets, permissions and the registry',
      body: 'Never put credentials in the YAML. Repository <b>secrets</b> arrive as <code>${{ secrets.NAME }}</code>, and for GHCR the built-in <code>GITHUB_TOKEN</code> is enough, if the job has <code>permissions: packages: write</code>. Tag images with the commit SHA so every deployment is traceable.',
      list: [
        '<code>permissions:</code> at the top: start from <code>contents: read</code> and grant more per job (least privilege).',
        '<code>docker/login-action</code> + <code>docker/build-push-action</code> build and push in two steps.',
        '<code>concurrency:</code> cancels older runs of the same branch.',
        'Pin third-party actions (a version tag, or a commit SHA for the paranoid).',
      ],
    },
    {
      heading: 'Matrix builds',
      body: 'A <code>strategy.matrix</code> runs the same job for several versions in parallel. Here the tests run on Node 20 and 22.',
      lang: 'yaml',
      flavor: 'workflow',
      filename: '.github/workflows/test.yml',
      code: `name: Test
on: pull_request
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: \${{ matrix.node }}
      - run: npm ci && npm test`,
    },
  ],
  exercises: [
    manifest({
      slug: 'ci-for-every-change',
      title: 'CI for every change',
      difficulty: 'Easy',
      flavor: 'workflow',
      filename: '.github/workflows/ci.yml',
      prompt: 'Write a workflow named <code>CI</code> that runs on every <b>push</b> and every <b>pull request</b>. One job <code>test</code> on <code>ubuntu-latest</code>: check out the code, set up Node <code>22</code> with npm caching, install with <code>npm ci</code>, then run <code>npm test</code>.',
      hint: 'on: [push, pull_request]. Steps: actions/checkout, actions/setup-node with node-version: 22 and cache: npm, run: npm ci, run: npm test.',
      starter: `name: CI
on:
  push:
    branches: [main]
jobs:
  test:
    steps:
      - run: npm install
`,
      solution: `name: CI
on:
  push:
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
`,
      rules: [
        rule('Runs on pull requests', m => (ran(m, PR, 'test') ? true : 'the test job does not run for a pull request')),
        rule('Runs on pushes to any branch', m => (ran(m, MAIN, 'test') && ran(m, BRANCH, 'test') ? true : 'the test job should run for pushes to main and to feature branches')),
        rule('test runs on ubuntu-latest', m => (at(job(m, 'test'), 'runs-on') === 'ubuntu-latest' ? true : 'runs-on should be ubuntu-latest')),
        rule('Checks out the code first', m => (stepIndex(job(m, 'test'), s => /actions\/checkout@/.test(String(s.uses ?? ''))) === 0 ? true : 'the first step should be actions/checkout')),
        rule('Node 22 with npm cache', m => {
          const s = need(usesStep(job(m, 'test'), /actions\/setup-node@/), 'no actions/setup-node step');
          return String(s.with?.['node-version']) === '22' && s.with?.cache === 'npm' ? true : `setup-node with is ${JSON.stringify(s.with ?? {})}`;
        }),
        rule('npm ci, then npm test', m => {
          const j = job(m, 'test');
          const ci = stepIndex(j, s => /\bnpm ci\b/.test(String(s.run ?? '')));
          const t = stepIndex(j, s => /\bnpm test\b/.test(String(s.run ?? '')));
          if (ci < 0) return 'no run: npm ci (npm install can change the lock file)';
          return t > ci ? true : 'npm test must run after npm ci';
        }),
      ],
    }),
    manifest({
      slug: 'build-and-push-on-main',
      title: 'Build and push on main',
      difficulty: 'Medium',
      flavor: 'workflow',
      filename: '.github/workflows/ci.yml',
      prompt: 'Extend CI with continuous delivery. Keep the <code>test</code> job for pushes and pull requests. Add a job <code>image</code> that runs <b>only after test passes</b> and <b>only for pushes to main</b>. It logs in to <code>ghcr.io</code> with <code>GITHUB_TOKEN</code> and builds and pushes <code>ghcr.io/msaouab/shipit-web</code> tagged with <code>${{ github.sha }}</code>. Give it exactly the permissions it needs: <code>contents: read</code> and <code>packages: write</code>.',
      hint: 'image: needs: test, if: github.event_name == \'push\' && github.ref == \'refs/heads/main\', permissions: { contents: read, packages: write }, steps: checkout, docker/login-action with password ${{ secrets.GITHUB_TOKEN }}, docker/build-push-action with push: true and tags.',
      starter: `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npm ci && npm test
  image:
    runs-on: ubuntu-latest
    steps:
      - run: docker login ghcr.io -u me -p hunter2
      - run: docker build -t ghcr.io/msaouab/shipit-web:latest . && docker push ghcr.io/msaouab/shipit-web:latest
`,
      solution: `name: CI
on: [push, pull_request]
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npm ci && npm test
  image:
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v5
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ghcr.io/msaouab/shipit-web:\${{ github.sha }}
`,
      rules: [
        rule('test still runs for pull requests and pushes', m => (ran(m, PR, 'test') && ran(m, MAIN, 'test') ? true : 'the test job should run for pull requests and pushes')),
        rule('image waits for test', m => (JSON.stringify(at(job(m, 'image'), 'needs') ?? '').includes('test') ? true : 'image should have needs: test')),
        rule('image runs for a push to main', m => (ran(m, MAIN, 'image') ? true : 'image does not run for a push to main')),
        rule('image never runs for a pull request or another branch', m => (!ran(m, PR, 'image') && !ran(m, BRANCH, 'image') ? true : 'image runs outside pushes to main: pull requests could push images')),
        rule('Least-privilege permissions on image', m => {
          const p = at(job(m, 'image'), 'permissions') as Record<string, string> | undefined;
          return p?.packages === 'write' && p?.contents === 'read' ? true : `image permissions are ${JSON.stringify(p ?? null)}; expected contents: read and packages: write`;
        }),
        rule('Logs in with GITHUB_TOKEN, no password in the file', m => {
          if (/hunter2|-p\s+\S+/.test(m.text)) return 'a password is written in the workflow';
          const s = need(usesStep(job(m, 'image'), /docker\/login-action@/), 'no docker/login-action step');
          return s.with?.registry === 'ghcr.io' && /secrets\.GITHUB_TOKEN/.test(String(s.with?.password)) ? true : 'login to registry ghcr.io with password ${{ secrets.GITHUB_TOKEN }}';
        }),
        rule('Pushes the image tagged with the commit SHA', m => {
          const s = need(usesStep(job(m, 'image'), /docker\/build-push-action@/), 'no docker/build-push-action step');
          if (String(s.with?.push) !== 'true') return 'build-push-action needs push: true';
          return /ghcr\.io\/msaouab\/shipit-web:\$\{\{\s*github\.sha\s*\}\}/.test(String(s.with?.tags)) ? true : `tags is "${s.with?.tags}"; tag with \${{ github.sha }}, not latest`;
        }),
      ],
    }),
    manifest({
      slug: 'test-on-two-node-versions',
      title: 'Test on two Node versions',
      difficulty: 'Easy',
      flavor: 'workflow',
      filename: '.github/workflows/test.yml',
      prompt: 'Pull requests must pass on both Node <code>20</code> and <code>22</code>. Write a workflow that runs on <code>pull_request</code> only, with a <code>test</code> job using a <b>matrix</b> over those two versions, passing the version to <code>actions/setup-node</code>, then running <code>npm ci</code> and <code>npm test</code>.',
      hint: 'strategy: { matrix: { node: [20, 22] } } and node-version: ${{ matrix.node }}.',
      starter: `name: Test
on: pull_request
jobs:
  test-node-20:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 20
      - run: npm ci && npm test
`,
      solution: `name: Test
on: pull_request
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: \${{ matrix.node }}
      - run: npm ci
      - run: npm test
`,
      rules: [
        rule('Runs for pull requests only', m => (ran(m, PR, 'test') && !triggers(m.doc, MAIN) ? true : 'the workflow should trigger on pull_request only')),
        rule('Matrix over Node 20 and 22', m => {
          const n = at(job(m, 'test'), 'strategy.matrix.node') as unknown[] | undefined;
          return Array.isArray(n) && n.map(String).sort().join(',') === '20,22' ? true : `strategy.matrix.node is ${JSON.stringify(n ?? null)}`;
        }),
        rule('setup-node uses the matrix value', m => {
          const s = need(usesStep(job(m, 'test'), /actions\/setup-node@/), 'no actions/setup-node step');
          return /\$\{\{\s*matrix\.node\s*\}\}/.test(String(s.with?.['node-version'])) ? true : 'node-version should be ${{ matrix.node }}';
        }),
        rule('Installs with npm ci and runs the tests', m => (runStep(job(m, 'test'), /npm ci/) && runStep(job(m, 'test'), /npm test/) ? true : 'run npm ci and npm test')),
        rule('One job, not one copy per version', m => (steps(job(m, 'test')).length > 0 && Object.keys(at(m.doc, 'jobs') as object).length === 1 ? true : 'use a single matrix job instead of duplicating jobs')),
      ],
    }),
    quiz({
      slug: 'pipelines-check',
      title: 'Pipelines check',
      difficulty: 'Medium',
      prompt: 'CI/CD design questions from real interviews.',
      hint: 'Think about what runs on untrusted code, where credentials live, and how you trace a running version back to a commit.',
      questions: [
        { q: 'Why tag images with the git SHA rather than latest?', options: ['SHA tags are shorter', 'Every deployment then maps to an exact commit, and rollbacks pick a precise image', 'latest is not allowed on GHCR', 'It makes builds faster'], answer: 1, why: 'A moving tag hides what is running. An immutable SHA tag makes deployments reproducible and auditable.' },
        { q: 'Why should a pull request workflow not push images or deploy?', options: ['It is slower', 'PR code is untrusted until reviewed, and fork PRs must not get write credentials', 'GitHub forbids it', 'Images are too big'], answer: 1, why: 'Only reviewed code on main should produce deployable artifacts. That is why pushes are gated by if: and permissions.' },
        { q: 'What does needs: test do?', options: ['Installs the test package', 'Runs the job only after the test job succeeded', 'Runs both in parallel', 'Skips tests'], answer: 1, why: 'Jobs run in parallel by default; needs builds the order and stops the chain when a dependency fails.' },
        { q: 'Where does a registry password belong?', options: ['In the workflow YAML', 'In a repository secret, used as ${{ secrets.NAME }} (or GITHUB_TOKEN for GHCR)', 'In the Dockerfile', 'In the README'], answer: 1, why: 'Secrets are encrypted, masked in logs, and not visible to fork PRs. Anything in the YAML is public to everyone who can read the repo.' },
      ],
    }),
  ],
};

export default cicdModule;

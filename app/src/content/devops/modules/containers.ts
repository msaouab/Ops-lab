import type { Module } from '../../types';
import { at, eq, indexOf, ins, lastStage, manifest, need, quiz, rule, stages } from '../rules';

const NODE_APP = `{
  "name": "shipit-web",
  "scripts": { "build": "vite build", "start": "node server.js" },
  "dependencies": { "express": "^5.1.0" }
}`;

const containersModule: Module = {
  id: 'containers',
  title: 'Containers & Docker',
  tags: 'image · layer · Dockerfile · multi-stage · compose',
  parents: [],
  summary: 'Package an app with everything it needs, so it runs the same on a laptop, in CI and in the cluster. Write Dockerfiles that are small, cached and safe.',
  lesson: [
    {
      heading: 'Image vs container',
      body: 'An <b>image</b> is a read-only template: a filesystem plus settings (user, port, start command). A <b>container</b> is a running process started from an image, with its own writable layer on top. One image, many containers. Images live in a <b>registry</b> (Docker Hub, GHCR) under a name and a <b>tag</b>: <code>ghcr.io/msaouab/shipit-api:1.4.0</code>.',
      list: [
        '<code>docker build -t app:1.0 .</code>: image from a Dockerfile',
        '<code>docker run -p 8080:80 app:1.0</code>: container from an image',
        '<code>docker push ghcr.io/me/app:1.0</code>: share it through a registry',
      ],
      note: { label: 'Interview tip', body: 'Never deploy <code>:latest</code>. A tag that moves makes "what is running?" unanswerable and rollbacks impossible. Tag with a version or the git SHA.' },
    },
    {
      heading: 'Each instruction is a cached layer',
      body: 'Docker caches every layer and rebuilds from the first one that changed. So copy the dependency manifest and install first, and copy the source code last: editing code then reuses the slow install layer.',
      lang: 'dockerfile',
      filename: 'Dockerfile',
      code: `FROM node:22-alpine
WORKDIR /app
# dependencies change rarely: their layer stays cached
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
# source changes often: copied last
COPY . .
USER node
EXPOSE 3000
CMD ["node", "server.js"]`,
    },
    {
      heading: 'Multi-stage builds: build fat, ship thin',
      body: 'Build tools (compilers, dev dependencies) are needed to <i>build</i>, not to <i>run</i>. A multi-stage Dockerfile builds in one stage and copies only the result into a small final stage. The final image is smaller, faster to pull, and has less to attack.',
      lang: 'dockerfile',
      filename: 'Dockerfile',
      code: `FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.29-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80`,
    },
    {
      heading: 'Safe defaults',
      body: 'The habits reviewers look for, and the linter in the exercises checks:',
      list: [
        '<b>Pin</b> base images (<code>node:22-alpine</code>, not <code>node</code>)',
        '<b>Run as non-root</b>: <code>USER node</code> (or <code>USER 10001</code>)',
        '<b>JSON form</b> for <code>CMD</code> so your process receives <code>SIGTERM</code> and shuts down cleanly',
        '<b>No secrets</b> in <code>ENV</code> or <code>COPY</code>: anyone who pulls the image can read them',
        '<code>npm ci</code> rather than <code>npm install</code>, and a <code>.dockerignore</code> for <code>node_modules</code> and <code>.git</code>',
      ],
      lang: 'dockerfile',
      filename: 'Dockerfile.bad',
      code: `FROM node
ADD . /app
RUN cd /app && npm install
ENV API_TOKEN=abc123
CMD node server.js`,
      note: { label: 'Try it', body: 'Run this bad Dockerfile: the build preview lists every problem the linter finds. That list is exactly what a code review would say.' },
    },
    {
      heading: 'Several containers: docker compose',
      body: 'An app is rarely one container: API, database, cache. <code>compose.yaml</code> describes them together, with ports, environment and start order. <code>depends_on</code> with <code>condition: service_healthy</code> waits until the database actually answers, which requires a <code>healthcheck</code> on it.',
      lang: 'yaml',
      flavor: 'compose',
      filename: 'compose.yaml',
      code: `services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_PASSWORD: dev
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 5s
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgres://postgres:dev@db:5432/postgres
    depends_on:
      db:
        condition: service_healthy`,
    },
  ],
  exercises: [
    manifest({
      slug: 'dockerfile-for-a-node-app',
      title: 'Dockerfile for a Node app',
      difficulty: 'Easy',
      flavor: 'dockerfile',
      filename: 'Dockerfile',
      files: { 'package.json': NODE_APP },
      prompt: 'Write a Dockerfile for the <code>shipit-web</code> Node app (its <code>package.json</code> is shown in the editor bar). It must: use a <b>pinned</b> <code>node:22</code> image, install dependencies with <code>npm ci</code> <b>before</b> copying the source (for caching), run as the <code>node</code> user, expose port <code>3000</code>, and start with <code>node server.js</code> in JSON form.',
      hint: 'FROM node:22-alpine, WORKDIR /app, COPY package*.json ./, RUN npm ci, COPY . ., USER node, EXPOSE 3000, CMD ["node", "server.js"].',
      starter: `FROM node
COPY . .
RUN npm install
CMD node server.js
`,
      solution: `FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
USER node
EXPOSE 3000
CMD ["node", "server.js"]
`,
      rules: [
        rule('Base image is a pinned node:22', m => (/^node:22[\w.-]*$/.test(lastStage(m).base) ? true : `FROM is "${lastStage(m).base}"; use a pinned node:22 tag like node:22-alpine`)),
        rule('Dependencies installed with npm ci', m => (ins(m, 'RUN', { match: /\bnpm ci\b/ }).length ? true : 'no RUN npm ci')),
        rule('Install happens before the source is copied', m => {
          const install = need(ins(m, 'RUN', { match: /\bnpm ci\b/ })[0], 'no RUN npm ci');
          const copyAll = ins(m, 'COPY', { match: /^\.\s/ })[0];
          if (!copyAll) return 'no COPY . . for the source';
          const manifestCopy = ins(m, 'COPY', { match: /package/ })[0];
          if (!manifestCopy || manifestCopy.line > install.line) return 'copy package.json (and the lock file) before RUN npm ci';
          return copyAll.line > install.line ? true : 'COPY . . comes before npm ci, so every code change reinstalls everything';
        }),
        rule('Runs as the node user', m => eq(need(m.image, 'no final image').user, 'node', 'the final USER')),
        rule('Exposes port 3000', m => (need(m.image, 'no final image').expose.includes('3000') ? true : 'EXPOSE 3000 is missing')),
        rule('Starts with node server.js in JSON form', m => eq(need(m.image, 'no final image').cmd, JSON.stringify(['node', 'server.js']), 'CMD')),
      ],
    }),
    manifest({
      slug: 'multi-stage-static-site',
      title: 'Multi-stage build for a static site',
      difficulty: 'Medium',
      flavor: 'dockerfile',
      filename: 'Dockerfile',
      files: { 'package.json': NODE_APP },
      prompt: 'The web app is built with <code>npm run build</code> into <code>/app/dist</code>, then served as static files. Write a <b>two-stage</b> Dockerfile: a stage named <code>build</code> from a pinned <code>node:22</code> image that installs with <code>npm ci</code> and builds, then a final stage from a pinned <code>nginx</code> image that copies <code>/app/dist</code> from <code>build</code> into <code>/usr/share/nginx/html</code>. Node must not be in the final image.',
      hint: 'FROM node:22-alpine AS build … RUN npm run build, then FROM nginx:1.29-alpine and COPY --from=build /app/dist /usr/share/nginx/html.',
      starter: `FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 3000
CMD ["npx", "serve", "dist"]
`,
      solution: `FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.29-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
`,
      rules: [
        rule('Two stages', m => (stages(m).length === 2 ? true : `found ${stages(m).length} stage(s); expected a build stage and a final stage`)),
        rule('First stage is named build, from a pinned node:22', m => {
          const s = need(stages(m)[0], 'no FROM');
          if (s.name !== 'build') return `the first stage is named "${s.name ?? '(none)'}"; add AS build`;
          return /^node:22[\w.-]*$/.test(s.base) ? true : `the build stage uses "${s.base}"; use a pinned node:22 tag`;
        }),
        rule('The build stage runs npm ci and npm run build', m =>
          ins(m, 'RUN', { stage: 0, match: /npm ci/ }).length && ins(m, 'RUN', { stage: 0, match: /npm run build/ }).length ? true : 'the build stage needs RUN npm ci and RUN npm run build'),
        rule('Final stage is a pinned nginx', m => (/^nginx:[\w.-]+$/.test(lastStage(m).base) && !/:latest$/.test(lastStage(m).base) ? true : `the final stage uses "${lastStage(m).base}"; use a pinned nginx tag`)),
        rule('Copies only the built files from the build stage', m => {
          const c = ins(m, 'COPY', { stage: 'last' }).find(i => i.flags.from === 'build');
          if (!c) return 'no COPY --from=build in the final stage';
          return /\/app\/dist\/?\s+\/usr\/share\/nginx\/html/.test(c.args) ? true : `COPY --from=build copies "${c.args}"; copy /app/dist to /usr/share/nginx/html`;
        }),
      ],
    }),
    manifest({
      slug: 'fix-the-dockerfile',
      title: 'Review and fix a Dockerfile',
      difficulty: 'Medium',
      flavor: 'dockerfile',
      filename: 'Dockerfile',
      prompt: 'A teammate opened a pull request with this Dockerfile for the Python API. Fix every problem the review found: an unpinned base image, <code>ADD</code> for local files, <code>cd</code> in <code>RUN</code>, a secret baked into the image, root at runtime, and a shell-form <code>CMD</code>. Keep the same app: <code>python:3.13-slim</code>, port <code>8000</code>, started with <code>uvicorn app.main:app --host 0.0.0.0</code>. Run it to see the linter warnings disappear one by one.',
      hint: 'FROM python:3.13-slim, WORKDIR /srv, COPY not ADD, no ENV with the token (it is passed at runtime), a USER, and CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"].',
      starter: `FROM python
ADD . /srv
RUN cd /srv && pip install -r requirements.txt
ENV DATABASE_PASSWORD=hunter2
EXPOSE 8000
CMD uvicorn app.main:app --host 0.0.0.0
`,
      solution: `FROM python:3.13-slim
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd --uid 10001 --no-create-home app
USER 10001
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]
`,
      rules: [
        rule('No linter warnings', m => (m.warnings.length === 0 ? true : m.warnings[0]!)),
        rule('Still the same Python 3.13 slim base', m => eq(lastStage(m).base, 'python:3.13-slim', 'the base image')),
        rule('Still exposes 8000', m => (need(m.image, 'no final image').expose.includes('8000') ? true : 'EXPOSE 8000 is missing')),
        rule('Still starts uvicorn', m => (/uvicorn.*app\.main:app/.test(need(m.image, 'no final image').cmd ?? '') ? true : 'CMD no longer starts uvicorn app.main:app')),
        rule('Installs dependencies before copying the code', m => {
          const pip = indexOf(m, 'RUN', /pip install/);
          const all = indexOf(m, 'COPY', /^\.\s/);
          return pip >= 0 && all >= 0 && pip < all ? true : 'COPY requirements.txt and pip install first, then COPY . .';
        }),
      ],
    }),
    manifest({
      slug: 'compose-api-and-database',
      title: 'Compose an API with its database',
      difficulty: 'Medium',
      flavor: 'compose',
      filename: 'compose.yaml',
      prompt: 'Write a <code>compose.yaml</code> with two services. <code>db</code>: image <code>postgres:17-alpine</code>, environment <code>POSTGRES_PASSWORD</code>, and a <code>healthcheck</code> running <code>pg_isready</code>. <code>api</code>: built from <code>.</code>, publishing port <code>8000:8000</code>, and starting only once <code>db</code> is <b>healthy</b> (not merely started).',
      hint: 'Under api, depends_on: { db: { condition: service_healthy } }. That condition only works if db has a healthcheck.',
      starter: `services:
  api:
    build: .
    depends_on:
      - db
`,
      solution: `services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_PASSWORD: dev
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 5s
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgres://postgres:dev@db:5432/postgres
    depends_on:
      db:
        condition: service_healthy
`,
      rules: [
        rule('db uses postgres:17-alpine', m => eq(at(m.doc, 'services.db.image'), 'postgres:17-alpine', 'services.db.image')),
        rule('db sets POSTGRES_PASSWORD', m => {
          const env = at(m.doc, 'services.db.environment');
          const has = Array.isArray(env) ? env.some(e => String(e).startsWith('POSTGRES_PASSWORD=')) : env && typeof env === 'object' && 'POSTGRES_PASSWORD' in env;
          return has ? true : 'services.db.environment has no POSTGRES_PASSWORD';
        }),
        rule('db has a pg_isready healthcheck', m => (/pg_isready/.test(JSON.stringify(at(m.doc, 'services.db.healthcheck.test') ?? '')) ? true : 'services.db.healthcheck.test should run pg_isready')),
        rule('api is built from .', m => {
          const b = at(m.doc, 'services.api.build');
          return b === '.' || (b && typeof b === 'object' && (b as { context?: string }).context === '.') ? true : 'services.api.build should be "."';
        }),
        rule('api publishes 8000:8000', m => (JSON.stringify(at(m.doc, 'services.api.ports') ?? []).includes('8000:8000') ? true : 'services.api.ports should include "8000:8000"')),
        rule('api waits for db to be healthy', m => eq(at(m.doc, 'services.api.depends_on.db.condition'), 'service_healthy', 'services.api.depends_on.db.condition')),
      ],
    }),
    quiz({
      slug: 'docker-concepts',
      title: 'Docker concepts check',
      difficulty: 'Easy',
      prompt: 'Five questions an interviewer asks to see whether you really use Docker.',
      hint: 'Think about layers and caching, what ends up inside the final image, and how a container receives signals.',
      questions: [
        { q: 'You change one line of source code. Which Dockerfile order rebuilds fastest?', options: ['COPY . . then RUN npm ci', 'COPY package*.json, RUN npm ci, then COPY . .', 'RUN npm ci then COPY package*.json', 'Order does not matter, Docker always rebuilds everything'], answer: 1, why: 'Layers are cached until the first changed one. Installing from the manifest first keeps the slow install layer cached when only code changes.' },
        { q: 'Why use a multi-stage build?', options: ['To run several processes in one container', 'To build with heavy tools but ship a small final image without them', 'To deploy to several registries', 'Because a single stage cannot expose ports'], answer: 1, why: 'Only the last stage becomes the image. Compilers and dev dependencies stay in the build stage.' },
        { q: 'CMD node server.js (shell form) vs CMD ["node", "server.js"]. What changes?', options: ['Nothing', 'Shell form runs /bin/sh as PID 1, so node does not receive SIGTERM on stop', 'JSON form cannot read environment variables', 'Shell form is faster'], answer: 1, why: 'With the shell form, sh is PID 1 and does not forward signals: the container is killed after the grace period instead of shutting down cleanly.' },
        { q: 'Where should a database password come from?', options: ['ENV in the Dockerfile', 'A file COPYed into the image', 'An environment variable or secret set when the container runs', 'A build ARG'], answer: 2, why: 'Anything in the image (ENV, files, even ARG in history) can be read by whoever pulls it. Secrets are injected at runtime.' },
        { q: 'What does depends_on: [db] guarantee in compose?', options: ['db is ready to accept connections', 'db container has been started (not necessarily ready)', 'db is on the same host port', 'api restarts when db restarts'], answer: 1, why: 'Plain depends_on only orders start-up. Use condition: service_healthy plus a healthcheck to wait for readiness.' },
      ],
    }),
  ],
};

export default containersModule;

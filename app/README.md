# Ops Lab app

The web app for this repo: tracks of short lessons you can run, followed by
problems that grade themselves. Everything runs in the browser; there is no
server.

| Track | Status |
|---|---|
| SQL | Ready: 13 topics, 57 graded problems, playground (SQLite via sql.js) |
| Algorithms | Ready: 15 pattern lessons, 52 problems graded by the repo's own pytest files, Python scratchpad (CPython 3.14 via Pyodide) |
| DevOps | Ready: 9 topics, 38 exercises (kubectl on a simulated cluster, Dockerfiles, Kubernetes YAML, GitHub Actions, Argo CD, kustomize, quizzes), cluster playground |
| Python, Interview | Planned (shown as cards on the home page) |

## Run it

```bash
cd app
npm ci
npm run dev        # http://localhost:5173
```

| Command | Does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Content + checker tests: every reference solution must pass, every starter must fail, every lesson example must run |
| `npm run typecheck` | TypeScript, strict |
| `npm run build` | Type-check, then a static build in `dist/` that works from any folder |

`.npmrc` sets `legacy-peer-deps`: npm 10 crashes resolving vitest's optional
peer ranges. Every peer the app needs is listed in `package.json`.

## How it's organised

```
src/
  content/
    types.ts            Track → Module → LessonSection / Exercise (the content model)
    tracks.ts           every track, ready or planned
    sql/                SQL track: seed.sql, one file per module, content tests
    algorithms/         Algorithms track: one file per pattern, problems imported from A2
    devops/             DevOps track: one file per topic, rules.ts (helpers for checks)
  engines/sql/          sql.js wrapper, the checker (judge), playground state
  engines/python/       runner.py (grading in Python), Web Worker, client with time limits
  engines/devops/       simulated cluster + kubectl, Dockerfile/YAML/workflow/kustomize parsers and previews, judges
  state/                learner profiles + progress (localStorage), theme
  components/           top bar, roadmap, lesson, CodeMirror editor, result tables
  pages/                home, track roadmap, module, exercise workspace, playground
```

## How the Algorithms track is graded

- `runner.py` runs inside Pyodide (Python 3.14 compiled to WebAssembly) in a Web
  Worker. It imports your code as a module, runs the `test_*` functions from the
  repo's own `A2-online-test/**/test_*.py`, and explains failures
  (`expected 3, got 4`, or the line in your code that raised).
- **Run** executes the sample tests (`test_examples`); **Submit** runs them all.
- A run over 8 s is stopped (too slow, or an infinite loop): the worker is
  terminated and a fresh one boots for the next run.
- Pyodide (~12 MB) loads from jsDelivr on first use, then the browser caches it.
- `src/content/algorithms/problems.generated.ts` holds each problem's statement,
  starter and reference solution, generated from the stubs in `A2-online-test`.
  The tests are not copied: they are read from the repo at build time.

## How the DevOps track is graded

- **kubectl tasks** run in a terminal on a simulated 3-node k3d cluster with ShipIt
  installed. Scenarios replay a week of history, then an incident (bad image tag,
  missing config, OOM, wrong probe, empty Service…). *Output* tasks compare your last
  command's output; *state* tasks replay your whole session and check the cluster.
- **Files** (Dockerfile, Kubernetes YAML, compose, workflows, Argo CD, kustomize)
  are graded by rules with a reason for every failing one. **Run** previews them:
  a `docker build`, a `kubectl apply`, a simulated GitHub Actions run per event.
- `npm test` checks every reference solution passes, every starter fails, every
  broken scenario is really broken before the fix, and every lesson example runs.

## Adding content

- **A SQL problem:** add an entry to `exercises` in `src/content/sql/modules/<topic>.ts`.
  `npm test` runs its solution through the checker, so a broken exercise fails CI.
- **An algorithm problem:** add the stub and its `test_*.py` under `A2-online-test/`,
  an entry (statement, starter, solution) in `problems.generated.ts`, then
  `problem('<module>', { hint, complexity })` in the pattern's module file.
  `npm test` fails until the solution passes and every repo problem is used once.
- **A new exercise kind** (Python, YAML, quiz…): add it to the `Exercise` union in
  `content/types.ts`, then give it an editor language and a checker under `engines/`.
- **A new track:** add a `ReadyTrack` to `content/tracks.ts`.

Progress lives in the browser (`localStorage`, per learner profile), so it stays on
the device you practise on.

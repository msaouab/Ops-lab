# ops-lab

My training ground, in one repo:

- **Python and algorithms**: timed drills and 43 tested problems
- **SQL**: 18 queries on a real PostgreSQL database, plus an interactive [SQL path](tracker/sql-path.html)
- **Interview prep**: every stop of an R&D Software Developer hiring process at a Python ERP
  company, from the first coding drill to the first day in Belgium
  ([route tracker](tracker/route-to-rnd.html))
- **DevOps**: Kubernetes, Docker, GitHub Actions, Argo CD and GitOps in [`kube-lab/`](kube-lab)

## The app

An interactive app for everything above: runnable lessons and self-grading problems
for SQL, algorithm patterns and DevOps (a simulated Kubernetes cluster, Docker, CI/CD,
GitOps), in the browser. See [`app/README.md`](app/README.md).

```bash
cd app && npm ci && npm run dev
```

## DevOps

| Project | Folder | Covers |
|---|---|---|
| Gitea on Kubernetes | [`kube-lab/project-1-gitea/`](kube-lab/project-1-gitea) | Core Kubernetes by hand: StatefulSets, PVCs, probes, Jobs, CronJobs, NetworkPolicy, RBAC, Gateway API |
| ShipIt | [`kube-lab/project-2-shipit/`](kube-lab/project-2-shipit) | CI/CD + GitOps: GitHub Actions → GHCR → Argo CD, Kustomize environments, HPA, CloudNativePG, monitoring |

Start with [`kube-lab/README.md`](kube-lab/README.md). Its workflows live in
[`.github/workflows/kube-*.yml`](.github/workflows).

## Interview prep

| Stop | Folder | Status |
|---|---|---|
| A1 · Python fluency | [`A1-python-fluency/`](A1-python-fluency) | ready · 5 drills |
| A2 · Online coding test | [`A2-online-test/`](A2-online-test) | ready · 43 algorithm problems, 18 SQL queries, 3 mocks, aptitude, English, web MCQ |
| A3 · ERP framework | [`A3-erp-framework/`](A3-erp-framework) | outline, built out when I get there |
| A4 · HR screen | [`A4-hr-screen/`](A4-hr-screen) | outline |
| A5 · Technical interview | [`A5-technical-interview/`](A5-technical-interview) | outline |
| A6 · Long live-coding session | [`A6-live-coding/`](A6-live-coding) | outline |
| A7 · Final round | [`A7-final-round/`](A7-final-round) | outline |
| B · Resume, GitHub, referral | [`B-profile/`](B-profile) | outline |
| C · Apply | [`C-apply/`](C-apply) | outline |
| D · Track the process | [`D-tracking/`](D-tracking) | outline |
| E · Offer, permit, visa, move | [`E-relocation/`](E-relocation) | outline |

What the real process looks like (sources and details in [RESEARCH.md](RESEARCH.md)):
**screening → online coding test (+ logic / English tests) → recruiter call → long technical interview → offer.**

## Setup (once)

```bash
make setup     # .venv with pytest + psycopg
make db        # PostgreSQL in Docker, needed for the SQL exercises only
```

## Daily loop

1. Open the exercise file, read the docstring, start a timer for the target minutes.
2. Write the solution in that file. **Don't look up the answer**; if you're stuck after the
   target time, write down where you're stuck in the journal and move on.
3. Run its tests: `.venv/bin/pytest A2-online-test/01-strings-stack/test_valid_markup.py`
4. When it's green, think about the complexity and say it out loud, like in the interview.
5. Write 3 lines in `journal/` (what you solved, what was hard, what to review).
6. `make progress`, commit, push. CI on GitHub reruns everything and shows the progress table.

Then ask Claude: *"review my A2 strings work"*. Claude reads the diff and the journal,
gives feedback, and updates the tracker.

## Rules

- Python for algorithms and backend (the target stack's language). TypeScript is used for the live
  full-stack build in A6, where candidates may choose their stack.
- Every exercise has automatic tests; an exercise counts as solved only when all of them pass.
- Problems are original, written for this repo. Each one links to a similar public problem
  for extra practice after you solve it.

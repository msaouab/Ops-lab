# Project 2: ShipIt (microservices + CI/CD + GitOps)

A tiny job-queue app. The app is deliberately simple. What you're learning is
everything around it.

```
web page ─▶ api (FastAPI) ──LPUSH──▶ redis ──BRPOP──▶ worker ─┐
               │                                              │
               └──────────── Postgres (CloudNativePG) ◀───────┘
api:   /healthz /readyz /metrics/ /api/info /api/jobs /api/burn
worker: graceful SIGTERM, metrics on :9100
```

| Path | What |
|---|---|
| [app/api](app/api) | FastAPI service + static page + migration script + tests |
| [app/worker](app/worker) | Queue consumer |
| [deploy/base](deploy/base) | Kustomize base: CNPG Cluster, redis, migrate Job, api (HPA, PDB, route), worker, NetworkPolicies |
| [deploy/overlays](deploy/overlays) | `local` (by hand), `dev` (CI auto-deploys), `prod` (promoted by PR) |
| [deploy/components/monitoring](deploy/components/monitoring) | ServiceMonitors |
| [../../.github/workflows](../../.github/workflows) (`kube-*.yml`) | CI/CD, promotion, manifest validation, GitHub Pages |
| [../argocd](../argocd) | Root app, AppProjects, platform apps, ApplicationSet |

---

## Level 1: Inner loop, no CI (day 1–2)

**Learn:** building for K8s, image import, Kustomize, operators.

```bash
make shipit-test        # unit tests (no DB needed)
make shipit-local       # docker build → k3d image import → kubectl apply -k overlays/local
kubectl -n shipit-local get cluster,pods -w     # the CNPG operator creates shipit-db-1 for you
kubectl -n shipit-local get secret shipit-db-app -o jsonpath='{.data.uri}' | base64 -d; echo
```

Open http://shipit-local.localhost:8080 and queue a few jobs.

```bash
kubectl kustomize deploy/overlays/local | less           # see exactly what gets applied
diff <(kubectl kustomize deploy/overlays/dev) <(kubectl kustomize deploy/overlays/prod)
```

**Check yourself:** What does an operator do that a StatefulSet doesn't? What does Kustomize change between overlays, and why isn't it templating?

**Break it:**

1. Run `kubectl apply -k deploy/overlays/local` twice with a different image tag, without deleting the Job. Read the "field is immutable" error.
2. Delete the redis pod while jobs are queued. What's lost? (No persistence.) How would you fix it, and do you need to?
3. Kill the worker mid-job with `kubectl delete pod` while queueing a 5,000,000-round job. Read its logs: it finishes the job first. Now set `terminationGracePeriodSeconds: 1`. What changes?

## Level 2: Production-grade workloads (day 3–4)

**Learn:** rolling updates, readiness gates, HPA, PDB, topology spread.

```bash
# Zero-downtime rollout: in one terminal
while true; do curl -s shipit-local.localhost:8080/api/info; echo; sleep 0.2; done
# in another: rebuild (each build stamps a new APP_VERSION)
make shipit-local          # versions switch over with no errors (maxUnavailable: 0 + readiness + preStop)

# Autoscaling
kubectl -n shipit-local get hpa api -w
hey -z 2m -c 20 "http://shipit-local.localhost:8080/api/burn?ms=200"
kubectl top pods -n shipit-local

# Disruption budget
kubectl get pods -n shipit-local -o wide                 # api pods spread across nodes
kubectl drain <node-with-api> --ignore-daemonsets --delete-emptydir-data
#  -> with 1 replica the drain hangs: evicting it would break minAvailable: 1. Why is that correct?
#     Ctrl-C, run `kubectl -n shipit-local scale deploy api --replicas=2`, and drain again.
kubectl uncordon <node>
```

**Check yourself:**

- Why must `/healthz` never check the database?
- Why is HPA utilisation measured against `requests`?
- What does `preStop: sleep 5` buy you?

**Break it:** Remove `resources.requests.cpu` from the api. What does the HPA say? (`kubectl describe hpa`)

## Level 3: CI with GitHub Actions (day 5–6)

**Learn:** workflows, jobs/needs/matrix, permissions, GHCR, buildx multi-arch, caching.

Read [kube-shipit-ci.yml](../../.github/workflows/kube-shipit-ci.yml), then push a change under `kube-lab/project-2-shipit/app/`.

1. Open a **PR**: tests and builds run, but nothing is pushed (`push: ${{ github.event_name == 'push' }}`).
2. **Merge**: images are pushed as `ghcr.io/<you>/shipit-api:sha-xxxxxxx` for amd64 and arm64, and the `deploy-dev` job commits the new tag to `overlays/dev`.
3. On GitHub, open **Packages → shipit-api → Package settings → Change visibility → Public**. Otherwise the cluster can't pull the image. (Alternative exercise: create an `imagePullSecret`.)

**Check yourself:**

- Why tag with the git SHA and not `latest`?
- Why doesn't the bot's commit trigger another CI run?
- What's `permissions:` protecting you from?

**Stretch:**

- Add an image scan step (Trivy or Grype). Pin third-party actions by commit SHA, since supply-chain attacks on popular actions are real.
- Add a job that runs the real stack in CI with `services: postgres` and `redis`, then calls `/readyz`.

## Level 4: GitOps with Argo CD (day 7–9)

**Learn:** pull-based delivery, app-of-apps, AppProjects, ApplicationSets, sync waves and hooks, drift.

```bash
make argocd-ui            # https://localhost:8443
kubectl -n argocd get applications
```

Trace the chain: `root` → `argocd/apps/*` → `envoy-gateway`, `cloudnative-pg`, `sealed-secrets`, `monitoring`, `gateway`, and the **ApplicationSet** `shipit`, which generates `shipit-dev` and `shipit-prod` from the overlay folders.

Exercises:

1. **Full loop:** change the page title in `index.html` → push → CI → bot commit → Argo syncs `shipit-dev` → refresh http://shipit-dev.localhost:8080. Time it.
2. **Drift:** `kubectl -n shipit-dev scale deploy worker --replicas=5`. Argo reverts it (selfHeal). Now try `kubectl -n shipit-dev delete deploy worker`.
3. **Ordering:** watch a sync in the UI. The DB goes first (wave 0), then the migrate Job (hook, wave 1), then api/worker (wave 2).
4. **Guard-rails:** change `shipit.yaml` to deploy into `kube-system`. The `apps` AppProject refuses.
5. **New environment:** `cp -r deploy/overlays/dev deploy/overlays/staging`, edit the hostname, push. `shipit-staging` appears automatically.

**Check yourself:**

- Push vs. pull deployment: why is it safer that CI has no kubeconfig?
- What's the difference between `prune` and `selfHeal`?
- Why does the migrate Job need `BeforeHookCreation`?

## Level 5: Promotion and rollback (day 10)

**Learn:** environment promotion, Git as the audit log, rollback.

1. Actions → **ShipIt promote to prod** → Run. It opens a PR that changes only `overlays/prod`.
2. Review the diff and merge. Argo deploys prod. Open http://shipit.localhost:8080.
3. **Rollback:** `git revert <merge commit> && git push`. Prod returns to the previous tag. No `kubectl` needed.
4. **Failover:** prod runs two Postgres instances. `kubectl -n shipit-prod delete pod shipit-db-1` and watch CNPG promote the replica (`kubectl -n shipit-prod get cluster shipit-db -w`).

**Stretch:** replace the CI tag-bump with **Argo CD Image Updater** (v1 uses an `ImageUpdater` custom resource with `writeBackTarget: kustomization`). Compare the two approaches.

## Level 6: Observability and other deploy targets (day 11–12)

**Monitoring:** open http://grafana.localhost:8080 (`admin` / `kubelab`) → Explore → Prometheus:

```
sum(rate(shipit_jobs_created_total[5m])) by (namespace)
sum(rate(shipit_jobs_processed_total{outcome="done"}[5m])) by (pod)
histogram_quantile(0.95, sum(rate(shipit_job_seconds_bucket[5m])) by (le))
```

Build a dashboard, then save it as JSON in Git (provisioned via a ConfigMap labelled `grafana_dashboard: "1"`).

**PaaS comparison**, using the same frontend deployed three ways:

| Target | How | You manage |
|---|---|---|
| **Kubernetes + Argo CD** | what you just built | everything: most control, most work |
| **GitHub Pages** | [kube-shipit-pages.yml](../../.github/workflows/kube-shipit-pages.yml), then open `https://<you>.github.io/ops-lab/?api=http://shipit-dev.localhost:8080` | nothing, but static files only |
| **Vercel** | `npx vercel deploy project-2-shipit/app/api/app/static`, or import the repo with that root directory. Every PR gets a preview URL. | almost nothing: managed builds, CDN, previews |

Your browser may ask permission for the public page to reach `localhost`. That's the browser's local-network protection.

**External services:** move ShipIt's database out of the cluster to a managed Postgres (Neon or Supabase free tier). Replace the CNPG `Cluster` with a SealedSecret holding `uri`. What did you give up, and what did you gain?

---

## Interview story

> "ShipIt is an API, a worker, Redis and Postgres on Kubernetes. Postgres is run by the CloudNativePG operator, with two instances and automatic failover in prod. GitHub Actions tests, builds multi-arch images to GHCR tagged by commit SHA, then commits the tag to the dev overlay. Argo CD pulls and syncs, so CI never holds cluster credentials. Environments are Kustomize overlays generated into Applications by an ApplicationSet. Prod is promoted by pull request, and rollback is a `git revert`. Rollouts have zero downtime thanks to readiness probes, `maxUnavailable: 0` and a preStop delay. The API autoscales on CPU with an HPA and a PDB, the worker shuts down gracefully, and Prometheus scrapes both."

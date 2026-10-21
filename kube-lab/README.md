# kube-lab

Two hands-on projects that take you from **Kubernetes zero to a GitOps
pipeline** on your laptop. You already know Docker. This lab covers what comes
after it.

| | Project 1: **Gitea on Kubernetes** | Project 2: **ShipIt** |
|---|---|---|
| Goal | Run a real Git service on K8s **by hand**, then hand it to GitOps | Ship a microservice app with **CI/CD + GitOps** |
| You learn | Pods, Deployments, StatefulSets, Services, Gateway API, ConfigMaps, Secrets, PVCs, probes, Jobs, CronJobs, NetworkPolicy, RBAC, quotas | Operators (CNPG), Kustomize overlays, HPA, PDB, rolling updates, GitHub Actions, GHCR, Argo CD, ApplicationSets, promotion by PR, Prometheus/Grafana, PaaS deploy |
| Guide | [project-1-gitea/README.md](project-1-gitea/README.md) | [project-2-shipit/README.md](project-2-shipit/README.md) |

## Architecture

```
                         your laptop  (k3d: 1 server + 2 agent nodes)
 browser ──:8080──▶ ┌──────────────────────────────────────────────────────────┐
                    │  Envoy Gateway  ◀── Gateway "web" (platform/gateway)      │
                    │     │ HTTPRoutes by hostname                              │
                    │     ├─ gitea.localhost ────▶ gitea ─▶ postgres (StatefulSet)│
                    │     ├─ shipit-dev.localhost ▶ api ─▶ redis ◀─ worker      │
                    │     ├─ shipit.localhost  ──▶ (prod)   └─▶ CNPG Postgres   │
                    │     └─ grafana.localhost ──▶ Grafana ◀─ Prometheus        │
                    │                                                           │
                    │  Argo CD ── watches ──▶ this Git repo (main)              │
                    └──────────────────────────────▲────────────────────────────┘
                                                   │ git pull (no CI credentials
 git push ─▶ GitHub Actions ─▶ test ─▶ build ─▶ GHCR│ to the cluster: GitOps)
                     └──── commit new image tag ───┘
```

## Prerequisites

- Docker Desktop (or OrbStack/Colima) with **≥ 8 GB RAM** and 4 CPUs
- `make tools` installs: k3d, kubectl, helm, k9s, kubeseal, hey, argocd CLI, kubeconform, jq
- The **ops-lab repo pushed to GitHub as a public repo**: Argo CD pulls from it, and the
  workflows in `../.github/workflows/kube-*.yml` run there. If your GitHub user isn't
  `msaouab`, run `make set-repo OWNER=<you>` first.

Run every `make` command from this `kube-lab/` folder.

## Quick start

```bash
make cluster-up   # k3d cluster
make bootstrap    # Argo CD + platform (gateway, CNPG, sealed-secrets, monitoring) + ShipIt
make gitea-up     # Project 1, by hand (prints the admin password)
make status
```

| URL | What |
|---|---|
| http://gitea.localhost:8080 | Gitea (user `gitadmin`, password printed by `make gitea-up`) |
| http://shipit-dev.localhost:8080 | ShipIt dev (after the first CI run) |
| http://shipit.localhost:8080 | ShipIt prod (after the first promotion) |
| http://grafana.localhost:8080 | Grafana (`admin` / `kubelab`) |
| https://localhost:8443 | Argo CD (`make argocd-ui`) |

`*.localhost` always resolves to 127.0.0.1, so you don't need to edit `/etc/hosts`.

## Learning path (about 3 weeks at 2–3 h/day)

| Week | Do | Covers |
|---|---|---|
| 1 | **Project 1, levels 1–3** | Core K8s objects, storage, config, probes, Jobs, networking, RBAC |
| 2 | **Project 2, levels 1–3** | Kustomize, operators, HPA/PDB, CI with GitHub Actions, GHCR |
| 3 | **Project 2, levels 4–6 + Project 1, level 4** | Argo CD, GitOps promotion, monitoring, sealed secrets, PaaS comparison |

Rules for every lab:

1. **Read the YAML before applying it.** Every file has comments that explain *why*.
2. **Predict, then observe.** Before each command, say what you expect to happen.
3. **Break it on purpose** (each level has a "Break it" list), then fix it using only `kubectl describe`, `kubectl get events`, `kubectl logs`.
4. **Explain it in 3 sentences** out loud or in a notes file. If you can't, redo the level.

## Debug toolkit

```bash
kubectl get pods -A -o wide                           # what runs where
kubectl describe pod <p> -n <ns>                      # read the Events section first
kubectl get events -n <ns> --sort-by=.lastTimestamp   # timeline
kubectl logs <p> -n <ns> [-c container] [--previous]  # --previous = crashed run
kubectl exec -it <p> -n <ns> -- sh                    # look inside
kubectl get endpointslices -n <ns>                    # does the Service find pods?
kubectl explain deployment.spec.strategy              # built-in docs
k9s                                                   # watch it all live
```

## Versions (pinned, checked October 2026)

k3s v1.36.5 · Argo CD v3.5.5 · Envoy Gateway v1.9.2 (Gateway API v1) · CloudNativePG 1.30 ·
Sealed Secrets 0.40 · kube-prometheus-stack 92.10 · Gitea 28.1 · PostgreSQL 17 · Python 3.13

Why these choices:

- **Gateway API instead of Ingress.** ingress-nginx was retired in March 2026, and Kubernetes recommends Gateway API as its successor.
- **CloudNativePG instead of a Bitnami chart.** Bitnami moved most free images to an unmaintained legacy repo in 2025.

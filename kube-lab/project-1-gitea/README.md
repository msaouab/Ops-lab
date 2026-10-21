# Project 1: Gitea on Kubernetes

You'll run **Gitea** (a self-hosted Git service, like a small GitHub) with
PostgreSQL the way you'd run it in production. You write and apply everything
**by hand** first, then hand it to Argo CD.

```
HTTPRoute gitea.localhost ─▶ Service gitea:80 ─▶ Deployment gitea (1 pod, Recreate)
                                                   │  initContainer: wait for gitea-init
                                                   ├─ ConfigMap gitea-config (GITEA__* env)
                                                   ├─ Secret gitea           (DB creds, secret key, admin pw)
                                                   └─ PVC gitea-data         (repositories)
Job gitea-init ─▶ creates tables + admin user "gitadmin" (idempotent)
StatefulSet postgres ─▶ headless Service postgres ─▶ PVC data-postgres-0
CronJob gitea-backup ─▶ pg_dump nightly ─▶ PVC gitea-backups
NetworkPolicy: deny all · gitea→postgres · gateway→gitea     RBAC: gitea-viewer (read-only)
```

Files: [k8s/](k8s/). Read them in this order: `00-namespace` → `postgres` → `gitea-config` → `gitea-init-job` → `gitea` → `ops`.
Run every command from the `kube-lab/` folder.

---

## Level 1: Cluster and core objects (day 1–2)

**Learn:** cluster architecture, kubectl, Pods vs Deployments, labels/selectors.

```bash
make cluster-up
kubectl get nodes -o wide
kubectl get pods -n kube-system      # the control-plane add-ons k3s runs
```

Warm-up with no YAML. Generate it instead of memorising it:

```bash
kubectl create deployment hello --image=nginx --replicas=3
kubectl get deploy,rs,pods -l app=hello -o wide       # 3 layers: Deployment → ReplicaSet → Pods
kubectl delete pod -l app=hello --wait=false && kubectl get pods -l app=hello -w   # self-healing
kubectl set image deploy/hello nginx=nginx:1.29 && kubectl rollout status deploy/hello
kubectl rollout history deploy/hello && kubectl rollout undo deploy/hello
kubectl expose deploy hello --port 80 && kubectl run tmp --rm -it --image=busybox -- wget -qO- hello
kubectl create deployment x --image=nginx --dry-run=client -o yaml   # YAML generator
kubectl delete deploy/hello svc/hello
```

**Check yourself:** What happens between `kubectl apply` and a running container? (API server → etcd → scheduler picks a node → kubelet → containerd)

**Break it:**

- `kubectl set image deploy/hello nginx=nginx:doesnotexist`: read `ImagePullBackOff` in `describe`, then `rollout undo`.
- `kubectl run crash --image=busybox -- false`: watch `CrashLoopBackOff` and the growing back-off delay.

## Level 2: Run Gitea (day 3–5)

**Learn:** StatefulSet, headless Service, PVC, ConfigMap, Secret, init containers, Jobs, probes, Gateway API.

You need the platform installed for the Gateway, so run `make bootstrap` once. Treat it as a black box until Project 2.

```bash
make gitea-up                            # creates Secret "gitea" once, applies k8s/, prints the admin password
kubectl -n gitea get secret gitea -o jsonpath='{.data.db-password}' | base64 -d; echo   # base64 ≠ encryption!
kubectl -n gitea get pods -w             # watch: postgres-0 → gitea-init → gitea (Init:0/1 → Running)
kubectl -n gitea logs job/gitea-init -f
```

Open http://gitea.localhost:8080, log in as `gitadmin`, create a repository, and push to it:

```bash
git clone http://gitea.localhost:8080/gitadmin/<repo>.git
```

Explore each object:

```bash
kubectl -n gitea get sts,pvc,pv                       # PVC data-postgres-0 came from volumeClaimTemplates
kubectl -n gitea run dns --rm -it --image=busybox -- nslookup postgres   # headless → pod IP, not a VIP
kubectl -n gitea exec deploy/gitea -- cat /etc/gitea/app.ini   # generated from the GITEA__* env vars
kubectl -n gitea describe pod -l app.kubernetes.io/name=gitea  # probes, init containers, mounts
kubectl get gateway -A && kubectl -n gitea get httproute gitea -o yaml   # status.parents shows "Accepted"
```

**Check yourself:**

- Why is Postgres a StatefulSet but Gitea a Deployment?
- Why is the strategy `Recreate`? (RWO volume)
- Why does the readiness probe call `/api/healthz` (which checks the database) but liveness only opens a TCP connection?
- Why does an init container wait for the admin user instead of relying on the Job?

**Break it:**

1. Delete `postgres-0`. Does your repository survive? (`kubectl -n gitea delete pod postgres-0`, then reload Gitea.)
2. Change `GITEA__log__LEVEL` in `gitea-config.yaml`, re-apply, and check the env in the pod. Why didn't it change? (Env is read at start.) Fix it with `kubectl rollout restart`.
3. Set the readiness probe path to `/nope`. The pod runs but gets no traffic. Check `kubectl -n gitea get endpointslices`.
4. Set `limits.memory: 64Mi` on Gitea and watch it get `OOMKilled` (`describe` → Last State).
5. Raise Gitea's memory request above the ResourceQuota. Where does the error appear? (Hint: not on a pod. Check `kubectl describe rs`.)
6. Scale Gitea to 2 replicas. Why does the second pod misbehave? (Repositories, sessions and the search index all live on one RWO volume. This is the interview question.)
7. Delete Secret `gitea` and run `make gitea-up` again. It makes a new password, but Postgres keeps the old one. Read the init container's log and explain the lock-out. (Undo: `make gitea-down`, then `make gitea-up`.)

## Level 3: Day-2 operations (day 6–7)

**Learn:** CronJobs, NetworkPolicy, RBAC, scheduling, node maintenance.

```bash
# Backups
kubectl -n gitea create job --from=cronjob/gitea-backup backup-now
kubectl -n gitea logs job/backup-now
# The dump holds the database only — your Git repositories live on the gitea-data PVC.
# Exercise: add a second CronJob that runs `gitea dump` to back up repos as well.

# NetworkPolicy. The `sleep 5` matters: the policy controller needs a moment to
# allow a brand-new pod's IP, so connecting instantly fails even when allowed.
kubectl -n gitea run probe --rm -i --quiet --restart=Never --image=postgres:17-alpine -- sh -c 'sleep 5; pg_isready -h postgres -t 4'
#  -> no response: the probe pod has no part-of=gitea label
kubectl -n gitea run probe --rm -i --quiet --restart=Never --image=postgres:17-alpine -l app.kubernetes.io/part-of=gitea -- sh -c 'sleep 5; pg_isready -h postgres -t 4'
#  -> accepting connections

# RBAC
kubectl auth can-i list pods -n gitea --as=system:serviceaccount:gitea:gitea-viewer     # yes
kubectl auth can-i delete pods -n gitea --as=system:serviceaccount:gitea:gitea-viewer   # no
kubectl auth can-i get secrets -n gitea --as=system:serviceaccount:gitea:gitea-viewer   # no (why is that important?)

# Node maintenance
kubectl get pods -n gitea -o wide                     # which node runs postgres-0?
kubectl cordon <node> && kubectl drain <node> --ignore-daemonsets --delete-emptydir-data
kubectl get pods -n gitea -o wide -w                  # local-path PVs are pinned to a node — what happens?
kubectl uncordon <node>
```

**Stretch:**

- Enable SSH clone: set `GITEA__server__DISABLE_SSH: "false"`, expose port 2222 and add a Gateway API `TCPRoute`.
- Replace the hand-written Postgres with a CloudNativePG `Cluster` (see Project 2). What did you gain?
- Run Gitea Actions: deploy an `act_runner` and give your repos their own CI inside the cluster.

## Level 4: Hand Gitea to GitOps (after Project 2, level 4)

**Learn:** Sealed Secrets, adopting live resources into Argo CD.

```bash
make gitea-seal                                        # encrypt the live Secret with the cluster's public key
cat project-1-gitea/k8s/gitea.sealedsecret.yaml        # safe to commit: only this cluster can decrypt it
# uncomment it in project-1-gitea/k8s/kustomization.yaml
git mv argocd/later/gitea.yaml argocd/apps/gitea.yaml
git commit -am "gitea: managed by Argo CD" && git push
kubectl -n argocd get application gitea -w
```

Now edit something by hand, for example `kubectl -n gitea scale deploy gitea --replicas=0`, and watch self-heal revert it.

**Check yourself:** Why is a SealedSecret safe in a public repo when a Secret isn't? What happens if you lose the controller's private key?

---

## Interview story

> "I deployed Gitea on Kubernetes: Postgres as a StatefulSet with per-replica PVCs, Gitea configured entirely through environment variables from a ConfigMap and a Secret, an idempotent init Job that migrates the schema and creates the admin, and init containers for startup ordering. Readiness checks the database through `/api/healthz`; liveness only checks the port, so a database outage doesn't trigger restarts. It runs non-root with a read-only root filesystem, nightly pg_dump CronJobs, default-deny NetworkPolicies and a read-only RBAC role. I kept it at one replica with Recreate because repositories live on a ReadWriteOnce volume. Finally I moved it to Argo CD with Sealed Secrets."

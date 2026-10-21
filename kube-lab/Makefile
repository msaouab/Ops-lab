# kube-lab: every command you need, readable on purpose — open this file and
# learn what each target runs. `make help` lists them.

SHELL := /bin/bash
CLUSTER := kubelab
ARGOCD_VERSION := v3.5.5
OWNER ?= msaouab

.PHONY: help
help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------- setup
.PHONY: tools
tools: ## Install CLI tools with Homebrew
	brew install k3d kubectl helm k9s kubeseal hey argocd kubeconform jq

.PHONY: set-repo
set-repo: ## Point manifests at your GitHub user: make set-repo OWNER=<github-user>
	grep -rl --exclude-dir=.git -e 'github.com/msaouab/ops-lab' -e 'ghcr.io/msaouab/' argocd project-2-shipit/deploy \
	  | xargs sed -i '' -e 's#github.com/msaouab/ops-lab#github.com/$(OWNER)/ops-lab#g' -e 's#ghcr.io/msaouab/#ghcr.io/$(OWNER)/#g'
	@echo "now: git commit -am 'point at $(OWNER)' && git push"

# ---------------------------------------------------------------- cluster
.PHONY: cluster-up
cluster-up: ## Create the local k3d cluster (1 server + 2 agents)
	k3d cluster create --config cluster/k3d.yaml
	kubectl get nodes -o wide

.PHONY: cluster-down
cluster-down: ## Delete the cluster (all data gone)
	k3d cluster delete $(CLUSTER)

# ---------------------------------------------------------------- GitOps
.PHONY: argocd
argocd: ## Install Argo CD (the one manual install)
	kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
	kubectl apply -n argocd --server-side --force-conflicts \
	  -f https://raw.githubusercontent.com/argoproj/argo-cd/$(ARGOCD_VERSION)/manifests/install.yaml
	kubectl -n argocd rollout status deploy/argocd-server --timeout=300s

.PHONY: bootstrap
bootstrap: argocd ## Argo CD + root app -> installs platform/ and ShipIt from Git
	kubectl apply -n argocd -f argocd/root.yaml
	@echo "watch it: kubectl -n argocd get applications -w   (or: make argocd-ui)"

.PHONY: argocd-ui
argocd-ui: ## Open the Argo CD UI on https://localhost:8443
	@echo "user: admin  password: $$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d)"
	kubectl -n argocd port-forward svc/argocd-server 8443:443

# ---------------------------------------------------------------- Project 1
.PHONY: gitea-secret
gitea-secret: ## Create the Gitea secret once (random values; never rotated by re-runs)
	kubectl create namespace gitea --dry-run=client -o yaml | kubectl apply -f -
	@# Postgres only reads POSTGRES_PASSWORD on first init, and Gitea encrypts data with
	@# secret-key — regenerating either would lock Gitea out of its own data.
	kubectl -n gitea get secret gitea >/dev/null 2>&1 || kubectl -n gitea create secret generic gitea \
	  --from-literal=db-username=gitea --from-literal=db-password="$$(openssl rand -hex 16)" \
	  --from-literal=secret-key="$$(openssl rand -hex 32)" --from-literal=admin-password="$$(openssl rand -hex 8)"

.PHONY: gitea-up
gitea-up: gitea-secret ## Deploy Gitea by hand (kubectl apply -k)
	kubectl apply -k project-1-gitea/k8s
	@echo "follow along: kubectl -n gitea get pods -w   then open http://gitea.localhost:8080"
	@echo "login: gitadmin / $$(kubectl -n gitea get secret gitea -o jsonpath='{.data.admin-password}' | base64 -d)"

.PHONY: gitea-seal
gitea-seal: ## Turn the live gitea Secret into a SealedSecret you can commit
	kubectl -n gitea get secret gitea -o json \
	  | jq 'del(.metadata.uid, .metadata.resourceVersion, .metadata.creationTimestamp, .metadata.annotations, .metadata.managedFields)' \
	  | kubeseal -o yaml > project-1-gitea/k8s/gitea.sealedsecret.yaml
	@echo "now uncomment it in project-1-gitea/k8s/kustomization.yaml"

.PHONY: gitea-down
gitea-down: ## Remove Gitea (PVCs too)
	kubectl delete namespace gitea

# ---------------------------------------------------------------- Project 2
.PHONY: shipit-test
shipit-test: ## Run the API unit tests in a throwaway venv
	cd project-2-shipit/app/api && python3 -m venv .venv && .venv/bin/pip -q install -r requirements-dev.txt && .venv/bin/python -m pytest -q

.PHONY: shipit-local
shipit-local: ## Build images, import into k3d, deploy overlays/local (no registry, no CI)
	docker build -t ghcr.io/$(OWNER)/shipit-api:local --build-arg APP_VERSION=local-$$(date +%H%M%S) project-2-shipit/app/api
	docker build -t ghcr.io/$(OWNER)/shipit-worker:local project-2-shipit/app/worker
	k3d image import -c $(CLUSTER) ghcr.io/$(OWNER)/shipit-api:local ghcr.io/$(OWNER)/shipit-worker:local
	kubectl -n shipit-local delete job shipit-migrate --ignore-not-found
	kubectl apply -k project-2-shipit/deploy/overlays/local
	kubectl -n shipit-local rollout restart deploy/api deploy/worker
	@echo "open http://shipit-local.localhost:8080"

.PHONY: load
load: ## Hammer shipit-dev with CPU load to trigger the HPA
	hey -z 2m -c 20 "http://shipit-dev.localhost:8080/api/burn?ms=200"

# ---------------------------------------------------------------- checks
.PHONY: validate
validate: ## Render every Kustomize tree and validate with kubeconform
	@set -o pipefail; for d in project-1-gitea/k8s platform/gateway project-2-shipit/deploy/overlays/*; do \
	  echo "== $$d"; kubectl kustomize $$d | kubeconform -strict -summary -ignore-missing-schemas \
	    -schema-location default \
	    -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' || exit 1; \
	done

.PHONY: status
status: ## One-screen overview of the cluster
	kubectl get nodes
	kubectl -n argocd get applications 2>/dev/null || true
	kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded
	kubectl get httproute -A

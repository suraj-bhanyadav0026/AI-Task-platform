# === FILE: infra-repo/README.md ===
# AI Task Platform - Infrastructure

This repository houses the GitOps state for the AI Task Platform, managed via Argo CD and Kustomize.

## Argo CD Installation
Ensure `k3s` or your preferred Kubernetes distribution is running.

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

To access the Argo CD UI:
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```
Login with the username `admin`. Retrieve the password using:
```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

## Adding Repo & App
Configure Argo CD to access this repository via SSH deploy keys. 
Then apply the application manifest:
```bash
kubectl apply -f apps/ai-task-platform.yaml
```

Argo CD will automatically sync the `k8s/overlays/production` definitions into the `ai-tasks` namespace.

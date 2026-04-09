# === FILE: README.md ===
# AI Task Processing Platform

A robust, cloud-native platform for asynchronous processing of text operations, built as a microservices architecture leveraging React, Express, Python, Redis, and MongoDB.

## Architecture

```text
    User Request (React SPA)
           │
           ▼
    API Gateway (Node.js/Express)
    /api/v1/tasks
           │
     ┌─────┴────────┐
     │              │
     ▼              ▼
  MongoDB ◄───── Redis Queue (BLPOP)
  (State)           │
     ▲              │
     │              ▼
     └───────── Worker (Python)
```

## Prerequisites
- Node.js 20+
- Python 3.12+
- Docker & Docker Compose
- `kubectl` and `k3s` (for Kubernetes deployment)

## Quick Start (Local Development)
To boot the complete distributed system locally, ensure Docker is running, then execute:

```bash
git clone <this-repo>
cd ai-task-platform
docker-compose up --build
```
The frontend will be available at [http://localhost:3000](http://localhost:3000) and the API at [http://localhost:5000](http://localhost:5000).

## Environment Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | Yes |
| `PORT` | API Server port | `5000` | Yes |
| `MONGODB_URI` | Database connection string | `mongodb://localhost:27017/ai_tasks` | Yes |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | `supersecretkey` | Yes |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` | Yes |
| `LOG_LEVEL` | Application logging level | `info` or `debug` | No |

## API Documentation

All endpoints require a Bearer Token (JWT) except for Authentication endpoints.

| Method | Path | Auth | Body | Response | Description |
|--------|------|------|------|----------|-------------|
| `POST` | `/api/v1/auth/register` | No | `{ username, email, password }` | `{ token, user }` | Register new user. |
| `POST` | `/api/v1/auth/login` | No | `{ email, password }` | `{ token, user }` | Authenticate user. |
| `GET`  | `/api/v1/auth/me` | Yes | None | `{ user }` | Get current user profile. |
| `POST` | `/api/v1/tasks` | Yes | `{ title, input, operation }` | `{ task }` | Create new task. Operations: uppercase, lowercase, reverse, word_count. |
| `GET`  | `/api/v1/tasks` | Yes | None | `{ tasks, total, page, pages }` | Retrieve paginated tasks list. |
| `GET`  | `/api/v1/tasks/:id` | Yes | None | `{ task }` | Fetch specific task with full logs. |
| `DELETE`| `/api/v1/tasks/:id` | Yes | None | `{ success }` | Delete a specific task. |
| `GET`  | `/api/v1/tasks/:id/stream` | Yes | None | SSE Stream | Subscribe to live log events via SSE. |
| `GET`  | `/api/v1/metrics` | No | None | Prometheus Text Format | Exposes system health and operations metrics. |

## Kubernetes Deployment Guide

We utilize Kustomize to manage environment-specific manifests.

1. Ensure your cluster is running (`k3s` recommended).
2. Generate base64 encoded secrets and apply them to your cluster.
3. Apply the production stack:
```bash
kubectl apply -k infra-repo/k8s/overlays/production
```

## Argo CD Setup Guide

1. Install k3s: `curl -sfL https://get.k3s.io | sh -`
2. Install Argo CD:
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```
3. Get initial admin password:
```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```
4. Access the UI by port-forwarding: `kubectl port-forward svc/argocd-server -n argocd 8080:443`
5. Create the application by applying our GitOps manifest: `kubectl apply -f infra-repo/apps/ai-task-platform.yaml`

*(Screenshot Note: The Argo CD dashboard would display a massive multi-node tree of objects spanning Deployments, StatefulSets for Mongo, HPA scaling worker pods, and Services seamlessly reporting a green "Healthy & Synced" status block for the `ai-tasks` namespace).*

## CI/CD Pipeline

Our GitHub Actions workflow enforces linting, builds multi-stage Docker images, and programmatically patches image SHAs into our `infra-repo` to trigger GitOps deployments.

**Required GitHub Secrets:**
- `DOCKERHUB_USERNAME`: Your Docker registry username.
- `DOCKERHUB_TOKEN`: Access token for pushing images.
- `INFRA_REPO_DEPLOY_KEY`: SSH key restricted to push access to the `infra-repo`.

## Local Development & Linting

```bash
# Backend
cd backend
npm install
npm run lint

# Worker
cd worker
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt flake8
flake8 worker.py
```

## Troubleshooting
1. **Frontend says Network Error:** Ensure backend is running. Verify `FRONTEND_URL` in backend `.env` matches your frontend port.
2. **Tasks stuck in pending indefinitely:** The Python worker is likely failing to connect to Redis/Mongo. Check worker logs: `docker-compose logs -f worker`.
3. **MongoDB Connection Refused:** This occurs if Mongo is still initializing on boot. Our compose relies on a `healthcheck` condition to stagger startups; restarting backend or worker usually resolves it.
4. **SSE Logs not showing:** Chrome limits concurrent connections. Ensure you don't have >6 tabs open to the stream, or verify Nginx isn't buffering the response.
5. **K8s Worker Pods OOMKilled:** The default limits in staging are very tight. Revert to production overlay or expand `memory` requests in `hpa-worker.yaml`.

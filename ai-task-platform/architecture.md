# === FILE: architecture.md ===
# AI Task Processing Platform - Architecture

## 1. System Overview
The AI Task Processing Platform is a scalable, cloud-native application designed to handle high volumes of text processing tasks asynchronously. The system is composed of an interactive React single-page application (SPA) frontend, a robust Express.js backend serving as the API gateway, a Redis queue for rapid message passing, a MongoDB document store for long-term state persistence, and Python-based worker nodes for background processing.

When a user submits a task via the frontend, the request is routed through the API gateway where it is authenticated and validated. The backend immediately creates a task record in MongoDB with a "pending" status, ensuring data durability, and subsequently pushes a lightweight job payload onto the Redis queue. The backend then responds to the client, which can either poll for updates or subscribe to a Server-Sent Events (SSE) stream for real-time log ingestion. The Python worker, listening to the Redis queue, pops the job, streams logs back to the database, executes the requested text operation, and marks the task as complete or failed.

## 2. Worker Scaling Strategy
To ensure extreme rapid ingestion, the worker nodes utilize Redis `BLPOP` (Blocking Pop) rather than active polling. `BLPOP` is a blocking list pop primitive that allows the worker to maintain a persistent connection to Redis, instantly awakening and retrieving a job the millisecond it becomes available, with near-zero latency and minimal CPU overhead.

The worker nodes themselves are completely stateless. This deliberate architectural choice allows for seamless Horizontal Pod Autoscaling (HPA) within a Kubernetes environment. The HPA is configured to monitor CPU utilization (targeting 60%). As CPU load increases during high task volumes, the cluster can safely spin up additional worker replicas. Duplicate processing is completely avoided because Redis `BLPOP` provides atomic popping guarantees; once a single worker pops a job from the list, it is instantly removed and cannot be accessed by concurrent replicas.

## 3. High Volume: Handling 100,000 Tasks Per Day
Operating at a volume of 100,000 tasks per day equates to approximately 70 tasks per minute, or 1.2 tasks per second. At this scale:
- Redis handles over 100,000 operations per second out-of-the-box, ensuring the queue never bottlenecks our system.
- MongoDB can sustain tens of thousands of writes per second. We implement connection pooling on both the Node.js API and the Python worker to maximize throughput and minimize TCP connection overhead.
- For this volume, running 3 to 5 worker replicas under normal CPU load is sufficient to process tasks in near real-time. In production, MongoDB Atlas or a robust replica set is recommended to spread read loads and provide failover.

## 4. Database Indexing Strategy
To optimize query performance during heavy API loads, we implement strict indexing on MongoDB:
- **`{ userId: 1, createdAt: -1 }` on `tasks` collection:** This compound index is critical for the frontend dashboard, allowing it to rapidly retrieve a paginated, time-sorted list of tasks belonging to a specific user. Without this index, queries would require a full collection scan and in-memory sorting.
- **`{ status: 1, createdAt: 1 }` on `tasks` collection:** This index supports our worker's fallback polling mechanism (scanning for "pending" tasks). The `createdAt` sort ensures FIFO execution if Redis fails.
- **`{ email: 1 }` and `{ username: 1 }` on `users` collection:** These unique indexes ensure constant-time `O(1)` lookups during login and eliminate race conditions during registration.
- **Future optimization:** A TTL (Time-To-Live) index on the `createdAt` field, combined with a filter for `failed` or `success` statuses, could automatically prune historical tasks after 30 days to bound database size.

## 5. Redis Failure Handling
Resilience is a core tenet of this platform. While Redis `BLPOP` is the primary and highly efficient path for processing tasks, it acts purely as a transient optimization layer. The source of truth is always MongoDB. When a request arrives, the backend always commits the task to MongoDB *before* pushing it to Redis. In the event of a Redis network partition, or OOM crash:
- **Fallback Path:** The Python worker is designed to catch Redis connection exceptions. Upon failure, it gracefully degrades into a MongoDB polling mode, querying the `{ status: 1, createdAt: 1 }` index every 5 seconds for pending tasks.
- **Recovery Path:** Concurrently, the worker attempts to re-establish its connection to Redis. Once Redis recovers, the worker effortlessly pivots back to the high-performance `BLPOP` queue.
- **Zero Loss Guarantee:** Because the task is persisted to Mongo before queueing, total Redis failure during creation only results in a slight processing delay (until the polling loop catches it), with absolute zero task loss.

## 6. Staging vs Production Deployment
We manage multi-environment Kubernetes deployments utilizing Kustomize and GitOps principles via Argo CD. Our configurations share a unified `base` layer containing definitions for Deployments, Services, ConfigMaps, and Secrets.
- **Staging Overlay:** The `overlays/staging` setup patches the base to operate with 1 replica per service, constrained resource limits, and injects staging-specific variables.
- **Production Overlay:** The `overlays/production` dynamically overrides the base configurations to deploy multiple replicas, elevated CPU/Memory limits, active HPA configurations, and connects to hardened persistence layers.
Argo CD monitors the dedicated `infra-repo`, instantly and automatically synchronizing definitions into the respective Kubernetes clusters, establishing an easily auditable, blue/green-capable deployment pipeline.

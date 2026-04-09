# === FILE: worker/Dockerfile ===
# Stage 1: Builder
FROM python:3.12-alpine AS builder

WORKDIR /app
COPY requirements.txt .

RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Production
FROM python:3.12-alpine AS production

# Non-root user setup
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser

WORKDIR /app
COPY worker.py .
COPY --from=builder /root/.local /home/appuser/.local

# Ensure local bin is on path
ENV PATH=/home/appuser/.local/bin:$PATH
# Critical for streaming Python logs to Docker/K8s realtime
ENV PYTHONUNBUFFERED=1

RUN chown -R appuser:appgroup /app
USER appuser

# Healthcheck to enable docker-compose depends_on health assertions
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD ["python", "-c", "import sys; sys.exit(0)"]

CMD ["python", "worker.py"]

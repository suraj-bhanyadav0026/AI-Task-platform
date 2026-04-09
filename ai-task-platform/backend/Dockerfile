# === FILE: backend/Dockerfile ===
# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY src/ ./src/

# Stage 2: Production
FROM node:20-alpine AS production

# Security: run as non-root user with UID 1001
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules/ ./node_modules/
COPY --from=builder /usr/src/app/src/ ./src/

RUN chown -R appuser:appgroup /usr/src/app

USER appuser

EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/v1/health || exit 1

CMD ["npm", "start"]

# === FILE: frontend/Dockerfile ===
# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production (Serving with Nginx)
FROM nginx:alpine AS production

# Security: Non-root user for nginx
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser \
    && chown -R appuser:appgroup /var/cache/nginx /var/run /var/log/nginx && touch /run/nginx.pid && chown appuser:appgroup /run/nginx.pid

COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# SPA fallback configuration
RUN echo 'server { \
    listen       8080; \
    server_name  localhost; \
    location / { \
        root   /usr/share/nginx/html; \
        index  index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Give user access to config
RUN chown -R appuser:appgroup /etc/nginx/conf.d /usr/share/nginx/html

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

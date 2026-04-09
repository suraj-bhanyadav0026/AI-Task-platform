// === FILE: backend/src/index.js ===
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const promClient = require('prom-client');

// Verify critical environment variables
if (!process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is missing.');
  process.exit(1);
}

const { connectRedis } = require('./config/redis');
const requestIdMiddleware = require('./middleware/requestId');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 5000;

// Prometheus Metrics Setup (BONUS 3)
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics();
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Global Middleware
app.use(helmet()); // Security requirements

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestIdMiddleware); // Tracing req IDs (BONUS 4)

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 req/15min globally
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use(globalLimiter);

// Prometheus Middleware Integration
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route ? req.baseUrl + req.route.path : req.path,
      status_code: res.statusCode
    });
  });
  next();
});

// API Versioning (BONUS 6)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', taskRoutes);

// Metrics Endpoint (BONUS 3)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Healthcheck
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful Shutdown Variables
let server;

// Start Server
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[INIT] Connected to MongoDB`);

    await connectRedis();
    console.log(`[INIT] Connected to Redis`);

    server = app.listen(PORT, () => {
      console.log(`[INIT] Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`[FATAL] Failed to start server:`, error.message);
    process.exit(1);
  }
};

startServer();

// Graceful Shutdown Logic (BONUS 5)
const gracefulShutdown = async (signal) => {
  console.log(`\n[SHUTDOWN] Received signal: ${signal}`);
  console.log('[SHUTDOWN] Stopping HTTP server...');
  if (server) {
    server.close(async () => {
      console.log('[SHUTDOWN] HTTP server closed.');
      try {
        console.log('[SHUTDOWN] Disconnecting MongoDB...');
        await mongoose.connection.close();
        console.log('[SHUTDOWN] Databases disconnected. Exiting gracefully.');
        process.exit(0);
      } catch (err) {
        console.error('[SHUTDOWN] Error during disconnect:', err.message);
        process.exit(1);
      }
    });

    // Force exit if hanging
    setTimeout(() => {
      console.error('[SHUTDOWN] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

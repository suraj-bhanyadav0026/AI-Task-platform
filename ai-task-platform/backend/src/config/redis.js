// === FILE: backend/src/config/redis.js ===
const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('[REDIS] Client Error:', err.message));
redisClient.on('connect', () => console.log('[REDIS] Client Connected'));

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

module.exports = { redisClient, connectRedis };

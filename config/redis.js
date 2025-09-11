const { createClient } = require('redis');
require('dotenv').config();

// Helper: create a tiny in-memory fallback store with same API used in services
function createInMemoryStore() {
  const store = new Map();
  const timeouts = new Map();

  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async setEx(key, ttlSeconds, value) {
      store.set(key, value);
      if (timeouts.has(key)) clearTimeout(timeouts.get(key));
      const t = setTimeout(() => {
        store.delete(key);
        timeouts.delete(key);
      }, ttlSeconds * 1000);
      timeouts.set(key, t);
      return 'OK';
    },
    async keys(pattern) {
      // support simple patterns like 'recipes:*'
      if (!pattern || pattern === '*') return Array.from(store.keys());
      const prefix = pattern.replace(/\*/g, '');
      return Array.from(store.keys()).filter((k) => k.startsWith(prefix));
    },
    async del(key) {
      if (timeouts.has(key)) clearTimeout(timeouts.get(key));
      timeouts.delete(key);
      return store.delete(key);
    },
    async quit() {
      // no-op for in-memory
      return 'OK';
    },
  };
}

// Try to create a real Redis client, otherwise fall back to in-memory store
let redisClient;
(async () => {
  try {
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const client = createClient({ url });
    client.on('error', (err) => console.error('Redis Client Error', err));
    await client.connect();
    console.log('✅ Connected to Redis successfully!');
    redisClient = client;
  } catch (err) {
    console.warn(
      '⚠️ Could not connect to Redis, using in-memory fallback. Error:',
      err && err.message ? err.message : err
    );
    redisClient = createInMemoryStore();
  }
})();

module.exports = new Proxy(
  {},
  {
    get(_, prop) {
      // if redisClient not ready yet, wait until it's assigned
      if (!redisClient) {
        throw new Error('Redis client not initialized yet');
      }
      return redisClient[prop].bind(redisClient);
    },
  }
);

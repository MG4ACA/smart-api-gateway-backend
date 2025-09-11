const axios = require('axios');
const redisClient = require('../config/redis');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const url = process.env.API_URL || 'http://localhost:4000/api/recipes/search?q=chicken';

  console.log('Testing recipe cache flow for:', url);

  try {
    const t1 = Date.now();
    const r1 = await axios.get(url, { timeout: 20000 });
    const t1d = (Date.now() - t1) / 1000;
    console.log(
      'First request status:',
      r1.status,
      `time=${t1d}s`,
      'items=',
      (r1.data?.data?.recipes || []).length
    );

    // Wait a second
    await sleep(1000);

    const t2 = Date.now();
    const r2 = await axios.get(url, { timeout: 10000 });
    const t2d = (Date.now() - t2) / 1000;
    console.log(
      'Second request status:',
      r2.status,
      `time=${t2d}s`,
      'items=',
      (r2.data?.data?.recipes || []).length
    );

    // List redis keys
    try {
      const keys = await redisClient.keys('recipes:*');
      console.log('Redis keys:', keys);
      if (keys.length) {
        const sample = await redisClient.get(keys[0]);
        console.log('Sample key:', keys[0], 'valueLength=', sample ? sample.length : 0);
      }
    } catch (e) {
      console.warn('Could not query Redis keys:', e.message || e);
    }

    await redisClient.quit();
    process.exit(0);
  } catch (e) {
    console.error('Test failed:', e.message || e);
    try {
      await redisClient.quit();
    } catch (_) {}
    process.exit(2);
  }
}

main();

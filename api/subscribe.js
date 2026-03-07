const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();

function subKey(endpoint) {
  const b64 = Buffer.from(endpoint).toString('base64');
  return `sub:${b64.slice(0, 80).replace(/[^a-zA-Z0-9]/g, '_')}`;
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const subscription = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });

    const key = subKey(subscription.endpoint);

    if (req.method === 'DELETE') {
      await redis.del(key);
      await redis.srem('subscriptions', key);
      return res.status(200).json({ message: 'Unsubscribed' });
    }

    if (req.method === 'POST') {
      // Store for 1 year (subscriptions self-expire if unused)
      await redis.set(key, JSON.stringify(subscription), { ex: 60 * 60 * 24 * 365 });
      await redis.sadd('subscriptions', key);
      return res.status(201).json({ message: 'Subscribed' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

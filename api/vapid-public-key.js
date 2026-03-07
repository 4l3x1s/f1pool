module.exports = function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(500).json({ error: 'VAPID not configured' });
  res.status(200).json({ publicKey: key });
};

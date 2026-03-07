const { Redis } = require('@upstash/redis');
const webpush = require('web-push');
const { calcAllEntries } = require('../lib/entries');

const redis = Redis.fromEnv();

webpush.setVapidDetails(
  `mailto:${process.env.CONTACT_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const BASE = 'https://api.jolpi.ca/ergast/f1/2026';

async function fetchLatestRaceResult() {
  try {
    const res = await fetch(`${BASE}/results.json?limit=1`);
    const data = await res.json();
    const races = data?.MRData?.RaceTable?.Races;
    if (!races?.length) return null;
    const race = races[0];
    return {
      round: parseInt(race.round),
      raceName: race.raceName,
      circuit: race.Circuit.circuitName,
      date: race.date,
      results: race.Results.map(r => ({
        position: r.position,
        familyName: r.Driver.familyName,
        driverId: r.Driver.driverId,
        constructorId: r.Constructor.constructorId,
        status: r.status,
        points: r.points
      }))
    };
  } catch (e) {
    console.error('Fetch race error:', e);
    return null;
  }
}

async function fetchAllRaceResults() {
  // Fetch all completed race results for points calculation
  try {
    const res = await fetch(`${BASE}/results.json?limit=100`);
    const data = await res.json();
    const races = data?.MRData?.RaceTable?.Races || [];
    const raceResults = {};
    for (const race of races) {
      raceResults[parseInt(race.round)] = race.Results.map(r => ({
        position: r.position,
        familyName: r.Driver.familyName,
        constructorId: r.Constructor.constructorId,
        status: r.status
      }));
    }
    return raceResults;
  } catch (e) {
    return {};
  }
}

function buildNotificationPayload(race, sorted) {
  const winner = race.results[0];
  const podium = race.results.slice(0, 3).map(r => r.familyName).join(' / ');

  // Top 3 entries leaderboard
  const leaderboard = sorted.slice(0, 3)
    .map((e, i) => `${['🥇','🥈','🥉'][i]} ${e.name}: ${e.points.total.toFixed(1)}pts`)
    .join('  ');

  return {
    title: `🏁 ${race.raceName} — Results In`,
    body: `Winner: ${winner.familyName}\nPodium: ${podium}\n\n${leaderboard}`,
    url: '/'
  };
}

async function sendPushToAll(payload) {
  const keys = await redis.smembers('subscriptions');
  if (!keys?.length) return { sent: 0, removed: 0 };

  let sent = 0, removed = 0;

  await Promise.all(keys.map(async key => {
    try {
      const raw = await redis.get(key);
      if (!raw) return;
      const subscription = typeof raw === 'string' ? JSON.parse(raw) : raw;
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      sent++;
    } catch (err) {
      // 410 Gone = subscription expired/revoked → remove it
      if (err.statusCode === 410 || err.statusCode === 404) {
        await redis.del(key);
        await redis.srem('subscriptions', key);
        removed++;
      }
    }
  }));

  return { sent, removed };
}

module.exports = async function(req, res) {
  // Security: only allow Vercel cron calls or requests with correct secret
  const isCron = req.headers['x-vercel-cron'] === '1';
  const isAuthed = req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron && !isAuthed) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Fetch latest race result
    const latest = await fetchLatestRaceResult();
    if (!latest) return res.status(200).json({ message: 'No results yet' });

    // 2. Check if we already notified for this round
    const lastNotified = await redis.get('last_notified_round');
    const lastRound = lastNotified ? parseInt(lastNotified) : 0;
    if (latest.round <= lastRound) {
      return res.status(200).json({ message: `Already notified round ${latest.round}` });
    }

    // 3. Fetch all results and calculate pool standings
    const raceResults = await fetchAllRaceResults();
    const sorted = calcAllEntries(raceResults);

    // 4. Build and send notification
    const payload = buildNotificationPayload(latest, sorted);
    const { sent, removed } = await sendPushToAll(payload);

    // 5. Mark as notified
    await redis.set('last_notified_round', latest.round);

    console.log(`Round ${latest.round}: Notified ${sent} subscribers, removed ${removed} expired`);
    res.status(200).json({
      message: `Notified for round ${latest.round}`,
      raceName: latest.raceName,
      sent, removed
    });

  } catch (err) {
    console.error('Cron error:', err);
    res.status(500).json({ error: 'Internal error', details: err.message });
  }
};

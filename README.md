# 🏎️ F1 2026 Pool — PWA with Push Notifications

A full-featured Progressive Web App to track your F1 2026 fantasy pool.  
Auto-fetches race results · Push notifications after every race · Installable on iPhone

---

## What this does

- **Auto-fetches** results from the official F1 API after every race
- **Calculates points** for all 4 entries (F1SEER_1, F1SEER_2, Paul, Wife) using your pool's exact scoring rules
- **Sends push notifications** to all players' phones ~1 hour after each race finishes
- **Installable on iPhone** — works like a native app, no App Store needed

---

## Setup — 4 steps (~15 minutes total)

### Step 1 — Create a free Upstash Redis database

Upstash is a free database that stores push notification subscriptions.

1. Go to [console.upstash.com](https://console.upstash.com) and sign up (free)
2. Click **Create Database**
3. Name it `f1pool`, pick the region closest to you (e.g. `us-east-1`), click Create
4. Once created, click on the database → go to **REST API** tab
5. Copy the **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN** values
6. Keep these for Step 3

---

### Step 2 — Generate VAPID keys

VAPID keys are required to send push notifications. Run this once:

```bash
npm install
node generate-vapid-keys.js
```

You'll see output like:
```
VAPID_PUBLIC_KEY=BFj8...
VAPID_PRIVATE_KEY=abc123...
```

Copy both values. Keep these for Step 3.

---

### Step 3 — Deploy to Vercel (free)

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub (free)
2. Click **Add New Project** → **Import Git Repository**
   - If you don't have GitHub: click **Deploy** → drag-and-drop this entire folder
3. Before clicking Deploy, go to **Environment Variables** and add:

| Variable | Value |
|----------|-------|
| `VAPID_PUBLIC_KEY` | From Step 2 |
| `VAPID_PRIVATE_KEY` | From Step 2 |
| `CONTACT_EMAIL` | Your email address |
| `UPSTASH_REDIS_REST_URL` | From Step 1 |
| `UPSTASH_REDIS_REST_TOKEN` | From Step 1 |
| `CRON_SECRET` | Any random string (e.g. `myf1pool2026`) |

4. Click **Deploy** — you'll get a URL like `https://f1-2026-pool.vercel.app`

---

### Step 4 — Install on iPhone

1. Open your Vercel URL in **Safari** on iPhone (must be Safari, not Chrome)
2. Tap the **Share** button ⬆️ at the bottom
3. Tap **"Add to Home Screen"**
4. Tap **Add** — the app icon appears on your home screen
5. Open the app → tap the 🔕 **bell icon** in the top-right to subscribe to notifications
6. Share the Vercel URL with Paul and your wife — they do the same steps 4-6

---

## How notifications work

- Vercel runs `/api/check-and-notify` **every hour** automatically
- It checks if there's a new race result since the last notification
- If yes, it sends a push notification to everyone who subscribed
- The notification shows: race name, winner, podium, and the current pool leaderboard

**Typical timing:** Results are usually available ~1–2 hours after the chequered flag.  
So you'll get a notification Sunday evening (or early Monday) after each race.

---

## Adding Wife's picks later

Once your wife submits her picks, open `public/index.html` in a text editor.  
Find the `ENTRIES` array and update the `wife` entry (currently `pending: true`).  
Replace with her actual picks, then re-deploy to Vercel.

---

## Project structure

```
f1-pool-pwa/
├── public/
│   ├── index.html          ← The full app
│   ├── sw.js               ← Service worker (offline + push)
│   ├── manifest.json       ← PWA manifest
│   └── icon.svg            ← App icon
├── api/
│   ├── vapid-public-key.js ← Returns VAPID key to client
│   ├── subscribe.js        ← Saves/removes push subscriptions
│   └── check-and-notify.js ← Cron job: checks F1 results & sends notifications
├── lib/
│   └── entries.js          ← Shared entries data & scoring logic
├── vercel.json             ← Cron schedule + routing
├── package.json            ← Dependencies
├── .env.example            ← Environment variables template
└── generate-vapid-keys.js  ← Run once to generate VAPID keys
```

---

## Troubleshooting

**"VAPID not configured" error** → Check your Vercel environment variables are set correctly  
**No notifications arriving** → Make sure you tapped the bell icon in the app to subscribe  
**Cron not running** → Vercel free plan supports cron jobs — check Vercel dashboard → Functions → Cron  
**App not installing on iPhone** → Must use Safari, not Chrome or Firefox  

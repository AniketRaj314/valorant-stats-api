# Valorant Stats API

Node.js/Express API that serves cached Valorant player stats from local snapshots. Snapshots are refreshed on a schedule through the [Apify Playwright Scraper](https://apify.com/apify/playwright-scraper), and live API traffic never triggers scraping.

---

## Current Phase

Phase 1 is intentionally narrow:

- Tracked usernames come from `TRACKED_USERNAMES` in your environment
- Unknown users return `404`
- If the tracked user has not been refreshed yet, the API returns `404`
- Snapshot refresh interval defaults to **48 hours**
- For the simplest setup, you can enable the built-in scheduler with `ENABLE_AUTO_REFRESH=true`

---

## Setup

1. Install dependencies

   ```bash
   npm install
   ```

2. Configure environment

   ```bash
   cp .env.example .env
   ```

   Fill in:

   ```env
   APIFY_TOKEN=your_apify_api_token
   PORT=3000
   API_KEYS=key-alice,key-bob
   TRACKED_USERNAMES=Spider31415#6921
   ENABLE_AUTO_REFRESH=true
   REFRESH_INTERVAL_HOURS=48
   ```

3. Run the API

   ```bash
   npm start
   ```

4. Refresh snapshots

   ```bash
   npm run refresh:snapshots
   ```

   This manual command is still useful even if automatic refresh is enabled.

---

## How It Works

The system has two separate paths:

1. **Refresh path**
   - `npm run refresh:snapshots`
   - runs Apify scrapes
   - builds one full snapshot per tracked user
   - writes snapshots to `cache/snapshots/`

2. **Read path**
   - `POST /valorant/stats/:username`
   - validates input
   - checks that the username is tracked
   - reads the stored snapshot from disk
   - returns only cached data

Live API requests do **not** perform stale-while-revalidate, background refresh, or on-demand Apify scraping anymore.

---

## Deployment Modes

### Simple mode: one service

This is the easiest setup for open-source users:

- deploy the API once
- set `ENABLE_AUTO_REFRESH=true`
- optionally set `REFRESH_INTERVAL_HOURS=48`

In this mode, the app:

- serves cached snapshots from disk
- automatically refreshes missing snapshots on startup
- automatically refreshes again when the configured interval is reached

### Advanced mode: external scheduler

If you want stricter operational separation, keep `ENABLE_AUTO_REFRESH=false` and run:

```bash
npm run refresh:snapshots
```

from Railway cron, GitHub Actions, or another scheduler.

---

## Snapshot Shape

Each tracked user is stored as one snapshot:

```json
{
  "username": "Spider31415#6921",
  "lastRefreshedAt": "2026-05-19T10:00:00.000Z",
  "status": "ok",
  "data": {
    "competitive": {
      "rank": {},
      "agents": [],
      "maps": []
    },
    "unrated": {
      "agents": [],
      "maps": []
    },
    "shared": {
      "totalPlaytime": {}
    }
  }
}
```

`rank` is always served from the competitive snapshot. `totalPlaytime` is treated as shared across playlists.

---

## Refresh Runs Per Full Snapshot

Current full snapshot for one tracked user uses **6 Apify runs**:

| Page | Playlist | Module |
|------|----------|--------|
| `/overview` | `competitive` | `rank` |
| `/agents` | `competitive` | `agents` |
| `/maps` | `competitive` | `maps` |
| `/performance` | `competitive` | `totalPlaytime` (shared) |
| `/agents` | `unrated` | `agents` |
| `/maps` | `unrated` | `maps` |

---

## API Reference

### `GET /health`

Returns server health, package version, and uptime.

### `POST /valorant/stats/:username`

Returns snapshot-backed stats for a tracked player.

Request body:

```json
{
  "playlist": "competitive",
  "modules": {
    "agents": { "playlist": "unrated", "limit": 3 },
    "maps": {},
    "rank": {},
    "totalPlaytime": {}
  }
}
```

Rules:

- top-level `playlist` must be `competitive` or `unrated`
- `modules` is required
- valid modules are `rank`, `agents`, `maps`, `totalPlaytime`
- `modules.<name>.playlist` can override the top-level playlist for `agents` and `maps`
- `rank` always comes from competitive snapshot data
- `totalPlaytime` always comes from shared snapshot data
- `limit` only affects array modules in the response

Example response:

```json
{
  "username": "Spider31415#6921",
  "playlist": "competitive",
  "cachedAt": "2026-05-19T10:00:00.000Z",
  "nextRefreshAt": "2026-05-21T10:00:00.000Z",
  "status": "ok",
  "data": {
    "agents": [
      {
        "agent": "Omen",
        "role": "Controller",
        "timePlayed": "58 hours",
        "matches": "98",
        "winRate": "53.1%",
        "kd": "1.05",
        "adr": "143.3",
        "acs": "222.3",
        "ddDelta": "+12.4",
        "hsPercent": "18%",
        "kast": "71%",
        "icon": "https://...",
        "portrait": "https://...",
        "killfeedPortrait": "https://..."
      }
    ],
    "totalPlaytime": {
      "total": "1,243 hours"
    }
  }
}
```

Error responses:

| Status | Reason |
|--------|--------|
| `400` | Invalid playlist, module, or limit |
| `401` | Invalid or missing API key |
| `404` | User not tracked, snapshot missing, or cached module unavailable |

---

## Scripts

```bash
npm start
npm run dev
npm run refresh:snapshots
npm test
```

---

## Notes

- tracker.gg has no official Valorant API
- scraping happens only in the refresh job
- automatic refresh can also run in-process when `ENABLE_AUTO_REFRESH=true`
- enrichment data still loads at startup from `valorant-api.com`
- `docs/raw-modules.md` remains as a scraper research/reference artifact
- `TRACKED_USERNAMES` accepts one or more Riot IDs, comma-separated

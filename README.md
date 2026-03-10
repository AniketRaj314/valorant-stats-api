# Valorant Stats API

Node.js/Express API that scrapes Valorant player stats from tracker.gg via the [Apify Playwright Scraper](https://apify.com/apify/playwright-scraper) actor.

---

## Setup

1. **Clone and install dependencies**

   ```bash
   cd valorant-stats-api
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your values:

   ```
   APIFY_TOKEN=your_apify_api_token
   PORT=3000
   CACHE_TTL_HOURS=6
   ```

   Get your Apify token at https://console.apify.com/account/integrations

3. **Run locally**

   ```bash
   npm start
   ```

   Or with auto-reload during development (Node 18+):

   ```bash
   npm run dev
   ```

---

## API Reference

### `GET /health`

Returns server status, package version, and uptime.

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok", "version": "1.0.0", "uptime": 42 }
```

---

### `POST /valorant/stats/:username`

**Request body (JSON):**

| Field                     | Default       | Description                                                               |
|---------------------------|---------------|---------------------------------------------------------------------------|
| `playlist`                | `competitive` | Top-level default playlist (`competitive` or `unrated`)                   |
| `modules`                 | _(required)_  | Object whose keys are module names; value is a per-module config object   |
| `modules.<name>.playlist` | _(inherited)_ | Override the playlist for this module only                                |
| `modules.<name>.limit`    | _(none)_      | Positive integer — truncates the result array for this module             |

**Playlist resolution order (per module):**

```
modules.<name>.playlist  →  MODULE_DEFINITIONS[name].playlist  →  body.playlist  →  'competitive'
```

**Available modules:**

| Module          | Page           | Playlist              | Description                                                              |
|-----------------|----------------|-----------------------|--------------------------------------------------------------------------|
| `rank`          | `/overview`    | `competitive` (fixed) | Current and peak rank (icons from valorant-api.com)                      |
| `agents`        | `/agents`      | dynamic               | All agents with full stats (winRate, KD, ADR, ACS, …); enriched with icons/portraits from valorant-api.com |
| `maps`          | `/maps`        | dynamic               | All maps with wins, losses, K/D, ADR, ACS, and top agents per map; enriched with splash/icon from valorant-api.com |
| `totalPlaytime` | `/performance` | dynamic               | Total hours played across all modes                                      |

**Examples:**

```bash
# All agents (unrated)
curl -X POST http://localhost:3000/valorant/stats/Spider31415%236921 \
  -H "Content-Type: application/json" \
  -d '{"playlist": "unrated", "modules": {"agents": {}}}'

# Top 3 agents only
curl -X POST http://localhost:3000/valorant/stats/Spider31415%236921 \
  -H "Content-Type: application/json" \
  -d '{"modules": {"agents": {"limit": 3}}}'

# Rank (always fetches competitive regardless of top-level playlist)
curl -X POST http://localhost:3000/valorant/stats/Spider31415%236921 \
  -H "Content-Type: application/json" \
  -d '{"modules": {"rank": {}}}'

# Total playtime
curl -X POST http://localhost:3000/valorant/stats/Spider31415%236921 \
  -H "Content-Type: application/json" \
  -d '{"modules": {"totalPlaytime": {}}}'

# Top 5 maps (competitive)
curl -X POST http://localhost:3000/valorant/stats/Spider31415%236921 \
  -H "Content-Type: application/json" \
  -d '{"modules": {"maps": {"limit": 5}}}'

# Mixed playlists — agents in competitive (limit 3) + totalPlaytime using default
curl -X POST http://localhost:3000/valorant/stats/Spider31415%236921 \
  -H "Content-Type: application/json" \
  -d '{
    "playlist": "competitive",
    "modules": {
      "agents":        {"playlist": "competitive", "limit": 3},
      "totalPlaytime": {}
    }
  }'
```

**Example response (`modules: { "agents": { "limit": 1 } }`):**

```json
{
  "username": "Spider31415#6921",
  "playlist": "competitive",
  "cachedAt": "2026-03-08T11:00:00.000Z",
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
    ]
  }
}
```

**Example response (`modules: { "maps": { "limit": 1 } }`):**

```json
{
  "username": "Spider31415#6921",
  "playlist": "competitive",
  "cachedAt": "2026-03-08T11:00:00.000Z",
  "data": {
    "maps": [
      {
        "map": "Sunset",
        "displayIcon": "https://media.valorant-api.com/maps/.../displayicon.png",
        "splash": "https://media.valorant-api.com/maps/.../splash.png",
        "winRate": "62.8%",
        "wins": "86",
        "losses": "51",
        "kd": "1.43",
        "adr": "145.2",
        "acs": "228.1",
        "topAgents": [
          {
            "agent": "Omen",
            "winRate": "65%",
            "role": "Controller",
            "icon": "https://...",
            "portrait": "https://...",
            "killfeedPortrait": "https://..."
          }
        ]
      }
    ]
  }
}
```

**Example response (`modules: { "rank": {} }`):**

```json
{
  "username": "Spider31415#6921",
  "playlist": "competitive",
  "cachedAt": "2026-03-08T11:00:00.000Z",
  "data": {
    "rank": {
      "current": {
        "rank": "Gold 2",
        "icon": "https://media.valorant-api.com/..."
      },
      "peak": {
        "rank": "Platinum 1",
        "act":  "Episode 8 Act 1",
        "icon": "https://media.valorant-api.com/..."
      }
    }
  }
}
```

**Example response (`modules: { "totalPlaytime": {} }`):**

```json
{
  "username": "Spider31415#6921",
  "playlist": "competitive",
  "cachedAt": "2026-03-08T11:00:00.000Z",
  "data": {
    "totalPlaytime": {
      "total": "1,243 hours"
    }
  }
}
```

**Stale cache response** (data returned immediately, background refresh triggered):

```json
{
  "username": "Spider31415#6921",
  "playlist": "competitive",
  "cachedAt": "2026-03-08T05:00:00.000Z",
  "stale": true,
  "data": { ... }
}
```

**Error responses:**

| Status | Reason                                 |
|--------|----------------------------------------|
| 400    | Invalid playlist, module name, or limit |
| 404    | Profile not found / no data available  |
| 502    | Apify call failed or timed out         |

---

## Caching

- Cache files are stored in `cache/` as JSON (excluded from git).
- Default TTL: **6 hours** (configurable via `CACHE_TTL_HOURS`).
- On a **fresh cache hit**: data is returned immediately from disk.
- On a **stale cache hit**: stale data is returned immediately (with `"stale": true`), and a background refresh is triggered.
- On a **cache miss**: fresh data is fetched and cached before responding.
- Per-module `limit` is applied at response time — the cache always stores the full list.

---

## Adding New Scraper Modules

1. Open `src/scraper.js` and add a new entry to `MODULE_DEFINITIONS`:

   ```js
   myNewModule: {
     page: 'overview',         // tracker.gg path segment: 'overview' | 'agents' | 'performance'
     // playlist: 'competitive' — omit for dynamic (uses caller's ?playlist= param)
     waitFor: '.some-css-selector',
     extract: `
       const el = document.querySelector('.some-css-selector');
       return { value: el?.innerText?.trim() };
     `,
   },
   ```

2. The module is automatically available as a valid module key in the request body — no other changes needed.

**Tips:**
- `page` controls which tracker.gg URL path is fetched (`/overview`, `/agents`, `/maps`, `/performance`).
- Modules with the same resolved `page` + `playlist` are batched into a single Apify call automatically.
- `waitFor` should be a selector that only appears once the data you want has loaded.
- Test your selectors in browser DevTools on the relevant tracker.gg profile page first.
- See `docs/modules.md` for the full module reference table.

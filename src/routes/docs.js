'use strict';

const express = require('express');
const { ENABLE_AUTO_REFRESH, REFRESH_INTERVAL_HOURS, TRACKED_USERNAMES } = require('../config');

const router = express.Router();

const trackedList = TRACKED_USERNAMES.length
  ? TRACKED_USERNAMES.map((username) => `- ${username}`).join('\n')
  : '- none configured';

const LLMS_TXT = `# Valorant Stats API

> Snapshot-backed API for retrieving Valorant player statistics scraped from tracker.gg via Apify. Live API requests never trigger scraping. A scheduled refresh job writes snapshots to disk, and the API only serves cached snapshot data.

Base URL: https://api.aniketraj.me

## Authentication
All /valorant routes require an API key passed in the X-API-Key request header when API_KEYS is configured.

Example:
  X-API-Key: your-key-here

Missing or invalid key returns: 401 { "error": "Invalid or missing API key" }

## Tracked users
Only explicitly tracked usernames are available in this phase.

Tracked usernames:
${trackedList}

Unknown usernames return: 404 { "error": "User not tracked" }

If a tracked user has not been refreshed yet, the API returns:
404 { "error": "Tracked user has no cached snapshot yet" }

## Refresh strategy
The default refresh interval is ${REFRESH_INTERVAL_HOURS} hours.

If ENABLE_AUTO_REFRESH is true, the API process can refresh snapshots in-process on that cadence.
If ENABLE_AUTO_REFRESH is false, refreshes can be driven externally with:
  npm run refresh:snapshots

## Snapshot model
The refresh job currently builds one snapshot per tracked user with:
- competitive: rank, agents, maps
- unrated: agents, maps
- shared: totalPlaytime

Current refresh plan for one full snapshot:
- overview + competitive → rank
- agents + competitive → agents
- maps + competitive → maps
- performance + competitive → totalPlaytime (shared)
- agents + unrated → agents
- maps + unrated → maps

## Endpoints

### GET /health
Returns server health, package version, and uptime in seconds.

### POST /valorant/stats/:username
Returns snapshot-backed Valorant stats for a tracked player. Accepts a JSON request body.

Path parameters:
- username (required): URL-encoded Riot ID. The # must be encoded as %23.
  Example: Spider31415%236921

Request body:
{
  "playlist": "competitive",
  "modules": {
    "<moduleName>": {
      "playlist": "unrated",
      "limit": 3
    }
  }
}

Body fields:
- playlist (optional, string): top-level default playlist. "competitive" or "unrated". Default: "competitive".
- modules (required, object): keys are module names. Value is a config object with optional fields:
  - playlist (optional, string): overrides the top-level playlist for this module only.
  - limit (optional, positive integer): truncates the returned array for this module.

Available modules:
- rank          — current and peak rank; always served from the competitive snapshot
- agents        — agent stats for competitive or unrated snapshot data
- maps          — map stats for competitive or unrated snapshot data
- totalPlaytime — shared lifetime total playtime

Response shape:
{
  "username": "Spider31415#6921",
  "playlist": "competitive",
  "cachedAt": "2026-05-19T10:00:00.000Z",
  "nextRefreshAt": "2026-05-21T10:00:00.000Z",
  "status": "ok",
  "data": {
    "agents": [ ... ],
    "rank": { ... },
    "maps": [ ... ],
    "totalPlaytime": { "total": "120 hours" }
  }
}

Error responses:
- 400: invalid playlist value, unknown module name, or invalid limit
- 404: user not tracked, snapshot missing, or cached module data unavailable

## Operations

### Snapshot refresh command
Run:
  npm run refresh:snapshots

This command refreshes all tracked users and writes updated snapshots to disk.

## Notes
- tracker.gg has no official Valorant API; refresh jobs scrape public profile pages through Apify
- live API traffic never triggers Apify runs
- totalPlaytime is treated as shared across playlists
- rank is always served from the competitive snapshot
- nextRefreshAt is calculated from cachedAt + ${REFRESH_INTERVAL_HOURS} hours
- current ENABLE_AUTO_REFRESH setting: ${ENABLE_AUTO_REFRESH ? 'enabled' : 'disabled'}
`.trimEnd();

router.get('/llms.txt', (req, res) => {
  res.type('text/plain').send(LLMS_TXT);
});

const TRACKED_HTML = TRACKED_USERNAMES.length
  ? TRACKED_USERNAMES.map((username) => `<li><code>${username}</code></li>`).join('')
  : '<li><code>none configured</code></li>';

const DOCS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Valorant Stats API</title>
  <style>
    :root {
      --bg: #0f1115;
      --panel: #171a21;
      --panel-2: #1f2430;
      --text: #ebedf2;
      --muted: #9aa3b2;
      --accent: #ff4655;
      --border: #2d3443;
      --good: #40c463;
      --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      --sans: Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: linear-gradient(180deg, #0f1115 0%, #121723 100%);
      color: var(--text);
      font-family: var(--sans);
      line-height: 1.6;
    }
    .wrap {
      width: min(980px, calc(100% - 32px));
      margin: 0 auto;
      padding: 40px 0 64px;
    }
    .hero, .card {
      background: rgba(23, 26, 33, 0.92);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 24px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.22);
    }
    .hero { margin-bottom: 20px; }
    h1, h2, h3 { margin: 0 0 12px; }
    h1 { font-size: 38px; line-height: 1.1; }
    h2 { font-size: 22px; margin-top: 28px; }
    p, li { color: var(--muted); }
    code, pre {
      font-family: var(--mono);
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 10px;
    }
    code { padding: 2px 6px; }
    pre {
      padding: 14px;
      overflow: auto;
      white-space: pre-wrap;
    }
    .grid {
      display: grid;
      gap: 20px;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }
    .pill {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255, 70, 85, 0.35);
      color: var(--accent);
      font-size: 13px;
      margin-bottom: 14px;
    }
    .ok {
      color: var(--good);
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
    }
    th, td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    th { color: var(--text); }
    .section { margin-top: 20px; }
    a { color: var(--accent); }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="pill">Snapshot-only API</div>
      <h1>Valorant Stats API</h1>
      <p>Public tracker.gg data is refreshed on a schedule through Apify and stored as local snapshots. Live API requests only read cached snapshot data and never launch a scraper run.</p>
      <p class="ok">Phase 1 behavior: only tracked users are supported.</p>
    </section>

    <div class="grid">
      <section class="card">
        <h3>Tracked users</h3>
        <ul>${TRACKED_HTML}</ul>
        <p>Unknown usernames return <code>404 User not tracked</code>.</p>
      </section>

      <section class="card">
        <h3>Refresh command</h3>
        <pre>npm run refresh:snapshots</pre>
        <p>Enable in-process refresh with <code>ENABLE_AUTO_REFRESH=true</code>, or run this command externally on your preferred schedule.</p>
      </section>
    </div>

    <section class="card section">
      <h2>Endpoint</h2>
      <p><code>POST /valorant/stats/:username</code></p>
      <p>Request body:</p>
      <pre>{
  "playlist": "competitive",
  "modules": {
    "agents": { "playlist": "unrated", "limit": 3 },
    "maps": {},
    "totalPlaytime": {}
  }
}</pre>
      <p>Valid modules are <code>rank</code>, <code>agents</code>, <code>maps</code>, and <code>totalPlaytime</code>.</p>
      <p><code>rank</code> always comes from the competitive snapshot. <code>totalPlaytime</code> is shared across playlists.</p>
    </section>

    <section class="card section">
      <h2>Snapshot layout</h2>
      <pre>{
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
}</pre>
    </section>

    <section class="card section">
      <h2>Refresh runs per full snapshot</h2>
      <table>
        <thead>
          <tr><th>Page</th><th>Playlist</th><th>Module</th></tr>
        </thead>
        <tbody>
          <tr><td><code>/overview</code></td><td><code>competitive</code></td><td><code>rank</code></td></tr>
          <tr><td><code>/agents</code></td><td><code>competitive</code></td><td><code>agents</code></td></tr>
          <tr><td><code>/maps</code></td><td><code>competitive</code></td><td><code>maps</code></td></tr>
          <tr><td><code>/performance</code></td><td><code>competitive</code></td><td><code>totalPlaytime</code> shared</td></tr>
          <tr><td><code>/agents</code></td><td><code>unrated</code></td><td><code>agents</code></td></tr>
          <tr><td><code>/maps</code></td><td><code>unrated</code></td><td><code>maps</code></td></tr>
        </tbody>
      </table>
    </section>

    <section class="card section">
      <h2>Error behavior</h2>
      <ul>
        <li><code>400</code>: invalid playlist, module, or limit</li>
        <li><code>401</code>: missing or invalid API key when auth is enabled</li>
        <li><code>404</code>: user not tracked, snapshot missing, or requested cached module data unavailable</li>
      </ul>
    </section>
  </div>
</body>
</html>`;

router.get(['/docs', '/'], (req, res) => {
  res.type('html').send(DOCS_HTML);
});

module.exports = router;

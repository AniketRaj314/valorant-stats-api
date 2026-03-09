'use strict';

const express = require('express');
const router = express.Router();

// ─── /llms.txt ───────────────────────────────────────────────────────────────

const LLMS_TXT = `# Valorant Stats API

> An API for retrieving Valorant player statistics scraped from tracker.gg via Apify. Data is cached per username, playlist, and module combination with a stale-while-revalidate strategy.

Base URL: https://api.aniketraj.me

## Authentication
All /valorant routes require an API key passed in the X-API-Key request header.

Example:
  X-API-Key: your-key-here

Missing or invalid key returns: 401 { "error": "Invalid or missing API key" }

## Caching
Each module is cached independently keyed by username + playlist + module name. TTL is 6 hours.
- Fresh hit (< 6h old): returned immediately, no upstream call.
- Stale hit (>= 6h old): stale data returned immediately with "stale": true; background refresh triggered.
- Cache miss: synchronous scrape before responding (may take up to ~60s).
- Per-module limit is applied at response time — the cache always stores the full dataset.

## Endpoints

### GET /health
Returns server health, package version, and uptime in seconds.

Response:
{ "status": "ok", "version": "1.0.0", "uptime": 3721 }

### POST /valorant/stats/:username
Returns Valorant stats for a given player. Accepts a JSON request body.

Path parameters:
- username (required): URL-encoded Riot ID. The # must be encoded as %23.
  Example: Spider31415%236921

Request body (Content-Type: application/json):
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
- playlist (optional, string): Top-level default playlist. "competitive" or "unrated". Default: "competitive".
- modules (required, object): Keys are module names. Value is a config object with optional fields:
  - playlist (optional, string): Overrides the top-level playlist for this module only.
  - limit (optional, positive integer): Truncates the result array to this length. Applied at response time; cache stores full data.

Playlist resolution order per module (first defined wins):
  modules.<name>.playlist  →  MODULE_DEFINITIONS[name].playlist  →  body.playlist

Available modules:
- rank          — Current and peak competitive rank with icons. Always uses competitive playlist regardless of top-level playlist.
- agents        — All agents with full stats (timePlayed, matches, winRate, kd, adr, acs, ddDelta, hsPercent, kast), enriched with icon/portrait/killfeedPortrait from valorant-api.com.
- maps          — All maps with wins, losses, kd, adr, acs, winRate, topAgents per map, enriched with displayIcon/splash from valorant-api.com.
- totalPlaytime — Total hours played across all modes for the given playlist.

Response shape:
{
  "username": "Spider31415#6921",
  "playlist": "competitive",
  "cachedAt": "2026-03-08T11:00:00.000Z",
  "stale": true,
  "data": {
    "agents": [ ... ],
    "rank": { "current": { ... }, "peak": { ... } },
    "maps": [ ... ],
    "totalPlaytime": { "total": "120 hours" }
  }
}

Note: "stale" key is only present when returning stale cached data.

agents entry shape:
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
  "icon": "https://media.valorant-api.com/...",
  "portrait": "https://media.valorant-api.com/...",
  "killfeedPortrait": "https://media.valorant-api.com/..."
}

rank shape:
{
  "current": { "rank": "Gold 2", "icon": "https://..." },
  "peak": { "rank": "Platinum 1", "act": "Episode 8 Act 1", "icon": "https://..." }
}

maps entry shape:
{
  "map": "Sunset",
  "displayIcon": "https://media.valorant-api.com/...",
  "splash": "https://media.valorant-api.com/...",
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

totalPlaytime shape:
{ "total": "120 hours" }

Error responses:
- 400: Invalid playlist value, unknown module name, or invalid limit (not a positive integer)
- 404: Profile not found, private profile, or no data available for the requested playlist
- 502: Apify scraper call failed or timed out

## Example requests

# All agents, competitive (default)
POST /valorant/stats/Spider31415%236921
Body: {"modules": {"agents": {}}}

# Top 3 agents, unrated
POST /valorant/stats/Spider31415%236921
Body: {"playlist": "unrated", "modules": {"agents": {"limit": 3}}}

# Rank (always competitive, ignores top-level playlist)
POST /valorant/stats/Spider31415%236921
Body: {"modules": {"rank": {}}}

# Maps, top 5 only
POST /valorant/stats/Spider31415%236921
Body: {"modules": {"maps": {"limit": 5}}}

# Total playtime, unrated
POST /valorant/stats/Spider31415%236921
Body: {"playlist": "unrated", "modules": {"totalPlaytime": {}}}

# Multiple modules, mixed playlists
POST /valorant/stats/Spider31415%236921
Body: {"playlist": "competitive", "modules": {"agents": {"playlist": "competitive", "limit": 3}, "totalPlaytime": {}}}

## Notes
- tracker.gg has no official Valorant API — this service scrapes public profile pages using Apify with residential proxies
- Only public profiles are supported; private profiles return 404
- The # in Riot IDs must always be encoded as %23 in the URL path
- First-load responses may take up to ~60s; subsequent requests return cached data instantly
- rank always scrapes the competitive page regardless of the top-level playlist in the request body
`.trimEnd();

router.get('/llms.txt', (req, res) => {
  res.type('text/plain').send(LLMS_TXT);
});

// ─── /docs ───────────────────────────────────────────────────────────────────

const DOCS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Valorant Stats API — Docs</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0d0d0d;
      --surface: #161616;
      --surface2: #1c1c1c;
      --border: #272727;
      --text: #e2e2e2;
      --muted: #777;
      --muted2: #555;
      --accent: #ff4655;
      --blue: #7b9fff;
      --green: #3dd68c;
      --yellow: #f5c518;
      --orange: #f09150;
      --mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
      --sans: Inter, system-ui, -apple-system, sans-serif;
    }

    body { background: var(--bg); color: var(--text); font-family: var(--sans); font-size: 15px; line-height: 1.75; }

    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }

    code {
      font-family: var(--mono);
      font-size: 12.5px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 3px;
      padding: 1px 5px;
    }

    .page { max-width: 880px; margin: 0 auto; padding: 52px 24px 96px; }

    /* Header */
    .header { padding-bottom: 36px; margin-bottom: 52px; border-bottom: 1px solid var(--border); }
    .header h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.4px; }
    .header h1 em { color: var(--accent); font-style: normal; }
    .header p { margin-top: 10px; color: var(--muted); max-width: 580px; line-height: 1.65; font-size: 14px; }

    /* Section */
    section { margin-bottom: 60px; }
    h2 {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.4px;
      color: var(--muted2);
      margin-bottom: 22px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }

    /* Key-value rows */
    .kv { display: flex; gap: 16px; margin-bottom: 10px; align-items: baseline; flex-wrap: wrap; font-size: 14px; }
    .kv-label { color: var(--muted); min-width: 90px; flex-shrink: 0; }

    /* Callout */
    .callout {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 3px solid var(--blue);
      border-radius: 6px;
      padding: 14px 18px;
      font-size: 13.5px;
      color: var(--muted);
      line-height: 1.7;
    }
    .callout + .callout { margin-top: 10px; }

    /* Endpoint card */
    .endpoint {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 32px;
    }
    .endpoint-top {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 22px;
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
    }
    .badge {
      font-family: var(--mono);
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.6px;
      padding: 4px 9px;
      border-radius: 4px;
    }
    .badge-get  { background: #0f2d1f; color: var(--green); }
    .badge-post { background: #1a2540; color: var(--blue); }
    .ep-path { font-family: var(--mono); font-size: 14px; }
    .ep-desc { padding: 14px 22px 0; font-size: 13.5px; color: var(--muted); }
    .endpoint-body { padding: 18px 22px 22px; display: flex; flex-direction: column; gap: 20px; }

    /* Tables */
    .tbl-wrap { overflow-x: auto; }
    .tbl-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.9px; color: var(--muted2); margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 8px 12px; color: var(--muted); font-weight: 500; border-bottom: 1px solid var(--border); white-space: nowrap; }
    td { padding: 9px 12px; border-bottom: 1px solid var(--border); vertical-align: top; line-height: 1.55; }
    tr:last-child td { border-bottom: none; }
    td.field { font-family: var(--mono); font-size: 12.5px; color: var(--blue); white-space: nowrap; }
    td.type  { font-family: var(--mono); font-size: 12px; color: var(--muted); white-space: nowrap; }
    .pill {
      display: inline-block;
      font-size: 10.5px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 3px;
      margin-right: 4px;
    }
    .pill-req  { background: #3a1a1a; color: var(--accent); }
    .pill-opt  { background: #222; color: var(--muted); }
    .pill-fixed { background: #1a1a2e; color: var(--orange); }

    /* Code blocks */
    .code-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.9px; color: var(--muted2); margin-bottom: 8px; }
    pre {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 15px 18px;
      overflow-x: auto;
      font-family: var(--mono);
      font-size: 12.5px;
      line-height: 1.65;
      color: var(--text);
    }
    .t-curl { color: #80b4e8; }
    .t-key  { color: #9ecbff; }
    .t-str  { color: #b5d4a8; }
    .t-num  { color: var(--green); }
    .t-bool { color: var(--yellow); }
    .t-null { color: var(--muted); }
    .t-cm   { color: var(--muted2); }

    /* Module cards */
    .module-grid { display: flex; flex-direction: column; gap: 16px; }
    .mod-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 18px 20px;
    }
    .mod-name { font-family: var(--mono); font-size: 15px; font-weight: 600; color: var(--blue); margin-bottom: 4px; }
    .mod-meta { font-size: 12.5px; color: var(--muted); margin-bottom: 12px; line-height: 1.5; }
    .mod-tag { display: inline-block; font-size: 11px; font-family: var(--mono); background: var(--surface2); border: 1px solid var(--border); border-radius: 3px; padding: 2px 7px; margin: 2px 3px 2px 0; color: var(--text); }
    .mod-note { margin-top: 10px; font-size: 12.5px; color: var(--muted); }

    /* Error table */
    .err-code { font-family: var(--mono); font-size: 13px; color: var(--accent); }

    /* Footer */
    .footer { padding-top: 28px; border-top: 1px solid var(--border); font-size: 13px; color: var(--muted); }
    .footer a { color: var(--muted); text-decoration: underline; }

    @media (max-width: 620px) {
      .page { padding: 28px 16px 60px; }
      .header h1 { font-size: 21px; }
      .endpoint-top { flex-direction: column; gap: 8px; }
      td, th { padding: 7px 8px; font-size: 12px; }
      pre { font-size: 11.5px; padding: 12px 14px; }
    }
  </style>
</head>
<body>
<div class="page">

  <header class="header">
    <h1>Valorant Stats <em>API</em></h1>
    <p>Player statistics scraped from tracker.gg via Apify, served with per-module stale-while-revalidate caching. Send a JSON body, get structured stats back.</p>
  </header>

  <!-- Overview -->
  <section>
    <h2>Overview</h2>
    <div class="kv"><span class="kv-label">Base URL</span><code>https://api.aniketraj.me</code></div>
    <div class="kv"><span class="kv-label">Auth</span><code>X-API-Key: &lt;your-key&gt;</code><span style="font-size:13px; color:var(--muted)"> — required on all <code>/valorant</code> routes</span></div>
    <div class="kv"><span class="kv-label">Format</span><code>application/json</code></div>
    <div class="kv"><span class="kv-label">Source</span><span style="font-size:14px; color:var(--muted)">tracker.gg · Apify residential proxies · valorant-api.com (enrichment)</span></div>
  </section>

  <!-- Caching -->
  <section>
    <h2>Caching</h2>
    <div style="display:flex; flex-direction:column; gap:10px;">
      <div class="callout"><strong style="color:var(--green)">Fresh hit</strong> — Cache &lt; 6 hours old. Data returned immediately, zero upstream calls.</div>
      <div class="callout"><strong style="color:var(--yellow)">Stale hit</strong> — Cache ≥ 6 hours old. Stale data returned instantly with <code>"stale": true</code>; silent background refresh triggered.</div>
      <div class="callout"><strong style="color:var(--accent)">Cache miss</strong> — No cache entry. Synchronous scrape runs before responding — first load may take up to ~60s.</div>
    </div>
    <p style="margin-top:16px; font-size:13.5px; color:var(--muted);">Cache is keyed per <code>username + playlist + module</code>. Each module is cached independently. <code>limit</code> is applied at response time — the full dataset is always stored.</p>
  </section>

  <!-- Endpoints -->
  <section>
    <h2>Endpoints</h2>

    <!-- GET /health -->
    <div class="endpoint">
      <div class="endpoint-top">
        <span class="badge badge-get">GET</span>
        <span class="ep-path">/health</span>
      </div>
      <p class="ep-desc">Health check. Returns server status, package version, and uptime in seconds.</p>
      <div class="endpoint-body">
        <div>
          <div class="code-label">Request</div>
          <pre class="t-curl">curl https://api.aniketraj.me/health</pre>
        </div>
        <div>
          <div class="code-label">Response</div>
          <pre>{ <span class="t-key">"status"</span>: <span class="t-str">"ok"</span>, <span class="t-key">"version"</span>: <span class="t-str">"1.0.0"</span>, <span class="t-key">"uptime"</span>: <span class="t-num">3721</span> }</pre>
        </div>
      </div>
    </div>

    <!-- POST /valorant/stats/:username -->
    <div class="endpoint">
      <div class="endpoint-top">
        <span class="badge badge-post">POST</span>
        <span class="ep-path">/valorant/stats/:username</span>
      </div>
      <p class="ep-desc">Fetch Valorant stats for a player. Accepts a JSON request body. The <code>#</code> in Riot IDs must be URL-encoded as <code>%23</code>.</p>
      <div class="endpoint-body">

        <div>
          <div class="tbl-label">Path parameters</div>
          <div class="tbl-wrap">
            <table>
              <tr><th>Name</th><th>Type</th><th></th><th>Description</th></tr>
              <tr>
                <td class="field">username</td>
                <td class="type">string</td>
                <td><span class="pill pill-req">required</span></td>
                <td>URL-encoded Riot ID. e.g. <code>Spider31415%236921</code></td>
              </tr>
            </table>
          </div>
        </div>

        <div>
          <div class="tbl-label">Request body fields</div>
          <div class="tbl-wrap">
            <table>
              <tr><th>Field</th><th>Type</th><th></th><th>Description</th></tr>
              <tr>
                <td class="field">playlist</td>
                <td class="type">string</td>
                <td><span class="pill pill-opt">optional</span></td>
                <td>Top-level playlist default. <code>competitive</code> or <code>unrated</code>. Default: <code>competitive</code></td>
              </tr>
              <tr>
                <td class="field">modules</td>
                <td class="type">object</td>
                <td><span class="pill pill-req">required</span></td>
                <td>Keys are module names. Value is a config object — see below.</td>
              </tr>
              <tr>
                <td class="field">modules.&lt;name&gt;.playlist</td>
                <td class="type">string</td>
                <td><span class="pill pill-opt">optional</span></td>
                <td>Playlist override for this module only. Overrides the top-level <code>playlist</code> and any definition-level default.</td>
              </tr>
              <tr>
                <td class="field">modules.&lt;name&gt;.limit</td>
                <td class="type">integer</td>
                <td><span class="pill pill-opt">optional</span></td>
                <td>Positive integer. Truncates the module's result array. Cache always stores the full data.</td>
              </tr>
            </table>
          </div>
          <p style="margin-top:10px; font-size:12.5px; color:var(--muted);">
            Playlist resolution order per module (first defined wins):<br>
            <code>modules.&lt;name&gt;.playlist</code> → definition-level default → <code>body.playlist</code>
          </p>
        </div>

        <div>
          <div class="code-label">Example requests</div>
          <pre><span class="t-cm"># All agents, competitive (default)</span>
<span class="t-curl">curl -X POST https://api.aniketraj.me/valorant/stats/Spider31415%236921 \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-key-here" \\
  -d '{"modules": {"agents": {}}}'</span>

<span class="t-cm"># Top 3 agents, unrated</span>
<span class="t-curl">curl -X POST https://api.aniketraj.me/valorant/stats/Spider31415%236921 \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-key-here" \\
  -d '{"playlist": "unrated", "modules": {"agents": {"limit": 3}}}'</span>

<span class="t-cm"># Rank (always competitive regardless of top-level playlist)</span>
<span class="t-curl">curl -X POST https://api.aniketraj.me/valorant/stats/Spider31415%236921 \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-key-here" \\
  -d '{"modules": {"rank": {}}}'</span>

<span class="t-cm"># Top 5 maps</span>
<span class="t-curl">curl -X POST https://api.aniketraj.me/valorant/stats/Spider31415%236921 \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-key-here" \\
  -d '{"modules": {"maps": {"limit": 5}}}'</span>

<span class="t-cm"># Multiple modules, mixed playlists</span>
<span class="t-curl">curl -X POST https://api.aniketraj.me/valorant/stats/Spider31415%236921 \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-key-here" \\
  -d '{
    "playlist": "competitive",
    "modules": {
      "agents":        {"playlist": "competitive", "limit": 3},
      "totalPlaytime": {}
    }
  }'</span></pre>
        </div>

        <div>
          <div class="code-label">Response — agents module</div>
          <pre>{
  <span class="t-key">"username"</span>:  <span class="t-str">"Spider31415#6921"</span>,
  <span class="t-key">"playlist"</span>:  <span class="t-str">"competitive"</span>,
  <span class="t-key">"cachedAt"</span>:  <span class="t-str">"2026-03-08T11:00:00.000Z"</span>,
  <span class="t-key">"data"</span>: {
    <span class="t-key">"agents"</span>: [
      {
        <span class="t-key">"agent"</span>:            <span class="t-str">"Omen"</span>,
        <span class="t-key">"role"</span>:             <span class="t-str">"Controller"</span>,
        <span class="t-key">"timePlayed"</span>:      <span class="t-str">"58 hours"</span>,
        <span class="t-key">"matches"</span>:         <span class="t-str">"98"</span>,
        <span class="t-key">"winRate"</span>:         <span class="t-str">"53.1%"</span>,
        <span class="t-key">"kd"</span>:             <span class="t-str">"1.05"</span>,
        <span class="t-key">"adr"</span>:            <span class="t-str">"143.3"</span>,
        <span class="t-key">"acs"</span>:            <span class="t-str">"222.3"</span>,
        <span class="t-key">"ddDelta"</span>:        <span class="t-str">"+12.4"</span>,
        <span class="t-key">"hsPercent"</span>:      <span class="t-str">"18%"</span>,
        <span class="t-key">"kast"</span>:           <span class="t-str">"71%"</span>,
        <span class="t-key">"icon"</span>:           <span class="t-str">"https://media.valorant-api.com/..."</span>,
        <span class="t-key">"portrait"</span>:       <span class="t-str">"https://media.valorant-api.com/..."</span>,
        <span class="t-key">"killfeedPortrait"</span>:<span class="t-str">"https://media.valorant-api.com/..."</span>
      }
    ]
  }
}</pre>
        </div>

        <div>
          <div class="code-label">Response — maps module</div>
          <pre>{
  <span class="t-key">"username"</span>: <span class="t-str">"Spider31415#6921"</span>,
  <span class="t-key">"playlist"</span>: <span class="t-str">"competitive"</span>,
  <span class="t-key">"cachedAt"</span>: <span class="t-str">"2026-03-08T11:00:00.000Z"</span>,
  <span class="t-key">"data"</span>: {
    <span class="t-key">"maps"</span>: [
      {
        <span class="t-key">"map"</span>:         <span class="t-str">"Sunset"</span>,
        <span class="t-key">"displayIcon"</span>: <span class="t-str">"https://media.valorant-api.com/..."</span>,
        <span class="t-key">"splash"</span>:      <span class="t-str">"https://media.valorant-api.com/..."</span>,
        <span class="t-key">"winRate"</span>:     <span class="t-str">"62.8%"</span>,
        <span class="t-key">"wins"</span>:        <span class="t-str">"86"</span>,
        <span class="t-key">"losses"</span>:      <span class="t-str">"51"</span>,
        <span class="t-key">"kd"</span>:          <span class="t-str">"1.43"</span>,
        <span class="t-key">"adr"</span>:         <span class="t-str">"145.2"</span>,
        <span class="t-key">"acs"</span>:         <span class="t-str">"228.1"</span>,
        <span class="t-key">"topAgents"</span>: [
          {
            <span class="t-key">"agent"</span>:            <span class="t-str">"Omen"</span>,
            <span class="t-key">"winRate"</span>:         <span class="t-str">"65%"</span>,
            <span class="t-key">"role"</span>:             <span class="t-str">"Controller"</span>,
            <span class="t-key">"icon"</span>:           <span class="t-str">"https://..."</span>,
            <span class="t-key">"portrait"</span>:       <span class="t-str">"https://..."</span>,
            <span class="t-key">"killfeedPortrait"</span>:<span class="t-str">"https://..."</span>
          }
        ]
      }
    ]
  }
}</pre>
        </div>

        <div>
          <div class="code-label">Stale response (extra field)</div>
          <pre>{
  <span class="t-key">"username"</span>: <span class="t-str">"Spider31415#6921"</span>,
  <span class="t-key">"playlist"</span>: <span class="t-str">"competitive"</span>,
  <span class="t-key">"cachedAt"</span>: <span class="t-str">"2026-03-08T05:00:00.000Z"</span>,
  <span class="t-key">"stale"</span>:    <span class="t-bool">true</span>,
  <span class="t-key">"data"</span>: { <span class="t-cm">...</span> }
}</pre>
        </div>

      </div>
    </div>
  </section>

  <!-- Modules -->
  <section>
    <h2>Modules</h2>
    <p style="font-size:13.5px; color:var(--muted); margin-bottom:20px; max-width:640px;">Each module maps to a specific tracker.gg profile page. Modules that share the same resolved playlist are batched into a single Apify call automatically.</p>
    <div class="module-grid">

      <div class="mod-card">
        <div class="mod-name">rank</div>
        <div class="mod-meta">
          Page: <code>/overview</code> &nbsp;·&nbsp;
          Playlist: <span class="pill pill-fixed">competitive (fixed)</span><br>
          Current and peak competitive rank. Always fetches the competitive page regardless of the request-level playlist. Icons enriched from valorant-api.com.
        </div>
        <div>
          <span class="mod-tag">current.rank</span>
          <span class="mod-tag">current.icon</span>
          <span class="mod-tag">peak.rank</span>
          <span class="mod-tag">peak.act</span>
          <span class="mod-tag">peak.icon</span>
        </div>
      </div>

      <div class="mod-card">
        <div class="mod-name">agents</div>
        <div class="mod-meta">
          Page: <code>/agents</code> &nbsp;·&nbsp;
          Playlist: <span class="pill pill-opt">dynamic</span><br>
          All agents with full stats. Enriched with icon, portrait, and killfeedPortrait from valorant-api.com.
        </div>
        <div>
          <span class="mod-tag">agent</span>
          <span class="mod-tag">role</span>
          <span class="mod-tag">timePlayed</span>
          <span class="mod-tag">matches</span>
          <span class="mod-tag">winRate</span>
          <span class="mod-tag">kd</span>
          <span class="mod-tag">adr</span>
          <span class="mod-tag">acs</span>
          <span class="mod-tag">ddDelta</span>
          <span class="mod-tag">hsPercent</span>
          <span class="mod-tag">kast</span>
          <span class="mod-tag">icon</span>
          <span class="mod-tag">portrait</span>
          <span class="mod-tag">killfeedPortrait</span>
        </div>
        <p class="mod-note">Use <code>limit</code> to cap the number of agents returned (e.g. <code>"limit": 3</code> for top 3).</p>
      </div>

      <div class="mod-card">
        <div class="mod-name">maps</div>
        <div class="mod-meta">
          Page: <code>/maps</code> &nbsp;·&nbsp;
          Playlist: <span class="pill pill-opt">dynamic</span><br>
          All maps with stats and top agents per map. Enriched with displayIcon and splash from valorant-api.com. Top agents further enriched with agent icons/portraits.
        </div>
        <div>
          <span class="mod-tag">map</span>
          <span class="mod-tag">displayIcon</span>
          <span class="mod-tag">splash</span>
          <span class="mod-tag">winRate</span>
          <span class="mod-tag">wins</span>
          <span class="mod-tag">losses</span>
          <span class="mod-tag">kd</span>
          <span class="mod-tag">adr</span>
          <span class="mod-tag">acs</span>
          <span class="mod-tag">topAgents[].agent</span>
          <span class="mod-tag">topAgents[].winRate</span>
          <span class="mod-tag">topAgents[].role</span>
          <span class="mod-tag">topAgents[].icon</span>
        </div>
      </div>

      <div class="mod-card">
        <div class="mod-name">totalPlaytime</div>
        <div class="mod-meta">
          Page: <code>/performance</code> &nbsp;·&nbsp;
          Playlist: <span class="pill pill-opt">dynamic</span><br>
          Total hours played across all modes for the given playlist.
        </div>
        <div>
          <span class="mod-tag">total</span>
        </div>
      </div>

    </div>
  </section>

  <!-- Errors -->
  <section>
    <h2>Error codes</h2>
    <div class="tbl-wrap">
      <table>
        <tr><th>Status</th><th>Reason</th></tr>
        <tr><td class="err-code">401</td><td>Missing or invalid <code>X-API-Key</code> header</td></tr>
        <tr><td class="err-code">400</td><td>Invalid <code>playlist</code> value, unknown module name, or <code>limit</code> is not a positive integer</td></tr>
        <tr><td class="err-code">404</td><td>Profile not found, private profile, or no data available for the requested playlist</td></tr>
        <tr><td class="err-code">502</td><td>Apify scraper call failed or timed out — retry after a few minutes</td></tr>
      </table>
    </div>
  </section>

  <!-- Notes -->
  <section>
    <h2>Notes</h2>
    <ul style="font-size:13.5px; color:var(--muted); line-height:2.1; padding-left:20px;">
      <li>tracker.gg has no official API — this service scrapes public profile pages via Apify with residential proxies</li>
      <li>Only public Valorant profiles are supported; private profiles return 404</li>
      <li>The <code>#</code> in Riot IDs must always be encoded as <code>%23</code> in the URL path</li>
      <li>First-load responses may take up to ~60s; subsequent requests hit cache and return instantly</li>
      <li><code>rank</code> always scrapes the competitive page — the top-level <code>playlist</code> field has no effect on it</li>
    </ul>
  </section>

  <footer class="footer">
    Machine-readable version available at <a href="/llms.txt">/llms.txt</a>
  </footer>

</div>
</body>
</html>`;

router.get('/docs', (req, res) => {
  res.type('text/html').send(DOCS_HTML);
});

module.exports = router;

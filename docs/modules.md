# Modules Reference

Each module maps to a tracker.gg profile page. Modules that share the same resolved `page + playlist` are batched into a single Apify call automatically.

| Module          | Page           | Playlist              | waitFor Selector                               |
|-----------------|----------------|-----------------------|------------------------------------------------|
| `rank`          | `/overview`    | `competitive` (fixed) | `.area-rating .rating-entry__rank-info .value` |
| `agents`        | `/agents`      | dynamic               | `.st-content__item`                            |
| `maps`          | `/maps`        | dynamic               | `.st-content__item`                            |
| `totalPlaytime` | `/performance` | dynamic               | `.playtime-summary .value`                     |

---

## `rank`

**Returns:** object

Always fetches the competitive overview page regardless of the top-level `playlist` in the request. Icons are resolved from valorant-api.com.

```json
{
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
```

| Field          | Type   | Description                              |
|----------------|--------|------------------------------------------|
| `current.rank` | string | Display name of the current rank         |
| `current.icon` | string | URL of the rank icon image               |
| `peak.rank`    | string | Display name of the peak rank            |
| `peak.act`     | string | Act label for the peak rank              |
| `peak.icon`    | string | URL of the peak rank icon image          |

---

## `agents`

**Returns:** array of objects

All agents played, ordered by time played descending. Use `limit` in the request to cap the number returned. Icons enriched from valorant-api.com.

```json
[
  {
    "agent":            "Omen",
    "role":             "Controller",
    "timePlayed":       "58 hours",
    "matches":          "98",
    "winRate":          "53.1%",
    "kd":               "1.05",
    "adr":              "143.3",
    "acs":              "222.3",
    "ddDelta":          "+12.4",
    "hsPercent":        "18%",
    "kast":             "71%",
    "icon":             "https://media.valorant-api.com/...",
    "portrait":         "https://media.valorant-api.com/...",
    "killfeedPortrait": "https://media.valorant-api.com/..."
  }
]
```

| Field              | Type          | Description                                               |
|--------------------|---------------|-----------------------------------------------------------|
| `agent`            | string        | Agent display name (e.g. `"Omen"`, `"Jett"`)             |
| `role`             | string        | Agent role (e.g. `"Controller"`, `"Duelist"`)             |
| `timePlayed`       | string        | Total time played with this agent (e.g. `"58 hours"`)     |
| `matches`          | string        | Total matches played                                      |
| `winRate`          | string        | Win rate as a percentage string (e.g. `"53.1%"`)          |
| `kd`               | string        | Kill/death ratio (e.g. `"1.05"`)                          |
| `adr`              | string        | Average damage per round (e.g. `"143.3"`)                 |
| `acs`              | string        | Average combat score (e.g. `"222.3"`)                     |
| `ddDelta`          | string        | Damage delta per round (e.g. `"+12.4"` or `"-5.1"`)       |
| `hsPercent`        | string        | Headshot percentage (e.g. `"18%"`)                        |
| `kast`             | string        | KAST percentage — rounds with Kill/Assist/Survive/Trade   |
| `icon`             | string \| null | Agent icon URL from valorant-api.com                     |
| `portrait`         | string \| null | Full-body portrait URL from valorant-api.com             |
| `killfeedPortrait` | string \| null | Killfeed portrait URL from valorant-api.com              |

---

## `maps`

**Returns:** array of objects

All maps played, ordered by matches played descending. Use `limit` to cap the number returned. Map assets enriched from valorant-api.com; top agent icons also enriched.

```json
[
  {
    "map":         "Sunset",
    "displayIcon": "https://media.valorant-api.com/maps/.../displayicon.png",
    "splash":      "https://media.valorant-api.com/maps/.../splash.png",
    "winRate":     "62.8%",
    "wins":        "86",
    "losses":      "51",
    "kd":          "1.43",
    "adr":         "145.2",
    "acs":         "228.1",
    "topAgents": [
      {
        "agent":            "Omen",
        "winRate":          "65%",
        "role":             "Controller",
        "icon":             "https://media.valorant-api.com/...",
        "portrait":         "https://media.valorant-api.com/...",
        "killfeedPortrait": "https://media.valorant-api.com/..."
      }
    ]
  }
]
```

| Field                           | Type          | Description                                               |
|---------------------------------|---------------|-----------------------------------------------------------|
| `map`                           | string        | Map display name (e.g. `"Sunset"`, `"Ascent"`)           |
| `displayIcon`                   | string \| null | Small map icon URL from valorant-api.com                |
| `splash`                        | string \| null | Full-size map splash art URL from valorant-api.com      |
| `winRate`                       | string        | Win rate on this map (e.g. `"62.8%"`)                    |
| `wins`                          | string        | Total wins on this map                                    |
| `losses`                        | string        | Total losses on this map                                  |
| `kd`                            | string        | Kill/death ratio on this map                              |
| `adr`                           | string        | Average damage per round on this map                      |
| `acs`                           | string        | Average combat score on this map                          |
| `topAgents`                     | array         | Most-played agents on this map (typically 3)              |
| `topAgents[].agent`             | string        | Agent display name                                        |
| `topAgents[].winRate`           | string \| null | Win rate with this agent on this map                    |
| `topAgents[].role`              | string \| null | Agent role from valorant-api.com                        |
| `topAgents[].icon`              | string \| null | Agent icon URL from valorant-api.com                    |
| `topAgents[].portrait`          | string \| null | Full-body portrait URL from valorant-api.com            |
| `topAgents[].killfeedPortrait`  | string \| null | Killfeed portrait URL from valorant-api.com             |

---

## `totalPlaytime`

**Returns:** object

Total hours played across all modes for the given playlist. The playlist parameter affects which page is loaded but tracker.gg shows lifetime hours regardless.

```json
{
  "total": "1,243 hours"
}
```

| Field   | Type   | Description                                       |
|---------|--------|---------------------------------------------------|
| `total` | string | Lifetime playtime string (e.g. `"1,243 hours"`)   |

---

## Adding a new module

1. Add a row to the table above with the URL segment and selectors.
2. Add the module to `MODULE_DEFINITIONS` in `src/scraper.js`:
   - `page`: tracker.gg path segment (`'overview'`, `'agents'`, `'maps'`, `'performance'`).
   - `playlist: 'competitive'` for a fixed playlist, or omit for dynamic (caller-supplied).
   - `waitFor`: CSS selector to block on until data loads.
   - `extract`: JS string evaluated in-browser via `page.evaluate()` — `document` is available, must `return` a value.
3. The module is automatically accepted as a valid key in request bodies — no other changes needed.

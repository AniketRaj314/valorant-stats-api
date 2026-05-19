# Modules Reference

This file documents how snapshot refreshes map to tracker.gg pages.

The live API does not scrape on request. These modules are only used by the scheduled refresh job.

---

## Current Snapshot Layout

```json
{
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

---

## Refresh Runs

| Module | Page | Playlist | Stored Under | waitFor Selector |
|--------|------|----------|--------------|------------------|
| `rank` | `/overview` | `competitive` | `data.competitive.rank` | `.area-rating .rating-entry__rank-info .value` |
| `agents` | `/agents` | `competitive` | `data.competitive.agents` | `.st-content__item` |
| `maps` | `/maps` | `competitive` | `data.competitive.maps` | `.st-content__item` |
| `totalPlaytime` | `/performance` | `competitive` | `data.shared.totalPlaytime` | `.playtime-summary .value` |
| `agents` | `/agents` | `unrated` | `data.unrated.agents` | `.st-content__item` |
| `maps` | `/maps` | `unrated` | `data.unrated.maps` | `.st-content__item` |

`totalPlaytime` is treated as shared across playlists, so only one refresh run is used for it.

---

## Module Shapes

## `rank`

Always sourced from the competitive overview page.

```json
{
  "current": {
    "rank": "Gold 2",
    "icon": "https://media.valorant-api.com/..."
  },
  "peak": {
    "rank": "Platinum 1",
    "act": "Episode 8 Act 1",
    "icon": "https://media.valorant-api.com/..."
  }
}
```

## `agents`

Stored separately for `competitive` and `unrated`.

```json
[
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
]
```

## `maps`

Stored separately for `competitive` and `unrated`.

```json
[
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
```

## `totalPlaytime`

Stored once under `data.shared.totalPlaytime`.

```json
{
  "total": "1,243 hours"
}
```

---

## Adding Future Snapshot Fields

If you discover multiple useful stats on the same tracker.gg page, they can be extracted in a single Apify run. To add one:

1. Add or expand the relevant entry in `src/scraper.js`.
2. Decide where it should live in the snapshot shape.
3. Update `src/refreshSnapshot.js` to persist it.
4. Update `src/routes/valorant.js` if the field should be requestable through the API.

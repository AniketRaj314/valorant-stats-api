# Modules Reference

Each module maps to a tracker.gg page. `playlist` is either `competitive` (fixed) or
`dynamic` (uses the caller's `?playlist=` param).

| Module          | Page           | Playlist              | waitFor Selector                                   | Notes                                                                                                                                                   |
|-----------------|----------------|-----------------------|----------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| `rank`          | `/overview`    | `competitive` (fixed) | `.area-rating .rating-entry__rank-info .value`     | Rank only exists on competitive. Fields: `current.rank`, `current.icon`, `peak.rank`, `peak.act`, `peak.icon`. Icons from valorant-api.com.             |
| `agents`        | `/agents`      | dynamic               | `.st-content__item`                                | Array. Fields per entry: `agent`, `role`, `timePlayed`, `matches`, `winRate`, `kd`, `adr`, `acs`, `ddDelta`, `hsPercent`, `kast`, `icon`, `portrait`, `killfeedPortrait`. Enriched from valorant-api.com. |
| `maps`          | `/maps`        | dynamic               | `.st-content__item`                                | Array. Fields per entry: `map`, `displayIcon`, `splash`, `winRate`, `wins`, `losses`, `kd`, `adr`, `acs`, `topAgents[]`. Map assets from valorant-api.com; top agent objects include `agent`, `winRate`, `role`, `icon`, `portrait`, `killfeedPortrait`. |
| `totalPlaytime` | `/performance` | dynamic               | `.playtime-summary .value`                         | Object. Field: `total` (e.g. `"1,243 hours"`). Playlist param doesn't affect the data.                                                                  |

## Adding a new module

1. Add a row to this table with the URL and selectors.
2. Add the module to `MODULE_DEFINITIONS` in `src/scraper.js`:
   - `page`: the tracker.gg path segment (e.g. `'overview'`, `'agents'`, `'performance'`).
   - `playlist: 'competitive'` for a fixed page, or omit for dynamic (caller-supplied).
   - `waitFor`: CSS selector to block on.
   - `extract`: JS string evaluated in the browser.

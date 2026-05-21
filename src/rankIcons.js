const RANK_ICONS = {};
const { log } = require('./logger');

async function initRankIcons() {
  try {
    const res = await fetch('https://valorant-api.com/v1/competitivetiers');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = await res.json();
    const latest = data[data.length - 1];  // last = current episode
    for (const tier of latest.tiers) {
      if (tier.largeIcon) {
        RANK_ICONS[tier.tierName.toLowerCase()] = tier.largeIcon;
      }
    }
    log('STATIC', `Loaded icons for ${Object.keys(RANK_ICONS).length} ranks`);
  } catch (err) {
    log('WARN', `Failed to load rank icons — ${err.message}`);
  }
}

module.exports = { RANK_ICONS, initRankIcons };

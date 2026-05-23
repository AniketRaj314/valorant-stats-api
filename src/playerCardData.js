const PLAYER_CARD_DATA = {};
const { log } = require('./logger');

async function initPlayerCardData() {
  try {
    const res = await fetch('https://valorant-api.com/v1/playercards');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = await res.json();
    for (const card of data) {
      PLAYER_CARD_DATA[card.uuid] = {
        id: card.uuid,
        name: card.displayName,
        displayIcon: card.displayIcon,
        smallArt: card.smallArt,
        wideArt: card.wideArt,
        largeArt: card.largeArt,
      };
    }
    log('STATIC', `Loaded data for ${Object.keys(PLAYER_CARD_DATA).length} player cards`);
  } catch (err) {
    log('WARN', `Failed to load player card data — ${err.message}`);
  }
}

module.exports = { PLAYER_CARD_DATA, initPlayerCardData };

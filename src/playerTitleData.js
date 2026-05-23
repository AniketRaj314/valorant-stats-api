const PLAYER_TITLE_DATA = {};
const { log } = require('./logger');

async function initPlayerTitleData() {
  try {
    const res = await fetch('https://valorant-api.com/v1/playertitles');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = await res.json();
    for (const title of data) {
      PLAYER_TITLE_DATA[title.uuid] = {
        id: title.uuid,
        name: title.displayName,
        displayText: title.titleText,
      };
    }
    log('STATIC', `Loaded data for ${Object.keys(PLAYER_TITLE_DATA).length} player titles`);
  } catch (err) {
    log('WARN', `Failed to load player title data — ${err.message}`);
  }
}

module.exports = { PLAYER_TITLE_DATA, initPlayerTitleData };

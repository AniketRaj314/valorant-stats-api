const { PLAYER_CARD_DATA } = require('./playerCardData');
const { PLAYER_TITLE_DATA } = require('./playerTitleData');
const { log } = require('./logger');

function splitRiotId(username) {
  const hashIndex = username.lastIndexOf('#');
  if (hashIndex <= 0 || hashIndex === username.length - 1) {
    throw new Error(`Invalid Riot ID "${username}". Expected name#tag`);
  }
  return {
    name: username.slice(0, hashIndex),
    tag: username.slice(hashIndex + 1),
  };
}

function resolveCard(cardId) {
  if (!cardId) return null;
  return PLAYER_CARD_DATA[cardId] ?? {
    id: cardId,
    name: null,
    displayIcon: null,
    smallArt: null,
    wideArt: null,
    largeArt: null,
  };
}

function resolveTitle(titleId) {
  if (!titleId) return null;
  return PLAYER_TITLE_DATA[titleId] ?? {
    id: titleId,
    name: null,
    displayText: null,
  };
}

function buildProfile(account) {
  return {
    accountLevel: account.account_level ?? null,
    region: account.region ?? null,
    card: resolveCard(account.card),
    title: resolveTitle(account.title),
  };
}

async function fetchHenrikProfile(username, { apiKey = process.env.HENRIK_API_KEY } = {}) {
  if (!apiKey) {
    throw new Error('HENRIK_API_KEY is not set');
  }

  const { name, tag } = splitRiotId(username);
  const url = `https://api.henrikdev.xyz/valorant/v2/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  log('HENRIK', `Calling Henrik profile v2 for ${username}`);
  const startedAt = Date.now();
  const res = await fetch(url, { headers: { Authorization: apiKey } });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.errors?.[0]?.message || body?.error || `Henrik returned HTTP ${res.status}`;
    throw new Error(message);
  }

  log('HENRIK', `Profile v2 done for ${username} in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  return buildProfile(body.data);
}

module.exports = {
  buildProfile,
  fetchHenrikProfile,
  splitRiotId,
};

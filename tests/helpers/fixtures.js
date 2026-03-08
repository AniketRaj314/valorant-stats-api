'use strict';

const AGENT_ENTRY = Object.freeze({
  agent: 'Jett',
  role: 'Duelist',
  timePlayed: '10h 30m',
  matches: '50',
  winRate: '55%',
  kd: '1.5',
  adr: '150',
  acs: '250',
  ddDelta: '+10',
  hsPercent: '25%',
  kast: '70%',
  icon: 'https://media.valorant-api.com/agents/jett/displayicon.png',
  portrait: 'https://media.valorant-api.com/agents/jett/fullportrait.png',
  killfeedPortrait: 'https://media.valorant-api.com/agents/jett/killfeedportrait.png',
});

const MAP_ENTRY = Object.freeze({
  map: 'Ascent',
  winRate: '60%',
  wins: '30',
  losses: '20',
  kd: '1.4',
  adr: '145',
  acs: '240',
  displayIcon: 'https://media.valorant-api.com/maps/ascent/displayicon.png',
  splash: 'https://media.valorant-api.com/maps/ascent/splash.png',
  topAgents: [
    {
      agent: 'Jett',
      winRate: '65%',
      icon: 'https://media.valorant-api.com/agents/jett/displayicon.png',
      portrait: 'https://media.valorant-api.com/agents/jett/fullportrait.png',
      killfeedPortrait: 'https://media.valorant-api.com/agents/jett/killfeedportrait.png',
      role: 'Duelist',
    },
  ],
});

const RANK_DATA = Object.freeze({
  current: { rank: 'Gold 2', icon: null },
  peak: { rank: 'Platinum 1', act: 'Episode 8 Act 1', icon: null },
});

function freshCacheEntry(mod, data) {
  const cachedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h ago
  return { cachedAt, data: { [mod]: data } };
}

function staleCacheEntry(mod, data) {
  const cachedAt = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(); // 8h ago
  return { cachedAt, data: { [mod]: data } };
}

function apifyResponse(payload) {
  return [{ ...payload }];
}

module.exports = { AGENT_ENTRY, MAP_ENTRY, RANK_DATA, freshCacheEntry, staleCacheEntry, apifyResponse };

'use strict';

jest.mock('../src/logger');

const { PLAYER_CARD_DATA } = require('../src/playerCardData');
const { PLAYER_TITLE_DATA } = require('../src/playerTitleData');
const { RANK_ICONS } = require('../src/rankIcons');
const { buildProfile, buildRank, splitRiotId } = require('../src/henrikProfile');

describe('henrikProfile', () => {
  beforeEach(() => {
    for (const key of Object.keys(PLAYER_CARD_DATA)) delete PLAYER_CARD_DATA[key];
    for (const key of Object.keys(PLAYER_TITLE_DATA)) delete PLAYER_TITLE_DATA[key];
    for (const key of Object.keys(RANK_ICONS)) delete RANK_ICONS[key];
  });

  test('splits Riot ID using the last discriminator separator', () => {
    expect(splitRiotId('Spider31415#6921')).toEqual({ name: 'Spider31415', tag: '6921' });
  });

  test('rejects invalid Riot IDs', () => {
    expect(() => splitRiotId('Spider31415')).toThrow('Expected name#tag');
  });

  test('builds a compact profile and resolves card/title assets', () => {
    PLAYER_CARD_DATA['card-id'] = {
      id: 'card-id',
      name: 'VCT x SEN Card',
      displayIcon: 'card-display.png',
      smallArt: 'card-small.png',
      wideArt: 'card-wide.png',
      largeArt: 'card-large.png',
    };
    PLAYER_TITLE_DATA['title-id'] = {
      id: 'title-id',
      name: 'Gnarly Title',
      displayText: 'Gnarly',
    };

    expect(buildProfile({
      account_level: 514,
      region: 'ap',
      card: 'card-id',
      title: 'title-id',
    })).toEqual({
      accountLevel: 514,
      region: 'ap',
      card: {
        id: 'card-id',
        name: 'VCT x SEN Card',
        displayIcon: 'card-display.png',
        smallArt: 'card-small.png',
        wideArt: 'card-wide.png',
        largeArt: 'card-large.png',
      },
      title: {
        id: 'title-id',
        name: 'Gnarly Title',
        displayText: 'Gnarly',
      },
    });
  });

  test('builds existing rank response shape from Henrik MMR and resolves rank icons', () => {
    RANK_ICONS['platinum 2'] = 'plat2-icon.png';
    RANK_ICONS['platinum 3'] = 'plat3-icon.png';

    expect(buildRank({
      current: {
        tier: { id: 16, name: 'Platinum 2' },
        rr: 94,
      },
      peak: {
        tier: { id: 17, name: 'Platinum 3' },
        season: { short: 'e10a6' },
      },
    })).toEqual({
      current: {
        rank: 'Platinum 2',
        icon: 'plat2-icon.png',
      },
      peak: {
        rank: 'Platinum 3',
        act: 'e10a6',
        icon: 'plat3-icon.png',
      },
    });
  });
});

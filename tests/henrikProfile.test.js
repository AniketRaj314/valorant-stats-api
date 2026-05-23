'use strict';

jest.mock('../src/logger');

const { PLAYER_CARD_DATA } = require('../src/playerCardData');
const { PLAYER_TITLE_DATA } = require('../src/playerTitleData');
const { buildProfile, splitRiotId } = require('../src/henrikProfile');

describe('henrikProfile', () => {
  beforeEach(() => {
    for (const key of Object.keys(PLAYER_CARD_DATA)) delete PLAYER_CARD_DATA[key];
    for (const key of Object.keys(PLAYER_TITLE_DATA)) delete PLAYER_TITLE_DATA[key];
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
});

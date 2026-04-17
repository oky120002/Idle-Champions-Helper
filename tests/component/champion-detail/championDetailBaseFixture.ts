import type { ChampionDetail } from '../../../src/domain/types'

export const championDetailBaseFixture: Omit<
  ChampionDetail,
  'upgrades' | 'feats' | 'skins' | 'raw'
> = {
  updatedAt: '2026-04-13',
  summary: {
    id: '7',
    name: {
      original: 'Minsc',
      display: '明斯克',
    },
    seat: 7,
    roles: ['support', 'dps'],
    affiliations: [
      {
        original: "Heroes of Baldur's Gate",
        display: '博德之门英雄',
      },
    ],
    tags: ['human', 'support', 'event'],
    portrait: {
      path: 'v1/champion-portraits/7.png',
      sourceGraphic: 'Portraits/Portrait_Minsc',
      sourceVersion: 7,
    },
  },
  englishName: 'Minsc',
  eventName: null,
  dateAvailable: '2017-09-07 00:00:00',
  lastReworkDate: '2017-09-07 00:00:00',
  popularity: 0,
  baseCost: '2500000000',
  baseDamage: '10000000',
  baseHealth: '47',
  graphicId: '8',
  portraitGraphicId: '19',
  availability: {
    availableInNextEvent: false,
    availableInShop: true,
    availableInTimeGate: false,
    isAvailable: true,
    nextEventTimestamp: 0,
  },
  adventureIds: [],
  defaultFeatSlotUnlocks: [10, 30, 70, 120],
  costCurves: { 1: '0.96', 2: '1.12' },
  healthCurves: { 1: '1.01' },
  properties: {
    available_in_store: '2025-10-23 12:00:00',
    pain_sounds: [190, 191, 192],
    weekly_buff: 'buff_upgrades,200,108,109',
    notification_adjustment: {
      offset: [56, 204],
      scale: 1.25,
    },
  },
  characterSheet: {
    fullName: {
      original: 'Minsc',
      display: '明斯克',
    },
    class: {
      original: 'Ranger',
      display: '巡林客',
    },
    race: {
      original: 'Human',
      display: '人类',
    },
    age: 45,
    alignment: {
      original: 'Chaotic Good',
      display: '混乱善良',
    },
    abilityScores: {
      str: 18,
      dex: 12,
      con: 17,
      int: 10,
      wis: 10,
      cha: 10,
    },
    backstory: {
      original: 'Minsc is a dim-witted but courageous ranger.',
      display: '明斯克是一位有些迟钝但非常勇敢的巡林客。',
    },
  },
  attacks: {
    base: {
      id: '13',
      name: {
        original: 'Cleave',
        display: '顺势斩',
      },
      description: {
        original: 'Minsc cleaves all targets near the closest enemy.',
        display: '明斯克顺劈距离最近的敌人附近的所有目标。',
      },
      longDescription: null,
      cooldown: 4.5,
      numTargets: 1,
      aoeRadius: 25,
      damageModifier: '1',
      target: 'closest',
      damageTypes: ['melee'],
      tags: ['cleave'],
      graphicId: '101',
      animations: [],
    },
    ultimate: {
      id: '14',
      name: {
        original: 'Go for the Eyes!',
        display: '直取双眼！',
      },
      description: {
        original: 'Minsc and Boo attack together.',
        display: '明斯克和布布同时发动攻击。',
      },
      longDescription: {
        original: 'Boo leaps and causes additional damage.',
        display: '布布跃起并造成额外伤害。',
      },
      cooldown: 180,
      numTargets: 1,
      aoeRadius: 100,
      damageModifier: '5',
      target: 'front-most',
      damageTypes: ['ultimate'],
      tags: ['ultimate'],
      graphicId: '102',
      animations: [],
    },
    eventUpgrades: [
      {
        upgradeId: '2191',
        name: {
          original: 'Boastful',
          display: '直吹自擂',
        },
        description: null,
        graphicId: '5226',
      },
    ],
  },
}

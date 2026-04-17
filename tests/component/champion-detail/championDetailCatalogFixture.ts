import type { ChampionDetail } from '../../../src/domain/types'

export const championDetailCatalogFixture: Pick<ChampionDetail, 'upgrades' | 'feats' | 'skins' | 'raw'> = {
  upgrades: [
    {
      id: '108',
      requiredLevel: 50,
      requiredUpgradeId: null,
      name: {
        original: 'Favored Enemy: Humanoids',
        display: '偏好敌人：类人生物',
      },
      upgradeType: 'unlock_ability',
      effectReference: 'effect_def,1326',
      effectDefinition: {
        id: '1326',
        snapshots: {
          original: {
            description: {
              desc: "Humanoid enemies become Minsc's favored enemy.",
            },
          },
          display: {
            description: {
              desc: '类人生物敌人成为明斯克的偏好对手。',
            },
          },
        },
      },
      staticDpsMult: '1.25',
      defaultEnabled: true,
      specializationName: null,
      specializationDescription: null,
      specializationGraphicId: null,
      tipText: null,
    },
    {
      id: '109',
      requiredLevel: 50,
      requiredUpgradeId: null,
      name: {
        original: 'Favored Enemy: Beasts',
        display: '偏好敌人：兽类',
      },
      upgradeType: 'unlock_ability',
      effectReference: 'effect_def,1327',
      effectDefinition: null,
      staticDpsMult: '1.25',
      defaultEnabled: true,
      specializationName: null,
      specializationDescription: null,
      specializationGraphicId: null,
      tipText: null,
    },
    {
      id: '117',
      requiredLevel: 125,
      requiredUpgradeId: null,
      name: null,
      upgradeType: 'upgrade_ability',
      effectReference:
        '{"effect_string":"buff_upgrades,200,108,109","description":"Increases the effect of Minsc\'s Favored Enemy ability by $(amount)%."}',
      effectDefinition: null,
      staticDpsMult: null,
      defaultEnabled: true,
      specializationName: null,
      specializationDescription: null,
      specializationGraphicId: null,
      tipText: null,
    },
    {
      id: '107',
      requiredLevel: 20,
      requiredUpgradeId: null,
      name: null,
      upgradeType: null,
      effectReference: 'hero_dps_multiplier_mult,100',
      effectDefinition: null,
      staticDpsMult: '100',
      defaultEnabled: true,
      specializationName: null,
      specializationDescription: null,
      specializationGraphicId: null,
      tipText: null,
    },
    {
      id: '118',
      requiredLevel: 160,
      requiredUpgradeId: null,
      name: null,
      upgradeType: null,
      effectReference: 'gold_multiplier_mult,100',
      effectDefinition: null,
      staticDpsMult: null,
      defaultEnabled: true,
      specializationName: null,
      specializationDescription: null,
      specializationGraphicId: null,
      tipText: null,
    },
    {
      id: '119',
      requiredLevel: 200,
      requiredUpgradeId: null,
      name: null,
      upgradeType: null,
      effectReference: 'global_dps_multiplier_mult,200',
      effectDefinition: null,
      staticDpsMult: null,
      defaultEnabled: true,
      specializationName: null,
      specializationDescription: null,
      specializationGraphicId: null,
      tipText: null,
    },
  ],
  feats: [
    {
      id: '35',
      order: 1,
      name: {
        original: 'Tavern Brawler',
        display: '旅店打手',
      },
      description: {
        original: "What's that, Boo?",
        display: '布布，那是什么东西？',
      },
      rarity: '2',
      graphicId: '6078',
      effects: [{ effect_string: 'hero_dps_multiplier_mult,30' }],
      sources: [{ source: 'default' }],
      properties: { is_available: true },
      collectionsSource: { type: 'free' },
    },
  ],
  skins: [
    {
      id: '4',
      name: {
        original: 'Giant Boo Costume',
        display: '巨型布布服装',
      },
      cost: [],
      details: { portrait_graphic_id: 4473 },
      rarity: '3',
      properties: { is_available: true },
      collectionsSource: { type: 'flash_sale' },
      availabilities: { in_flash_sales: true },
    },
    {
      id: '5',
      name: {
        original: 'Space Boo Expedition',
        display: '太空布布远征装',
      },
      cost: {
        soft_currency: 40000,
      },
      details: {
        large_graphic_id: 4475,
        portrait_graphic_id: 4474,
      },
      rarity: '4',
      properties: { is_available: true },
      collectionsSource: { type: 'wild_offer' },
      availabilities: { in_wild_offers: true },
    },
  ],
  raw: {
    hero: {
      original: { id: 7, seat_id: 7 },
      display: { id: 7, seat_id: 7 },
    },
    attacks: [
      {
        id: '13',
        snapshots: {
          original: { id: 13 },
          display: { id: 13 },
        },
      },
    ],
    upgrades: [
      {
        id: '108',
        snapshots: {
          original: { id: 108 },
          display: { id: 108 },
        },
      },
    ],
    feats: [
      {
        id: '35',
        snapshots: {
          original: { id: 35 },
          display: { id: 35 },
        },
      },
    ],
    skins: [
      {
        id: '4',
        snapshots: {
          original: { id: 4 },
          display: { id: 4 },
        },
      },
      {
        id: '5',
        snapshots: {
          original: { id: 5 },
          display: { id: 5 },
        },
      },
    ],
  },
}

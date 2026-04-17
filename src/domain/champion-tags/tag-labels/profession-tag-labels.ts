import type { AppLocale } from '../../../app/i18n'

export const PROFESSION_TAG_LABELS = {
  artificer: {
    'zh-CN': '奇械师',
    'en-US': 'Artificer',
  },
  barbarian: {
    'zh-CN': '野蛮人',
    'en-US': 'Barbarian',
  },
  bard: {
    'zh-CN': '吟游诗人',
    'en-US': 'Bard',
  },
  cleric: {
    'zh-CN': '牧师',
    'en-US': 'Cleric',
  },
  druid: {
    'zh-CN': '德鲁伊',
    'en-US': 'Druid',
  },
  fighter: {
    'zh-CN': '战士',
    'en-US': 'Fighter',
  },
  hunter: {
    'zh-CN': '猎手',
    'en-US': 'Hunter',
  },
  monk: {
    'zh-CN': '武僧',
    'en-US': 'Monk',
  },
  paladin: {
    'zh-CN': '圣武士',
    'en-US': 'Paladin',
  },
  ranger: {
    'zh-CN': '游侠',
    'en-US': 'Ranger',
  },
  rogue: {
    'zh-CN': '盗贼',
    'en-US': 'Rogue',
  },
  samurai: {
    'zh-CN': '武士',
    'en-US': 'Samurai',
  },
  sorcerer: {
    'zh-CN': '术士',
    'en-US': 'Sorcerer',
  },
  warlock: {
    'zh-CN': '邪术师',
    'en-US': 'Warlock',
  },
  wizard: {
    'zh-CN': '法师',
    'en-US': 'Wizard',
  },
} satisfies Record<string, Record<AppLocale, string>>

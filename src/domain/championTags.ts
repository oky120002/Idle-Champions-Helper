import type { AppLocale } from '../app/i18n'

const ROLE_TAGS = new Set([
  'breaking',
  'control',
  'debuff',
  'dps',
  'gold',
  'healing',
  'speed',
  'support',
  'tank',
  'tanking',
])

const RACE_TAGS = new Set([
  'aasimar',
  'aarakocra',
  'bullywug',
  'centaur',
  'companion',
  'dragonborn',
  'drow',
  'dwarf',
  'eladrin',
  'elf',
  'genasi',
  'gith',
  'gnome',
  'halfling',
  'half-elf',
  'half-orc',
  'human',
  'kobold',
  'lizardfolk',
  'lycanthrope',
  'tabaxi',
  'tiefling',
  'tortle',
  'undead',
  'warforged',
  'yuan-ti',
])

const GENDER_TAGS = new Set(['male', 'female'])
const ALIGNMENT_TAGS = new Set(['chaotic', 'evil', 'geneutral', 'good', 'lawful', 'lcneutral', 'neutral'])
const PROFESSION_TAGS = new Set([
  'artificer',
  'barbarian',
  'bard',
  'cleric',
  'druid',
  'fighter',
  'hunter',
  'monk',
  'paladin',
  'ranger',
  'rogue',
  'samurai',
  'sorcerer',
  'warlock',
  'wizard',
])
const ACQUISITION_TAGS = new Set(['cneoriginal', 'core', 'event', 'evergreen', 'starter', 'tales'])

const TAG_LABELS: Record<string, { 'zh-CN': string; 'en-US': string }> = {
  aarakocra: {
    'zh-CN': '阿拉寇克拉',
    'en-US': 'Aarakocra',
  },
  aasimar: {
    'zh-CN': '亚斯玛',
    'en-US': 'Aasimar',
  },
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
  bullywug: {
    'zh-CN': '蛙人',
    'en-US': 'Bullywug',
  },
  centaur: {
    'zh-CN': '半人马',
    'en-US': 'Centaur',
  },
  cleric: {
    'zh-CN': '牧师',
    'en-US': 'Cleric',
  },
  cneoriginal: {
    'zh-CN': 'CNE 原创',
    'en-US': 'CNE Original',
  },
  chaotic: {
    'zh-CN': '混乱',
    'en-US': 'Chaotic',
  },
  companion: {
    'zh-CN': '伙伴',
    'en-US': 'Companion',
  },
  control_fumble: {
    'zh-CN': '失手控制',
    'en-US': 'Fumble Control',
  },
  control_knockback: {
    'zh-CN': '击退控制',
    'en-US': 'Knockback Control',
  },
  control_pacify: {
    'zh-CN': '安抚控制',
    'en-US': 'Pacify Control',
  },
  control_reposition: {
    'zh-CN': '位移控制',
    'en-US': 'Reposition Control',
  },
  control_root: {
    'zh-CN': '定身控制',
    'en-US': 'Root Control',
  },
  control_slow: {
    'zh-CN': '减速控制',
    'en-US': 'Slow Control',
  },
  control_stun: {
    'zh-CN': '眩晕控制',
    'en-US': 'Stun Control',
  },
  control_weaken: {
    'zh-CN': '弱化控制',
    'en-US': 'Weaken Control',
  },
  core: {
    'zh-CN': '核心英雄',
    'en-US': 'Core Champion',
  },
  dragonborn: {
    'zh-CN': '龙裔',
    'en-US': 'Dragonborn',
  },
  druid: {
    'zh-CN': '德鲁伊',
    'en-US': 'Druid',
  },
  drow: {
    'zh-CN': '卓尔精灵',
    'en-US': 'Drow',
  },
  dwarf: {
    'zh-CN': '矮人',
    'en-US': 'Dwarf',
  },
  eladrin: {
    'zh-CN': '艾拉卓精灵',
    'en-US': 'Eladrin',
  },
  elf: {
    'zh-CN': '精灵',
    'en-US': 'Elf',
  },
  event: {
    'zh-CN': '活动英雄',
    'en-US': 'Event Champion',
  },
  evergreen: {
    'zh-CN': '常驻英雄',
    'en-US': 'Evergreen Champion',
  },
  evil: {
    'zh-CN': '邪恶',
    'en-US': 'Evil',
  },
  female: {
    'zh-CN': '女性',
    'en-US': 'Female',
  },
  fighter: {
    'zh-CN': '战士',
    'en-US': 'Fighter',
  },
  genasi: {
    'zh-CN': '元素裔',
    'en-US': 'Genasi',
  },
  geneutral: {
    'zh-CN': '善恶中立',
    'en-US': 'Neutral (Good/Evil)',
  },
  gith: {
    'zh-CN': '吉斯',
    'en-US': 'Gith',
  },
  gnome: {
    'zh-CN': '侏儒',
    'en-US': 'Gnome',
  },
  good: {
    'zh-CN': '善良',
    'en-US': 'Good',
  },
  halfling: {
    'zh-CN': '半身人',
    'en-US': 'Halfling',
  },
  'half-elf': {
    'zh-CN': '半精灵',
    'en-US': 'Half-Elf',
  },
  'half-orc': {
    'zh-CN': '半兽人',
    'en-US': 'Half-Orc',
  },
  hunter: {
    'zh-CN': '猎手',
    'en-US': 'Hunter',
  },
  human: {
    'zh-CN': '人类',
    'en-US': 'Human',
  },
  kobold: {
    'zh-CN': '狗头人',
    'en-US': 'Kobold',
  },
  lawful: {
    'zh-CN': '守序',
    'en-US': 'Lawful',
  },
  lcneutral: {
    'zh-CN': '秩序中立',
    'en-US': 'Neutral (Law/Chaos)',
  },
  male: {
    'zh-CN': '男性',
    'en-US': 'Male',
  },
  monk: {
    'zh-CN': '武僧',
    'en-US': 'Monk',
  },
  neutral: {
    'zh-CN': '中立',
    'en-US': 'Neutral',
  },
  lizardfolk: {
    'zh-CN': '蜥蜴人',
    'en-US': 'Lizardfolk',
  },
  lycanthrope: {
    'zh-CN': '狼人',
    'en-US': 'Lycanthrope',
  },
  paladin: {
    'zh-CN': '圣武士',
    'en-US': 'Paladin',
  },
  positional: {
    'zh-CN': '站位联动',
    'en-US': 'Positional',
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
  spec_breaking: {
    'zh-CN': '破坏专精',
    'en-US': 'Breaking Spec',
  },
  spec_control: {
    'zh-CN': '专精控制',
    'en-US': 'Spec Control',
  },
  spec_control_fumble: {
    'zh-CN': '失手控制专精',
    'en-US': 'Fumble Control Spec',
  },
  spec_control_knockback: {
    'zh-CN': '击退控制专精',
    'en-US': 'Knockback Control Spec',
  },
  spec_control_slow: {
    'zh-CN': '减速控制专精',
    'en-US': 'Slow Control Spec',
  },
  spec_control_stun: {
    'zh-CN': '眩晕控制专精',
    'en-US': 'Stun Control Spec',
  },
  spec_debuff: {
    'zh-CN': '减益专精',
    'en-US': 'Debuff Spec',
  },
  spec_gold: {
    'zh-CN': '金币专精',
    'en-US': 'Gold Spec',
  },
  spec_hunter: {
    'zh-CN': '猎杀专精',
    'en-US': 'Hunter Spec',
  },
  spec_hunter_abberation: {
    'zh-CN': '异怪猎杀',
    'en-US': 'Aberration Hunter',
  },
  spec_hunter_beast: {
    'zh-CN': '野兽猎杀',
    'en-US': 'Beast Hunter',
  },
  spec_hunter_dragon: {
    'zh-CN': '龙类猎杀',
    'en-US': 'Dragon Hunter',
  },
  spec_hunter_fey: {
    'zh-CN': '精类猎杀',
    'en-US': 'Fey Hunter',
  },
  spec_hunter_fiend: {
    'zh-CN': '邪魔猎杀',
    'en-US': 'Fiend Hunter',
  },
  spec_hunter_fiends: {
    'zh-CN': '邪魔猎杀',
    'en-US': 'Fiends Hunter',
  },
  spec_hunter_giant: {
    'zh-CN': '巨人猎杀',
    'en-US': 'Giant Hunter',
  },
  spec_hunter_humanoid: {
    'zh-CN': '类人生物猎杀',
    'en-US': 'Humanoid Hunter',
  },
  spec_hunter_monstrosity: {
    'zh-CN': '怪异猎杀',
    'en-US': 'Monstrosity Hunter',
  },
  spec_hunter_undead: {
    'zh-CN': '亡灵猎杀',
    'en-US': 'Undead Hunter',
  },
  spec_speed: {
    'zh-CN': '速度专精',
    'en-US': 'Speed Spec',
  },
  starter: {
    'zh-CN': '起始英雄',
    'en-US': 'Starter Champion',
  },
  tabaxi: {
    'zh-CN': '塔巴西',
    'en-US': 'Tabaxi',
  },
  tales: {
    'zh-CN': '传说堂',
    'en-US': 'Tales',
  },
  tiefling: {
    'zh-CN': '提夫林',
    'en-US': 'Tiefling',
  },
  tortle: {
    'zh-CN': '龟人',
    'en-US': 'Tortle',
  },
  unaffiliated: {
    'zh-CN': '无联动队伍',
    'en-US': 'Unaffiliated',
  },
  undead: {
    'zh-CN': '亡灵',
    'en-US': 'Undead',
  },
  warforged: {
    'zh-CN': '战铸者',
    'en-US': 'Warforged',
  },
  warlock: {
    'zh-CN': '邪术师',
    'en-US': 'Warlock',
  },
  wizard: {
    'zh-CN': '法师',
    'en-US': 'Wizard',
  },
  'yuan-ti': {
    'zh-CN': '蛇人',
    'en-US': 'Yuan-Ti',
  },
}

const ATTRIBUTE_GROUP_LABELS: Record<ChampionAttributeGroupId, { 'zh-CN': string; 'en-US': string }> = {
  alignment: {
    'zh-CN': '阵营',
    'en-US': 'Alignment',
  },
  acquisition: {
    'zh-CN': '获取方式',
    'en-US': 'Availability',
  },
  gender: {
    'zh-CN': '性别',
    'en-US': 'Gender',
  },
  mechanics: {
    'zh-CN': '机制',
    'en-US': 'Mechanics',
  },
  other: {
    'zh-CN': '其他',
    'en-US': 'Other',
  },
  profession: {
    'zh-CN': '职业',
    'en-US': 'Profession',
  },
  race: {
    'zh-CN': '种族',
    'en-US': 'Race',
  },
}

export type ChampionAttributeGroupId =
  | 'race'
  | 'gender'
  | 'alignment'
  | 'profession'
  | 'acquisition'
  | 'mechanics'
  | 'other'

export interface ChampionAttributeGroup {
  id: ChampionAttributeGroupId
  tags: string[]
}

const ATTRIBUTE_GROUP_MATCHERS: Record<
  Exclude<ChampionAttributeGroupId, 'other'>,
  (tag: string) => boolean
> = {
  race: (tag) => RACE_TAGS.has(tag),
  gender: (tag) => GENDER_TAGS.has(tag),
  alignment: (tag) => ALIGNMENT_TAGS.has(tag),
  profession: (tag) => PROFESSION_TAGS.has(tag),
  acquisition: isAcquisitionTag,
  mechanics: isMechanicTag,
}

function toTitleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function getChampionAttributeTags(tags: string[]): string[] {
  return tags.filter((tag) => !ROLE_TAGS.has(tag))
}

function isAcquisitionTag(tag: string): boolean {
  return ACQUISITION_TAGS.has(tag) || /^y\d+$/i.test(tag)
}

function isMechanicTag(tag: string): boolean {
  return tag === 'positional' || tag.startsWith('control_') || tag.startsWith('spec_')
}

export function getChampionTagsForGroup(
  tags: string[],
  groupId: ChampionAttributeGroupId,
): string[] {
  const attributeTags = getChampionAttributeTags(tags)

  if (groupId === 'other') {
    const usedTags = new Set(
      Object.entries(ATTRIBUTE_GROUP_MATCHERS).flatMap(([id]) =>
        attributeTags.filter((tag) =>
          ATTRIBUTE_GROUP_MATCHERS[id as Exclude<ChampionAttributeGroupId, 'other'>](tag),
        ),
      ),
    )

    return attributeTags.filter((tag) => !usedTags.has(tag))
  }

  return attributeTags.filter((tag) => ATTRIBUTE_GROUP_MATCHERS[groupId](tag))
}

export function getChampionAttributeGroups(tags: string[]): ChampionAttributeGroup[] {
  const groups: ChampionAttributeGroup[] = (
    Object.keys(ATTRIBUTE_GROUP_MATCHERS) as Array<Exclude<ChampionAttributeGroupId, 'other'>>
  )
    .map((groupId) => ({
      id: groupId,
      tags: getChampionTagsForGroup(tags, groupId),
    }))
    .filter((group) => group.tags.length > 0)

  const otherTags = getChampionTagsForGroup(tags, 'other')

  if (otherTags.length > 0) {
    groups.push({
      id: 'other',
      tags: otherTags,
    })
  }

  return groups
}

export function getChampionAttributeGroupLabel(groupId: ChampionAttributeGroupId, locale: AppLocale): string {
  return ATTRIBUTE_GROUP_LABELS[groupId][locale]
}

export function getChampionTagLabel(tag: string, locale: AppLocale): string {
  const mapped = TAG_LABELS[tag]

  if (mapped) {
    return mapped[locale]
  }

  if (/^y\d+$/i.test(tag)) {
    const year = tag.slice(1)
    return locale === 'zh-CN' ? `第 ${year} 年活动` : `Year ${year}`
  }

  return locale === 'zh-CN' ? tag.replaceAll('_', ' ') : toTitleCase(tag)
}

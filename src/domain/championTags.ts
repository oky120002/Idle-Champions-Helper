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

const TAG_LABELS: Record<string, { 'zh-CN': string; 'en-US': string }> = {
  cneoriginal: {
    'zh-CN': 'CNE 原创',
    'en-US': 'CNE Original',
  },
  chaotic: {
    'zh-CN': '混乱',
    'en-US': 'Chaotic',
  },
  control_knockback: {
    'zh-CN': '击退控制',
    'en-US': 'Knockback Control',
  },
  control_slow: {
    'zh-CN': '减速控制',
    'en-US': 'Slow Control',
  },
  control_stun: {
    'zh-CN': '眩晕控制',
    'en-US': 'Stun Control',
  },
  core: {
    'zh-CN': '核心英雄',
    'en-US': 'Core Champion',
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
  geneutral: {
    'zh-CN': '善恶中立',
    'en-US': 'Neutral (Good/Evil)',
  },
  good: {
    'zh-CN': '善良',
    'en-US': 'Good',
  },
  'half-elf': {
    'zh-CN': '半精灵',
    'en-US': 'Half-Elf',
  },
  human: {
    'zh-CN': '人类',
    'en-US': 'Human',
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
  neutral: {
    'zh-CN': '中立',
    'en-US': 'Neutral',
  },
  positional: {
    'zh-CN': '站位联动',
    'en-US': 'Positional',
  },
  spec_control: {
    'zh-CN': '专精控制',
    'en-US': 'Spec Control',
  },
  tales: {
    'zh-CN': '传说堂',
    'en-US': 'Tales',
  },
  unaffiliated: {
    'zh-CN': '无联动队伍',
    'en-US': 'Unaffiliated',
  },
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

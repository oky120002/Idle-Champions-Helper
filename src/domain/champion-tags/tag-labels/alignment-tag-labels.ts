import type { AppLocale } from '../../../app/i18n'

export const ALIGNMENT_TAG_LABELS = {
  chaotic: {
    'zh-CN': '混乱',
    'en-US': 'Chaotic',
  },
  evil: {
    'zh-CN': '邪恶',
    'en-US': 'Evil',
  },
  geneutral: {
    'zh-CN': '善恶中立',
    'en-US': 'Neutral (Good/Evil)',
  },
  good: {
    'zh-CN': '善良',
    'en-US': 'Good',
  },
  lawful: {
    'zh-CN': '守序',
    'en-US': 'Lawful',
  },
  lcneutral: {
    'zh-CN': '秩序中立',
    'en-US': 'Neutral (Law/Chaos)',
  },
  neutral: {
    'zh-CN': '中立',
    'en-US': 'Neutral',
  },
} satisfies Record<string, Record<AppLocale, string>>

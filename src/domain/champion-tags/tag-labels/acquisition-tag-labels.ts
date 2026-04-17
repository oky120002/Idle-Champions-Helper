import type { AppLocale } from '../../../app/i18n'

export const ACQUISITION_TAG_LABELS = {
  cneoriginal: {
    'zh-CN': 'CNE 原创',
    'en-US': 'CNE Original',
  },
  core: {
    'zh-CN': '核心英雄',
    'en-US': 'Core Champion',
  },
  event: {
    'zh-CN': '活动英雄',
    'en-US': 'Event Champion',
  },
  evergreen: {
    'zh-CN': '常驻英雄',
    'en-US': 'Evergreen Champion',
  },
  starter: {
    'zh-CN': '起始英雄',
    'en-US': 'Starter Champion',
  },
  tales: {
    'zh-CN': '传说堂',
    'en-US': 'Tales',
  },
} satisfies Record<string, Record<AppLocale, string>>

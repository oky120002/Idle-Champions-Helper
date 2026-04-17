import type { AppLocale } from '../../../app/i18n'

export const GENDER_TAG_LABELS = {
  female: {
    'zh-CN': '女性',
    'en-US': 'Female',
  },
  male: {
    'zh-CN': '男性',
    'en-US': 'Male',
  },
} satisfies Record<string, Record<AppLocale, string>>

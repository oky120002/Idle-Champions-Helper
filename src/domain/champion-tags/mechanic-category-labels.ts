import type { AppLocale } from '../../app/i18n'
import type { ChampionMechanicCategoryId } from './types'

export const MECHANIC_CATEGORY_LABELS: Record<ChampionMechanicCategoryId, Record<AppLocale, string>> = {
  positional: {
    'zh-CN': '站位相关',
    'en-US': 'Positioning',
  },
  control: {
    'zh-CN': '控制效果',
    'en-US': 'Control effects',
  },
  specialization: {
    'zh-CN': '专精方向',
    'en-US': 'Specializations',
  },
}

import type { AppLocale } from '../../app/i18n'
import type { ChampionAttributeGroupId } from './types'

export const ATTRIBUTE_GROUP_LABELS: Record<ChampionAttributeGroupId, Record<AppLocale, string>> = {
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
    'zh-CN': '特殊机制',
    'en-US': 'Special mechanics',
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

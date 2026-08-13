import type { LocaleText, TranslateParams  } from '../../app/i18n'
import type { AnimationAuditKindFilter, AnimationAuditLevelFilter } from './types'

type Translate = (text: string | LocaleText, params?: TranslateParams) => string

export const LEVEL_FILTERS: AnimationAuditLevelFilter[] = ['flagged', 'high', 'medium', 'low', 'none', 'all']
export const KIND_FILTERS: AnimationAuditKindFilter[] = ['all', 'hero-base', 'skin']

export function buildLevelLabel(filter: AnimationAuditLevelFilter, t: Translate) {
  switch (filter) {
    case 'all':
      return t("全部")
    case 'flagged':
      return t("只看疑似项")
    case 'high':
      return t("高疑似")
    case 'medium':
      return t("中疑似")
    case 'low':
      return t("低疑似")
    case 'none':
      return t("暂不复核")
  }
}

export function buildKindLabel(filter: AnimationAuditKindFilter, t: Translate) {
  switch (filter) {
    case 'all':
      return t("全部类型")
    case 'hero-base':
      return t("英雄本体")
    case 'skin':
      return t("皮肤")
  }
}

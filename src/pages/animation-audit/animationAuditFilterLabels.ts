import type { AnimationAuditKindFilter, AnimationAuditLevelFilter } from './types'

type Translate = (text: { zh: string; en: string }) => string

export const LEVEL_FILTERS: AnimationAuditLevelFilter[] = ['flagged', 'high', 'medium', 'low', 'none', 'all']
export const KIND_FILTERS: AnimationAuditKindFilter[] = ['all', 'hero-base', 'skin']

export function buildLevelLabel(filter: AnimationAuditLevelFilter, t: Translate) {
  switch (filter) {
    case 'all':
      return t({ zh: '全部', en: 'All' })
    case 'flagged':
      return t({ zh: '只看疑似项', en: 'Flagged only' })
    case 'high':
      return t({ zh: '高疑似', en: 'High' })
    case 'medium':
      return t({ zh: '中疑似', en: 'Medium' })
    case 'low':
      return t({ zh: '低疑似', en: 'Low' })
    case 'none':
      return t({ zh: '暂不复核', en: 'Keep' })
  }
}

export function buildKindLabel(filter: AnimationAuditKindFilter, t: Translate) {
  switch (filter) {
    case 'all':
      return t({ zh: '全部类型', en: 'All kinds' })
    case 'hero-base':
      return t({ zh: '英雄本体', en: 'Hero base' })
    case 'skin':
      return t({ zh: '皮肤', en: 'Skin' })
  }
}

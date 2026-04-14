import type { AppLocale } from '../app/i18n'
import { getLocalizedTextPair, getPrimaryLocalizedText } from './localizedText'
import type { FormationLayout } from './types'

const FORMATION_BOARD_BASE_COLUMNS = 5
const FORMATION_BOARD_BASE_WIDTH_PX = 640
const FORMATION_BOARD_BASE_MIN_WIDTH_PX = 520

export interface FormationBoardMetrics {
  columnCount: number
  minWidthPx: number
  widthPx: number
}

function buildCountLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

export function getFormationLayoutLabel(layout: FormationLayout, locale: AppLocale): string {
  return getPrimaryLocalizedText(layout.name, locale)
}

export function getFormationBoardMetrics(layout: FormationLayout): FormationBoardMetrics {
  const columnCount = Math.max(
    FORMATION_BOARD_BASE_COLUMNS,
    layout.slots.reduce((max, slot) => Math.max(max, slot.column), 0),
  )

  return {
    columnCount,
    widthPx: Math.round((FORMATION_BOARD_BASE_WIDTH_PX / FORMATION_BOARD_BASE_COLUMNS) * columnCount),
    minWidthPx: Math.round((FORMATION_BOARD_BASE_MIN_WIDTH_PX / FORMATION_BOARD_BASE_COLUMNS) * columnCount),
  }
}

export function getFormationLayoutContextSummary(
  layout: FormationLayout,
  locale: AppLocale,
): string | null {
  const sourceContexts = layout.sourceContexts ?? []

  if (sourceContexts.length === 0) {
    return layout.notes ? getPrimaryLocalizedText(layout.notes, locale) : null
  }

  const primaryContext = sourceContexts[0]
  const counts = sourceContexts.reduce(
    (result, context) => {
      result[context.kind] = (result[context.kind] ?? 0) + 1
      return result
    },
    { campaign: 0, adventure: 0, variant: 0, trial: 0, timeGate: 0 } as Record<string, number>,
  )

  const countParts =
    locale === 'zh-CN'
      ? [
          counts.campaign > 0 ? `${counts.campaign} 个战役` : null,
          counts.adventure > 0 ? `${counts.adventure} 个冒险` : null,
          counts.variant > 0 ? `${counts.variant} 个变体` : null,
        ].filter(Boolean)
      : [
          counts.campaign > 0
            ? `${counts.campaign} ${buildCountLabel(counts.campaign, 'campaign', 'campaigns')}`
            : null,
          counts.adventure > 0
            ? `${counts.adventure} ${buildCountLabel(counts.adventure, 'adventure', 'adventures')}`
            : null,
          counts.variant > 0
            ? `${counts.variant} ${buildCountLabel(counts.variant, 'variant', 'variants')}`
            : null,
        ].filter(Boolean)

  const extraNames = sourceContexts
    .slice(1, 4)
    .map((context) => getLocalizedTextPair(context.name, locale))

  if (locale === 'zh-CN') {
    const extraPart =
      extraNames.length > 0
        ? ` 其他关联：${extraNames.join('、')}${sourceContexts.length > 4 ? ' 等。' : '。'}`
        : ''

    return `默认来源：${getLocalizedTextPair(primaryContext.name, locale)}。当前关联 ${countParts.join(' / ')}。${extraPart}`.trim()
  }

  const extraPart =
    extraNames.length > 0
      ? ` Other linked contexts: ${extraNames.join(', ')}${sourceContexts.length > 4 ? ', and more.' : '.'}`
      : ''

  return `Primary source: ${getLocalizedTextPair(primaryContext.name, locale)}. Linked to ${countParts.join(' / ')}.${extraPart}`.trim()
}

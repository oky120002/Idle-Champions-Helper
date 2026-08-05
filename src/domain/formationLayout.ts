import type { AppLocale } from '../app/i18n'
import { getLocalizedTextPair, getPrimaryLocalizedText } from './localizedText'
import type { FormationContext, FormationLayout } from './types'

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

type ContextKindCounts = Record<FormationContext['kind'], number>

function buildContextKindCounts(contexts: readonly FormationContext[]): ContextKindCounts {
  return contexts.reduce(
    (result: ContextKindCounts, context) => {
      result[context.kind] += 1
      return result
    },
    { campaign: 0, adventure: 0, variant: 0, trial: 0, timeGate: 0 },
  )
}

function buildCountParts(counts: ContextKindCounts, locale: AppLocale): string[] {
  if (locale === 'zh-CN') {
    return [
      counts.campaign > 0 ? `${String(counts.campaign)} 个战役` : null,
      counts.adventure > 0 ? `${String(counts.adventure)} 个冒险` : null,
      counts.variant > 0 ? `${String(counts.variant)} 个变体` : null,
    ].filter((part): part is string => part !== null)
  }
  return [
    counts.campaign > 0
      ? `${String(counts.campaign)} ${buildCountLabel(counts.campaign, 'campaign', 'campaigns')}`
      : null,
    counts.adventure > 0
      ? `${String(counts.adventure)} ${buildCountLabel(counts.adventure, 'adventure', 'adventures')}`
      : null,
    counts.variant > 0
      ? `${String(counts.variant)} ${buildCountLabel(counts.variant, 'variant', 'variants')}`
      : null,
  ].filter((part): part is string => part !== null)
}

function formatZhContextSummary(
  primaryContext: FormationContext,
  countParts: string[],
  extraNames: string[],
  sourceCount: number,
  locale: AppLocale,
): string {
  const moreSuffix = sourceCount > 4 ? ' 等。' : '。'
  const extraPart =
    extraNames.length > 0 ? ` 其他关联：${extraNames.join('、')}${moreSuffix}` : ''
  return `默认来源：${getLocalizedTextPair(primaryContext.name, locale)}。当前关联 ${countParts.join(' / ')}。${extraPart}`.trim()
}

function formatEnContextSummary(
  primaryContext: FormationContext,
  countParts: string[],
  extraNames: string[],
  sourceCount: number,
  locale: AppLocale,
): string {
  const moreSuffix = sourceCount > 4 ? ', and more.' : '.'
  const extraPart =
    extraNames.length > 0 ? ` Other linked contexts: ${extraNames.join(', ')}${moreSuffix}` : ''
  return `Primary source: ${getLocalizedTextPair(primaryContext.name, locale)}. Linked to ${countParts.join(' / ')}.${extraPart}`.trim()
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
  if (!primaryContext) {
    return layout.notes ? getPrimaryLocalizedText(layout.notes, locale) : null
  }

  const counts = buildContextKindCounts(sourceContexts)
  const countParts = buildCountParts(counts, locale)
  const extraNames = sourceContexts
    .slice(1, 4)
    .map((context) => getLocalizedTextPair(context.name, locale))

  return locale === 'zh-CN'
    ? formatZhContextSummary(primaryContext, countParts, extraNames, sourceContexts.length, locale)
    : formatEnContextSummary(primaryContext, countParts, extraNames, sourceContexts.length, locale)
}

import type { AppLocale } from '../../app/i18n'
import type { ChampionDetail, ChampionFeatDetail, JsonValue } from '../../domain/types'
import type { DetailFieldProps, EffectContext, FeatEffectEntry, SummaryTagGroupProps } from './types'
import { describeEffectPayload, parseEffectPayload } from './effect-model'
import { isJsonObject, isJsonPrimitive, parseInlineJsonValue } from './detail-json'
import { localizeSourceType, localizeStructuredKey } from './detail-localization'
import { buildNotAvailableLabel, formatBoolean, formatNumber, formatTimestamp } from './detail-value-formatters'

const REDACTED_AVAILABILITY_KEYS = new Set([
  'allow_time_gate',
  'available_in_store',
  'store_blackout',
  'time_gate_blackout',
])

export function formatStructuredPrimitive(
  value: string | number | boolean | null,
  locale: AppLocale,
  parentKey: string | null,
  effectContext?: EffectContext | null,
): string | null {
  if (value === null) {
    return buildNotAvailableLabel(locale)
  }

  if (typeof value === 'boolean') {
    return formatBoolean(value, locale)
  }

  if (typeof value === 'number') {
    if (parentKey === 'available_at_time') {
      return formatTimestamp(value, locale)
    }

    if (parentKey === 'odds') {
      return `${formatNumber(value, locale)}%`
    }

    if (parentKey === 'scale') {
      return `x${formatNumber(value, locale)}`
    }

    return formatNumber(value, locale)
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return buildNotAvailableLabel(locale)
  }

  if (effectContext) {
    const effectPayload = parseEffectPayload(trimmed)

    if (effectPayload) {
      return describeEffectPayload(effectPayload, effectContext).summary
    }
  }

  if (parentKey === 'type' || parentKey === 'source') {
    return localizeSourceType(trimmed, locale)
  }

  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && parseInlineJsonValue(trimmed)) {
    return null
  }

  return trimmed
}

export function buildOverviewPropertyFields(
  detail: ChampionDetail,
  locale: AppLocale,
  effectContext: EffectContext | null,
): DetailFieldProps[] {
  if (!isJsonObject(detail.properties)) {
    return []
  }

  const properties = detail.properties
  const fields: DetailFieldProps[] = []
  const propertyLabels = {
    weekly_buff: locale === 'zh-CN' ? '周增益' : 'Weekly buff',
  } as const

  const pushPrimitiveField = (key: keyof typeof propertyLabels) => {
    const rawValue = properties[key]

    if (rawValue === undefined || !isJsonPrimitive(rawValue)) {
      return
    }

    const formatted = formatStructuredPrimitive(rawValue, locale, key, effectContext)

    if (!formatted || formatted === buildNotAvailableLabel(locale)) {
      return
    }

    fields.push({
      label: propertyLabels[key],
      value: formatted,
    })
  }

  pushPrimitiveField('weekly_buff')

  return fields
}

export function buildSummaryTagText(label: string, value: string, locale: AppLocale): string {
  return locale === 'zh-CN' ? `${label} · ${value}` : `${label}: ${value}`
}

export function collectStructuredSummaryTags(
  value: JsonValue,
  locale: AppLocale,
  effectContext: EffectContext,
  parentKey: string | null = null,
): string[] {
  if (parentKey && REDACTED_AVAILABILITY_KEYS.has(parentKey)) {
    return []
  }

  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value.flatMap((item) =>
          collectStructuredSummaryTags(item, locale, effectContext, parentKey),
        ),
      ),
    )
  }

  if (isJsonObject(value)) {
    return Array.from(
      new Set(
        Object.entries(value).flatMap(([key, itemValue]) =>
          REDACTED_AVAILABILITY_KEYS.has(key) ? [] : collectStructuredSummaryTags(itemValue, locale, effectContext, key),
        ),
      ),
    )
  }

  if (typeof value === 'boolean') {
    if (!value || !parentKey) {
      return []
    }

    return [localizeStructuredKey(parentKey, locale)]
  }

  const formatted = formatStructuredPrimitive(value, locale, parentKey, effectContext)

  if (!formatted || formatted === buildNotAvailableLabel(locale)) {
    return []
  }

  if (!parentKey || parentKey === 'source' || parentKey === 'type') {
    return [formatted]
  }

  return [buildSummaryTagText(localizeStructuredKey(parentKey, locale), formatted, locale)]
}

export function buildFeatEffectEntries(value: JsonValue, effectContext: EffectContext): FeatEffectEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seen = new Set<string>()

  return value.flatMap((item) => {
    const descriptor = describeEffectItem(item, effectContext)
    const signature = `${descriptor.summary}__${descriptor.detail ?? ''}`

    if (seen.has(signature)) {
      return []
    }

    seen.add(signature)
    return [
      {
        summary: descriptor.summary,
        detail: descriptor.detail,
      },
    ]
  })
}

export function buildFeatTagGroups(
  feat: ChampionFeatDetail,
  locale: AppLocale,
  effectContext: EffectContext,
): SummaryTagGroupProps[] {
  const groups: SummaryTagGroupProps[] = [
    {
      label: locale === 'zh-CN' ? '来源' : 'Sources',
      items: collectStructuredSummaryTags(feat.sources, locale, effectContext),
    },
    {
      label: locale === 'zh-CN' ? '属性' : 'Properties',
      items: collectStructuredSummaryTags(feat.properties, locale, effectContext),
    },
    {
      label: locale === 'zh-CN' ? '收藏' : 'Collection',
      items: collectStructuredSummaryTags(feat.collectionsSource, locale, effectContext),
    },
  ]

  return groups.filter((group) => group.items.length > 0)
}

export function describeEffectItem(
  value: JsonValue,
  effectContext: EffectContext,
): { summary: string; detail: string | null; meta: JsonValue | null } {
  if (isJsonObject(value) && typeof value.effect_string === 'string') {
    const descriptor = describeEffectPayload(
      {
        raw: value.effect_string,
        effectString: value.effect_string,
        description: typeof value.description === 'string' ? value.description : null,
        data: value.data ?? null,
        kind: value.effect_string.split(',')[0] ?? value.effect_string,
        args: value.effect_string.split(',').slice(1),
      },
      effectContext,
    )
    const metaEntries = Object.entries(value).filter(([key]) => key !== 'effect_string' && key !== 'description')

    return {
      summary: descriptor.summary,
      detail: descriptor.detail,
      meta: metaEntries.length > 0 ? Object.fromEntries(metaEntries) : null,
    }
  }

  if (!isJsonPrimitive(value)) {
    return {
      summary: effectContext.locale === 'zh-CN' ? '复杂效果字段' : 'Structured effect data',
      detail: null,
      meta: value,
    }
  }

  const formatted = formatStructuredPrimitive(value, effectContext.locale, null, effectContext)

  return {
    summary: formatted ?? buildNotAvailableLabel(effectContext.locale),
    detail: null,
    meta: null,
  }
}

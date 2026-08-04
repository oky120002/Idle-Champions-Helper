import type { AppLocale } from '../../app/i18n'
import { TAG_LABELS } from '../../domain/champion-tags/labels'
import {
  buildEffectKeyPayload,
  parseEffectPayload,
  resolveEffectPayloadAmountToken,
} from '../../domain/effects/effect-string'
import type { JsonValue } from '../../domain/types'
import type { ParsedEffectPayload, EffectContext } from './types'
import { formatNumberishToken, formatNullableText, isNumberishToken } from './detail-value-formatters'
import { humanizeIdentifier, toTitleCase } from './detail-localization'
import { resolveEffectTargets } from './effect-targets'

export { buildEffectKeyPayload, parseEffectPayload }
export { resolveEffectTargets, summarizeTargetLabels } from './effect-targets'

function localizeTagValue(tag: string, locale: AppLocale): string {
  const normalized = tag.trim().toLowerCase()

  if (normalized === 'magic') {
    return ''
  }

  const localized = TAG_LABELS[normalized]?.[locale]

  if (localized != null && localized !== '') {
    return localized
  }

  return locale === 'zh-CN' ? normalized : toTitleCase(humanizeIdentifier(normalized))
}

function formatBooleanMetaValue(value: boolean, locale: AppLocale): string {
  if (value) return locale === 'zh-CN' ? '是' : 'Yes'
  return locale === 'zh-CN' ? '否' : 'No'
}

function formatStringMetaValue(value: string, locale: AppLocale): string | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  if (!trimmed.includes('|')) return localizeTagValue(trimmed, locale)
  return trimmed
    .split('|')
    .map((token) => localizeTagValue(token, locale))
    .join(locale === 'zh-CN' ? '、' : ', ')
}

function formatEffectMetaValue(value: JsonValue, locale: AppLocale): string | null {
  if (value == null) return null
  if (typeof value === 'number') return formatNumberishToken(String(value), locale)
  if (typeof value === 'boolean') return formatBooleanMetaValue(value, locale)
  if (typeof value === 'string') return formatStringMetaValue(value, locale)
  return null
}

function resolveAmountExpr(expr: string, payloads: ParsedEffectPayload[], locale: AppLocale): string | null {
  const trimmed = expr.trim()

  if (trimmed === '') return null

  const upgradeAmountMatch = /^upgrade_amount\((\d+),\s*(\d+)\)$/.exec(trimmed)

  if (upgradeAmountMatch) {
    const resolved = resolveEffectPayloadAmountToken(
      {
        raw: trimmed,
        effectString: trimmed,
        description: null,
        data: null,
        meta: { amount_expr: trimmed },
        kind: 'expr',
        args: [],
      },
      payloads,
    )

    return formatNumberishToken(resolved, locale)
  }

  return null
}

function resolvePayloadReference(
  token: string,
  payload: ParsedEffectPayload,
  payloads: ParsedEffectPayload[],
): { payload: ParsedEffectPayload; baseToken: string } {
  const trimmed = token.trim()
  const match = /^(.*?)(?:___(\d+))$/.exec(trimmed)

  if (!match) return { payload, baseToken: trimmed }

  const baseToken = match[1]?.trim() ?? trimmed
  const index = Number(match[2]) - 1
  const referencedPayload = index >= 0 ? payloads[index] ?? payload : payload

  return { payload: referencedPayload, baseToken }
}

function resolveAmountToken(
  token: string,
  payload: ParsedEffectPayload,
  payloads: ParsedEffectPayload[],
  effectContext: EffectContext,
): string | null {
  const { payload: targetPayload, baseToken } = resolvePayloadReference(token, payload, payloads)

  if (baseToken === 'amount') {
    const fromExpr =
      typeof targetPayload.meta?.amount_expr === 'string'
        ? resolveAmountExpr(targetPayload.meta.amount_expr, payloads, effectContext.locale)
        : null

    if (fromExpr != null && fromExpr !== '') return fromExpr

    return formatNumberishToken(targetPayload.args.filter(isNumberishToken)[0] ?? targetPayload.args[0] ?? null, effectContext.locale)
  }

  if (baseToken === 'not_buffed amount') return resolveAmountToken(`amount${token.includes('___') ? token.slice(token.indexOf('___')) : ''}`, payload, payloads, effectContext)

  return null
}

function resolveMetaBackedToken(
  token: string,
  payload: ParsedEffectPayload,
  payloads: ParsedEffectPayload[],
  effectContext: EffectContext,
): string | null {
  const { payload: targetPayload, baseToken } = resolvePayloadReference(token, payload, payloads)
  const metaValue = targetPayload.meta?.[baseToken]

  if (metaValue !== undefined) {
    return formatEffectMetaValue(metaValue, effectContext.locale)
  }

  return null
}

function resolveStaticKeywordToken(trimmed: string, effectContext: EffectContext): string | null {
  if (trimmed === 'source_hero' || trimmed === 'source') return effectContext.championName
  if (trimmed === 'd_s1_seat') return effectContext.locale === 'zh-CN' ? '客座栏位' : 'guest seat'
  if (trimmed === 'd_s1_guest') return effectContext.locale === 'zh-CN' ? '客座明星' : 'guest star'
  if (trimmed === 'd_s1_seat_core_hero' || trimmed === 'd_s1_slot_hero') return effectContext.locale === 'zh-CN' ? '代表勇士' : 'representative champion'
  return null
}

function resolveUpgradeNameToken(
  trimmed: string,
  payload: ParsedEffectPayload,
  payloads: ParsedEffectPayload[],
  effectContext: EffectContext,
): string {
  const { payload: targetPayload, baseToken } = resolvePayloadReference(trimmed.slice('upgrade_name '.length).trim(), payload, payloads)
  const upgradeId =
    ['id', 'upgrade_id'].includes(baseToken) ? targetPayload.args[1] ?? targetPayload.args[0] ?? null : null

  if (upgradeId == null || upgradeId === '') return effectContext.locale === 'zh-CN' ? '对应能力' : 'the linked ability'

  return effectContext.upgradeLabelById.get(upgradeId) ?? upgradeId
}

function resolveAttackNameToken(
  trimmed: string,
  payload: ParsedEffectPayload,
  payloads: ParsedEffectPayload[],
  effectContext: EffectContext,
): string | null {
  const { payload: targetPayload, baseToken } = resolvePayloadReference(trimmed.slice('attack_name '.length).trim(), payload, payloads)
  const attackId = ['attack_id', 'id'].includes(baseToken) ? targetPayload.args[0] ?? null : null
  if (attackId == null || attackId === '') return null
  return effectContext.attackLabelById.get(attackId) ?? `#${attackId}`
}

function resolvePrefixedToken(
  trimmed: string,
  payload: ParsedEffectPayload,
  payloads: ParsedEffectPayload[],
  effectContext: EffectContext,
): string | null {
  if (trimmed.startsWith('seconds_plural ')) {
    const nested = resolveCompoundToken(trimmed.slice('seconds_plural '.length), payload, payloads, effectContext)
    if (nested == null || nested === '') return null
    return effectContext.locale === 'zh-CN' ? `${nested} 秒` : `${nested} seconds`
  }

  if (trimmed.startsWith('upgrade_name ')) return resolveUpgradeNameToken(trimmed, payload, payloads, effectContext)

  if (trimmed.startsWith('upgrade_hero ')) return effectContext.championName

  if (trimmed.startsWith('attack_name ')) return resolveAttackNameToken(trimmed, payload, payloads, effectContext)

  if (trimmed.startsWith('describe_tags ')) {
    const raw = resolveMetaBackedToken(trimmed.slice('describe_tags '.length).trim(), payload, payloads, effectContext)
    return raw != null && raw !== '' ? formatNullableText(raw, effectContext.locale) : null
  }

  return null
}

function resolveCompoundToken(
  token: string,
  payload: ParsedEffectPayload,
  payloads: ParsedEffectPayload[],
  effectContext: EffectContext,
): string | null {
  const trimmed = token.trim()

  const staticResult = resolveStaticKeywordToken(trimmed, effectContext)
  if (staticResult !== null) return staticResult

  if (trimmed === 'gromma_circle_of_the_mountain_target') {
    const buffTarget = typeof payload.meta?.buff_target === 'string' ? payload.meta.buff_target : null
    if (buffTarget != null && buffTarget !== '') return localizeTagValue(buffTarget, effectContext.locale)
    return effectContext.locale === 'zh-CN' ? '中立' : 'Neutral'
  }

  if (trimmed === 'target') return resolveEffectTargets(payload, effectContext).summary

  const prefixedResult = resolvePrefixedToken(trimmed, payload, payloads, effectContext)
  if (prefixedResult !== null) return prefixedResult

  const resolvedAmount = resolveAmountToken(trimmed, payload, payloads, effectContext)
  if (resolvedAmount != null && resolvedAmount !== '') return resolvedAmount

  const resolvedMetaValue = resolveMetaBackedToken(trimmed, payload, payloads, effectContext)
  if (resolvedMetaValue != null && resolvedMetaValue !== '') return resolvedMetaValue

  return null
}

export function resolveEffectToken(
  token: string,
  payload: ParsedEffectPayload,
  effectContext: EffectContext,
  payloads: ParsedEffectPayload[] = [payload],
): string | null {
  return resolveCompoundToken(token, payload, payloads, effectContext)
}

function replaceMarkupPlaceholders(description: string, locale: AppLocale, effectContext: EffectContext): string {
  return description
    // eslint-disable-next-line sonarjs/super-linear-regex -- 游戏数据效果描述，输入受限且长度有界
    .replace(/\{([^}]+)\}(?:#([0-9a-f]+))?/gi, (_match, rawLabel) => {
      const trimmed = String(rawLabel).trim()
      const normalized = trimmed.toLowerCase()
      return TAG_LABELS[normalized]?.[locale] ?? localizeTagValue(trimmed, locale)
    })
    .replace(/\[#(\d+)[A-Z]?\]/g, (_match: string, attackId: string) => effectContext.attackLabelById.get(attackId) ?? `#${attackId}`)
}

function normalizeResolvedText(value: string, locale: AppLocale): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\^+/g, ' ')
    .replace(locale === 'zh-CN' ? /第\s*客座栏位\s*栏位/g : /Seat\s+guest seat/gi, locale === 'zh-CN' ? '客座栏位' : 'guest seat')
    // eslint-disable-next-line sonarjs/super-linear-regex -- 已解析的显示文本，长度有界
    .replace(/\s+([，。！？、,.!?:;）])/g, '$1')
    .replace(/([（(])\s+/g, '$1')
    .trim()
}

export function resolveEffectDescription(
  description: string | null,
  payload: ParsedEffectPayload,
  effectContext: EffectContext,
  payloads: ParsedEffectPayload[] = [payload],
): string | null {
  if (description == null || description === '') return null
  const replaced = description
    .replace(/\$\(([^)]+)\)/g, (_match: string, token: string) => {
      return resolveEffectToken(token, payload, effectContext, payloads) ?? (effectContext.locale === 'zh-CN' ? '该值' : 'value')
    })
    .replace(/\$([a-zA-Z_]\w*)(?:___(\d+))?/g, (_match: string, rawBase: string, rawIndex?: string) => {
      const token = rawIndex != null && rawIndex !== '' ? `${rawBase}___${rawIndex}` : rawBase
      return resolveEffectToken(token, payload, effectContext, payloads) ?? (effectContext.locale === 'zh-CN' ? '该值' : 'value')
    })

  return normalizeResolvedText(replaceMarkupPlaceholders(replaced, effectContext.locale, effectContext), effectContext.locale)
}

const STANDALONE_TEXT_PAYLOAD: ParsedEffectPayload = {
  raw: 'text',
  effectString: 'text',
  description: null,
  data: null,
  meta: null,
  kind: 'text',
  args: [],
}

export function sanitizeEffectText(text: string, effectContext: EffectContext): string {
  return resolveEffectDescription(text, STANDALONE_TEXT_PAYLOAD, effectContext, [STANDALONE_TEXT_PAYLOAD]) ?? text
}

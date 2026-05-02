import type { AppLocale } from '../../app/i18n'
import { TAG_LABELS } from '../../domain/champion-tags/labels'
import type { JsonValue } from '../../domain/types'
import type { ParsedEffectPayload, EffectContext } from './types'
import { isJsonObject, parseInlineJsonValue } from './detail-json'
import { formatNumberishToken, formatNullableText, isNumberishToken } from './detail-value-formatters'
import { humanizeIdentifier, toTitleCase } from './detail-localization'

export function parseEffectPayload(value: string): ParsedEffectPayload | null {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('{')) {
    const parsed = parseInlineJsonValue(trimmed)

    if (parsed && isJsonObject(parsed) && typeof parsed.effect_string === 'string') {
      const [kind, ...args] = parsed.effect_string.split(',')

      if (!kind || !/^[a-z_][a-z0-9_]*$/i.test(kind)) {
        return null
      }

      return {
        raw: trimmed,
        effectString: parsed.effect_string,
        description: typeof parsed.description === 'string' ? parsed.description : null,
        data: parsed.data ?? null,
        meta: parsed,
        kind,
        args,
      }
    }

    return null
  }

  const [kind, ...args] = trimmed.split(',')

  if (!kind || !/^[a-z_][a-z0-9_]*$/i.test(kind)) {
    return null
  }

  return {
    raw: trimmed,
    effectString: trimmed,
    description: null,
    data: null,
    meta: null,
    kind,
    args,
  }
}

export function buildEffectKeyPayload(effectKey: Record<string, JsonValue>): ParsedEffectPayload | null {
  if (typeof effectKey.effect_string !== 'string') {
    return null
  }

  const parsed = parseEffectPayload(effectKey.effect_string)

  if (!parsed) {
    return null
  }

  return {
    ...parsed,
    description: typeof effectKey.description === 'string' ? effectKey.description : parsed.description,
    data: effectKey.data ?? parsed.data,
    meta: effectKey,
  }
}

export function summarizeTargetLabels(labels: string[], locale: AppLocale): {
  summary: string | null
  detail: string | null
} {
  if (labels.length === 0) {
    return { summary: null, detail: null }
  }

  if (labels.length === 1) {
    return { summary: labels[0] ?? null, detail: null }
  }

  const normalizedPrefixes = labels
    .map((label) => label.split(/[:：]/)[0]?.trim() ?? '')
    .filter((value) => value.length > 0)
  const sharedPrefix =
    normalizedPrefixes.length === labels.length && new Set(normalizedPrefixes).size === 1
      ? (normalizedPrefixes[0] ?? null)
      : null

  if (sharedPrefix) {
    return {
      summary:
        locale === 'zh-CN'
          ? `${sharedPrefix}（${labels.length} 个分支）`
          : `${sharedPrefix} (${labels.length} branches)`,
      detail: labels.join(' / '),
    }
  }

  if (labels.length <= 3) {
    return { summary: labels.join(' / '), detail: null }
  }

  return {
    summary:
      locale === 'zh-CN'
        ? `${labels[0]} 等 ${labels.length} 项`
        : `${labels[0]} and ${labels.length - 1} more`,
    detail: labels.join(' / '),
  }
}

export function resolveEffectTargets(
  payload: ParsedEffectPayload,
  effectContext: EffectContext,
): { summary: string | null; detail: string | null } {
  const { kind, args } = payload

  if (
    kind === 'buff_upgrade' ||
    kind === 'buff_upgrade_add_flat_amount' ||
    kind === 'buff_upgrade_effect_stacks_max_mult' ||
    kind === 'buff_upgrade_per_any_tagged_crusader_mult' ||
    kind === 'change_upgrade_data' ||
    kind === 'change_upgrade_targets'
  ) {
    const targetId = args[1] ?? args[0] ?? null
    const label = targetId ? effectContext.upgradeLabelById.get(targetId) ?? `${targetId}` : null
    return { summary: label, detail: null }
  }

  if (kind === 'buff_upgrades') {
    return summarizeTargetLabels(
      args.slice(1).map((id) => effectContext.upgradeLabelById.get(id) ?? `${id}`),
      effectContext.locale,
    )
  }

  if (kind === 'set_ultimate_attack' || kind === 'change_base_attack') {
    const attackId = args[0] ?? null
    const label = attackId ? effectContext.attackLabelById.get(attackId) ?? `#${attackId}` : null
    return { summary: label, detail: null }
  }

  if (kind === 'buff_upgrade_per_any_tagged_crusader') {
    const targetId = args[1] ?? null
    const label = targetId ? effectContext.upgradeLabelById.get(targetId) ?? `${targetId}` : null
    return { summary: label, detail: args[2] ? args[2] : null }
  }

  if (kind === 'buff_upgrade_per_any_tagged_crusader_mult') {
    const targetId = args[1] ?? null
    const label = targetId ? effectContext.upgradeLabelById.get(targetId) ?? `${targetId}` : null
    return { summary: label, detail: args[2] ? args[2] : null }
  }

  return { summary: null, detail: null }
}

function localizeTagValue(tag: string, locale: AppLocale): string {
  const normalized = tag.trim().toLowerCase()

  if (normalized === 'magic') {
    return ''
  }

  const localized = TAG_LABELS[normalized]?.[locale]

  if (localized) {
    return localized
  }

  return locale === 'zh-CN' ? normalized : toTitleCase(humanizeIdentifier(normalized))
}

function formatEffectMetaValue(value: JsonValue, locale: AppLocale): string | null {
  if (value == null) {
    return null
  }

  if (typeof value === 'number') {
    return formatNumberishToken(String(value), locale)
  }

  if (typeof value === 'boolean') {
    return value ? (locale === 'zh-CN' ? '是' : 'Yes') : locale === 'zh-CN' ? '否' : 'No'
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) {
      return null
    }

    if (trimmed.includes('|')) {
      return trimmed
        .split('|')
        .map((token) => localizeTagValue(token, locale))
        .join(locale === 'zh-CN' ? '、' : ', ')
    }

    return localizeTagValue(trimmed, locale)
  }

  return null
}

function resolveAmountExpr(expr: string, payloads: ParsedEffectPayload[], locale: AppLocale): string | null {
  const trimmed = expr.trim()

  if (!trimmed) {
    return null
  }

  const upgradeAmountMatch = trimmed.match(/^upgrade_amount\((\d+),\s*(\d+)\)$/)

  if (upgradeAmountMatch) {
    const [, _upgradeId, indexToken] = upgradeAmountMatch
    const effectIndex = Number(indexToken)
    const sourcePayload = payloads[effectIndex] ?? null

    if (!sourcePayload) {
      return null
    }

    return formatNumberishToken(sourcePayload.args[effectIndex] ?? null, locale)
  }

  return null
}

function resolvePayloadReference(
  token: string,
  payload: ParsedEffectPayload,
  payloads: ParsedEffectPayload[],
): { payload: ParsedEffectPayload; baseToken: string } {
  const trimmed = token.trim()
  const match = trimmed.match(/^(.*?)(?:___(\d+))$/)

  if (!match) {
    return { payload, baseToken: trimmed }
  }

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

    if (fromExpr) {
      return fromExpr
    }

    return formatNumberishToken(targetPayload.args.filter(isNumberishToken)[0] ?? targetPayload.args[0] ?? null, effectContext.locale)
  }

  if (baseToken === 'not_buffed amount') {
    return resolveAmountToken(`amount${token.includes('___') ? token.slice(token.indexOf('___')) : ''}`, payload, payloads, effectContext)
  }

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

function resolveCompoundToken(
  token: string,
  payload: ParsedEffectPayload,
  payloads: ParsedEffectPayload[],
  effectContext: EffectContext,
): string | null {
  const trimmed = token.trim()

  if (trimmed === 'source_hero' || trimmed === 'source') {
    return effectContext.championName
  }

  if (trimmed === 'gromma_circle_of_the_mountain_target') {
    const buffTarget = typeof payload.meta?.buff_target === 'string' ? payload.meta.buff_target : null
    return buffTarget ? localizeTagValue(buffTarget, effectContext.locale) : effectContext.locale === 'zh-CN' ? '中立' : 'Neutral'
  }

  if (trimmed === 'd_s1_seat') {
    return effectContext.locale === 'zh-CN' ? '客座栏位' : 'guest seat'
  }

  if (trimmed === 'd_s1_guest') {
    return effectContext.locale === 'zh-CN' ? '客座明星' : 'guest star'
  }

  if (trimmed === 'd_s1_seat_core_hero' || trimmed === 'd_s1_slot_hero') {
    return effectContext.locale === 'zh-CN' ? '代表勇士' : 'representative champion'
  }

  if (trimmed === 'target') {
    return resolveEffectTargets(payload, effectContext).summary
  }

  if (trimmed.startsWith('seconds_plural ')) {
    const nested = resolveCompoundToken(trimmed.slice('seconds_plural '.length), payload, payloads, effectContext)

    if (!nested) {
      return null
    }

    return effectContext.locale === 'zh-CN' ? `${nested} 秒` : `${nested} seconds`
  }

  if (trimmed.startsWith('upgrade_name ')) {
    const targetToken = trimmed.slice('upgrade_name '.length).trim()
    const { payload: targetPayload, baseToken } = resolvePayloadReference(targetToken, payload, payloads)
    const upgradeId =
      baseToken === 'id' || baseToken === 'upgrade_id' ? targetPayload.args[1] ?? targetPayload.args[0] ?? null : null

    if (!upgradeId) {
      return effectContext.locale === 'zh-CN' ? '对应能力' : 'the linked ability'
    }

    return effectContext.upgradeLabelById.get(upgradeId) ?? upgradeId
  }

  if (trimmed.startsWith('upgrade_hero ')) {
    return effectContext.championName
  }

  if (trimmed.startsWith('attack_name ')) {
    const targetToken = trimmed.slice('attack_name '.length).trim()
    const { payload: targetPayload, baseToken } = resolvePayloadReference(targetToken, payload, payloads)
    const attackId =
      baseToken === 'attack_id' || baseToken === 'id' ? targetPayload.args[0] ?? null : null

    if (!attackId) {
      return null
    }

    return effectContext.attackLabelById.get(attackId) ?? `#${attackId}`
  }

  if (trimmed.startsWith('describe_tags ')) {
    const targetToken = trimmed.slice('describe_tags '.length).trim()
    const raw = resolveMetaBackedToken(targetToken, payload, payloads, effectContext)
    return raw ? formatNullableText(raw, effectContext.locale) : null
  }

  const resolvedAmount = resolveAmountToken(trimmed, payload, payloads, effectContext)

  if (resolvedAmount) {
    return resolvedAmount
  }

  const resolvedMetaValue = resolveMetaBackedToken(trimmed, payload, payloads, effectContext)

  if (resolvedMetaValue) {
    return resolvedMetaValue
  }

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
    .replace(/\{([^}]+)\}(?:#([0-9a-f]+))?/gi, (_match, rawLabel) => {
      const trimmed = String(rawLabel).trim()
      const normalized = trimmed.toLowerCase()
      return TAG_LABELS[normalized]?.[locale] ?? localizeTagValue(trimmed, locale)
    })
    .replace(/\[#(\d+)[A-Z]?\]/g, (_match, attackId) => effectContext.attackLabelById.get(String(attackId)) ?? `#${attackId}`)
}

function normalizeResolvedText(value: string, locale: AppLocale): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\^+/g, ' ')
    .replace(locale === 'zh-CN' ? /第\s*客座栏位\s*栏位/g : /Seat\s+guest seat/gi, locale === 'zh-CN' ? '客座栏位' : 'guest seat')
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
  if (!description) {
    return null
  }
  const replaced = description
    .replace(/\$\(([^)]+)\)/g, (_match: string, token: string) => {
      return resolveEffectToken(token, payload, effectContext, payloads) ?? (effectContext.locale === 'zh-CN' ? '该值' : 'value')
    })
    .replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)(?:___(\d+))?/g, (_match: string, rawBase: string, rawIndex?: string) => {
      const token = rawIndex ? `${rawBase}___${rawIndex}` : rawBase
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

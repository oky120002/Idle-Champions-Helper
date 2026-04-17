import type { AppLocale } from '../../app/i18n'
import type { ParsedEffectPayload, EffectContext } from './types'
import { isJsonObject, parseInlineJsonValue } from './detail-json'
import { formatNumberishToken, isNumberishToken } from './detail-value-formatters'

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
    kind,
    args,
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

  return { summary: null, detail: null }
}

export function resolveEffectDescription(
  description: string | null,
  payload: ParsedEffectPayload,
  effectContext: EffectContext,
): string | null {
  if (!description) {
    return null
  }

  const numericArgs = payload.args.filter(isNumberishToken)
  const targetSummary = resolveEffectTargets(payload, effectContext)

  const resolveToken = (token: string): string => {
    const normalized = token.trim()

    if (normalized === 'amount') {
      return formatNumberishToken(numericArgs[0] ?? null, effectContext.locale)
    }

    if (/^amount_(\d+)$/.test(normalized)) {
      const index = Number(normalized.split('_')[1]) - 1
      return formatNumberishToken(numericArgs[index] ?? null, effectContext.locale)
    }

    if (normalized === 'seconds_plural amount') {
      return effectContext.locale === 'zh-CN'
        ? `${formatNumberishToken(numericArgs[0] ?? null, effectContext.locale)} 秒`
        : `${formatNumberishToken(numericArgs[0] ?? null, effectContext.locale)} seconds`
    }

    if (normalized.startsWith('upgrade_name')) {
      return targetSummary.summary ?? (effectContext.locale === 'zh-CN' ? '对应能力' : 'the linked ability')
    }

    if (normalized.startsWith('upgrade_hero')) {
      return effectContext.championName
    }

    return effectContext.locale === 'zh-CN' ? '该值' : 'value'
  }

  return description
    .replace(/\$\(([^)]+)\)/g, (_match: string, token: string) => resolveToken(token))
    .replace(/\$amount\b/g, formatNumberishToken(numericArgs[0] ?? null, effectContext.locale))
}

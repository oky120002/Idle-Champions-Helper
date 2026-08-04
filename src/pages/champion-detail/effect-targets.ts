import type { AppLocale } from '../../app/i18n'
import type { ParsedEffectPayload, EffectContext } from './types'

const UPGRADE_SINGLE_TARGET_KINDS = new Set([
  'buff_upgrade',
  'buff_upgrade_add_flat_amount',
  'buff_upgrade_effect_stacks_max_mult',
  'buff_upgrade_per_any_tagged_crusader_mult',
  'change_upgrade_data',
  'change_upgrade_targets',
])

function resolveUpgradeTargetLabel(targetId: string | null, effectContext: EffectContext): string | null {
  if (targetId == null || targetId === '') return null
  return effectContext.upgradeLabelById.get(targetId) ?? targetId
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

  if (sharedPrefix != null && sharedPrefix !== '') {
    const branchCount = String(labels.length)
    return {
      summary:
        locale === 'zh-CN'
          ? `${sharedPrefix}（${branchCount} 个分支）`
          : `${sharedPrefix} (${branchCount} branches)`,
      detail: labels.join(' / '),
    }
  }

  if (labels.length <= 3) {
    return { summary: labels.join(' / '), detail: null }
  }

  const firstLabel = labels[0] ?? ''
  return {
    summary:
      locale === 'zh-CN'
        ? `${firstLabel} 等 ${String(labels.length)} 项`
        : `${firstLabel} and ${String(labels.length - 1)} more`,
    detail: labels.join(' / '),
  }
}

export function resolveEffectTargets(
  payload: ParsedEffectPayload,
  effectContext: EffectContext,
): { summary: string | null; detail: string | null } {
  const { kind, args } = payload

  if (UPGRADE_SINGLE_TARGET_KINDS.has(kind)) {
    return { summary: resolveUpgradeTargetLabel(args[1] ?? args[0] ?? null, effectContext), detail: null }
  }

  if (kind === 'buff_upgrades') {
    return summarizeTargetLabels(
      args.slice(1).map((id) => effectContext.upgradeLabelById.get(id) ?? id),
      effectContext.locale,
    )
  }

  if (kind === 'set_ultimate_attack' || kind === 'change_base_attack') {
    const attackId = args[0] ?? null
    const label = attackId != null && attackId !== '' ? (effectContext.attackLabelById.get(attackId) ?? `#${attackId}`) : null
    return { summary: label, detail: null }
  }

  if (kind === 'buff_upgrade_per_any_tagged_crusader' || kind === 'buff_upgrade_per_any_tagged_crusader_mult') {
    const detail = args[2]
    return { summary: resolveUpgradeTargetLabel(args[1] ?? null, effectContext), detail: detail != null && detail !== '' ? detail : null }
  }

  return { summary: null, detail: null }
}

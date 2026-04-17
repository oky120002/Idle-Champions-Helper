import type { ParsedEffectPayload, EffectContext, EffectDescriptor } from './types'
import { containsCjkCharacters, localizeAbilityScore, localizeEffectKind } from './detail-localization'
import { buildNotAvailableLabel, formatNumberishToken } from './detail-value-formatters'
import { resolveEffectDescription, resolveEffectTargets } from './effect-payload'

export function describeEffectPayload(payload: ParsedEffectPayload, effectContext: EffectContext): EffectDescriptor {
  const { locale } = effectContext
  const amount = formatNumberishToken(payload.args[0] ?? null, locale)
  const targets = resolveEffectTargets(payload, effectContext)
  const resolvedDescription = resolveEffectDescription(payload.description, payload, effectContext)
  let categoryLabel = localizeEffectKind(payload.kind, locale)
  let summary: string

  switch (payload.kind) {
    case 'hero_dps_multiplier_mult':
      categoryLabel = locale === 'zh-CN' ? '自身增伤' : 'Self damage'
      summary = locale === 'zh-CN' ? `自身伤害提高 ${amount}%` : `Champion damage increases by ${amount}%`
      break
    case 'global_dps_multiplier_mult':
      categoryLabel = locale === 'zh-CN' ? '全队增伤' : 'Party damage'
      summary = locale === 'zh-CN' ? `全队伤害提高 ${amount}%` : `Party damage increases by ${amount}%`
      break
    case 'gold_multiplier_mult':
      categoryLabel = locale === 'zh-CN' ? '金币加成' : 'Gold find'
      summary = locale === 'zh-CN' ? `金币获取提高 ${amount}%` : `Gold find increases by ${amount}%`
      break
    case 'health_add':
      categoryLabel = locale === 'zh-CN' ? '生命值' : 'Health'
      summary = locale === 'zh-CN' ? `生命值 +${amount}` : `Health +${amount}`
      break
    case 'health_mult':
      categoryLabel = locale === 'zh-CN' ? '生命值' : 'Health'
      summary = locale === 'zh-CN' ? `生命值提高 ${amount}%` : `Health increases by ${amount}%`
      break
    case 'buff_upgrade':
      categoryLabel = locale === 'zh-CN' ? '能力强化' : 'Ability boost'
      summary =
        locale === 'zh-CN'
          ? `使「${targets.summary ?? '关联能力'}」效果提高 ${amount}%`
          : `Increase "${targets.summary ?? 'linked ability'}" by ${amount}%`
      break
    case 'buff_upgrades':
      categoryLabel = locale === 'zh-CN' ? '能力强化' : 'Ability boost'
      summary =
        locale === 'zh-CN'
          ? `使${targets.summary ?? '多项关联能力'}效果提高 ${amount}%`
          : `Increase ${targets.summary ?? 'linked abilities'} by ${amount}%`
      break
    case 'buff_upgrade_add_flat_amount':
      categoryLabel = locale === 'zh-CN' ? '能力强化' : 'Ability boost'
      summary =
        locale === 'zh-CN'
          ? `为「${targets.summary ?? '关联能力'}」额外增加 ${amount}`
          : `Add ${amount} to "${targets.summary ?? 'linked ability'}"`
      break
    case 'set_ultimate_attack': {
      categoryLabel = locale === 'zh-CN' ? '终极技' : 'Ultimate'
      const attackLabel = targets.summary ?? `#${payload.args[0] ?? ''}`
      summary = locale === 'zh-CN' ? `解锁终极技「${attackLabel}」` : `Unlock ultimate "${attackLabel}"`
      break
    }
    case 'add_attack_targets':
      categoryLabel = locale === 'zh-CN' ? '普攻强化' : 'Base attack'
      summary =
        locale === 'zh-CN' ? `普攻额外命中 ${amount} 个目标` : `Base attack hits ${amount} additional targets`
      break
    case 'buff_ultimate':
      categoryLabel = locale === 'zh-CN' ? '终极技强化' : 'Ultimate boost'
      summary = locale === 'zh-CN' ? `终极技效果提高 ${amount}%` : `Ultimate effect increases by ${amount}%`
      break
    case 'buff_attack_damage':
      categoryLabel = locale === 'zh-CN' ? '普攻强化' : 'Base attack'
      summary = locale === 'zh-CN' ? `普攻伤害提高 ${amount}%` : `Base attack damage increases by ${amount}%`
      break
    case 'reduce_attack_cooldown':
      categoryLabel = locale === 'zh-CN' ? '冷却缩减' : 'Cooldown'
      summary = locale === 'zh-CN' ? `攻击冷却缩短 ${amount} 秒` : `Attack cooldown is reduced by ${amount}s`
      break
    case 'increase_ability_score':
      categoryLabel = locale === 'zh-CN' ? '属性强化' : 'Ability score'
      summary =
        locale === 'zh-CN'
          ? `${localizeAbilityScore(payload.args[0] ?? '', locale)}提高 ${formatNumberishToken(payload.args[1] ?? null, locale)}`
          : `${localizeAbilityScore(payload.args[0] ?? '', locale)} increases by ${formatNumberishToken(payload.args[1] ?? null, locale)}`
      break
    case 'buff_base_crit_chance_add':
      categoryLabel = locale === 'zh-CN' ? '暴击率' : 'Crit chance'
      summary = locale === 'zh-CN' ? `基础暴击率提高 ${amount}%` : `Base crit chance increases by ${amount}%`
      break
    case 'buff_base_crit_damage':
      categoryLabel = locale === 'zh-CN' ? '暴击伤害' : 'Crit damage'
      summary = locale === 'zh-CN' ? `基础暴击伤害提高 ${amount}%` : `Base crit damage increases by ${amount}%`
      break
    case 'change_base_attack': {
      categoryLabel = locale === 'zh-CN' ? '替换普攻' : 'Swap base attack'
      const attackLabel = targets.summary ?? `#${payload.args[0] ?? ''}`
      summary =
        locale === 'zh-CN'
          ? `将普攻替换为「${attackLabel}」`
          : `Replace the base attack with "${attackLabel}"`
      break
    }
    case 'change_upgrade_targets':
      categoryLabel = locale === 'zh-CN' ? '修改目标范围' : 'Retarget ability'
      summary =
        locale === 'zh-CN'
          ? `改写「${targets.summary ?? '关联能力'}」的目标范围`
          : `Change the target shape of "${targets.summary ?? 'linked ability'}"`
      break
    case 'change_upgrade_data':
      categoryLabel = locale === 'zh-CN' ? '修改升级数据' : 'Modify upgrade data'
      summary =
        locale === 'zh-CN'
          ? `改写「${targets.summary ?? '关联能力'}」的内部数据`
          : `Change the internal data for "${targets.summary ?? 'linked ability'}"`
      break
    case 'overwhelm_start_increase':
      categoryLabel = locale === 'zh-CN' ? '压制阈值' : 'Overwhelm'
      summary = locale === 'zh-CN' ? `压制起始值提高 ${amount}` : `Starting overwhelm increases by ${amount}`
      break
    case 'add_hero_tags':
      categoryLabel = locale === 'zh-CN' ? '新增标签' : 'Add tag'
      summary =
        locale === 'zh-CN'
          ? `新增标签「${payload.args[2] ?? payload.args[1] ?? 'unknown'}」`
          : `Add the "${payload.args[2] ?? payload.args[1] ?? 'unknown'}" tag`
      break
    case 'buff_upgrade_effect_stacks_max_mult':
      categoryLabel = locale === 'zh-CN' ? '层数上限' : 'Stack cap'
      summary =
        locale === 'zh-CN'
          ? `使「${targets.summary ?? '关联能力'}」的最大层数提高 ${amount}%`
          : `Increase the max stacks of "${targets.summary ?? 'linked ability'}" by ${amount}%`
      break
    case 'buff_upgrade_per_any_tagged_crusader':
      categoryLabel = locale === 'zh-CN' ? '按标签增幅' : 'Tag-based boost'
      summary =
        locale === 'zh-CN'
          ? `每名符合标签的英雄使「${targets.summary ?? '关联能力'}」提高 ${amount}%`
          : `Each tagged champion increases "${targets.summary ?? 'linked ability'}" by ${amount}%`
      break
    default:
      summary =
        locale === 'zh-CN'
          ? `效果类型：${localizeEffectKind(payload.kind, locale)}`
          : `Effect type: ${localizeEffectKind(payload.kind, locale)}`
      break
  }

  const preferDescription =
    resolvedDescription &&
    ((locale === 'zh-CN' && containsCjkCharacters(resolvedDescription)) || locale !== 'zh-CN')

  return {
    categoryLabel,
    targetLabel: targets.summary,
    targetHint: targets.detail,
    summary: preferDescription ? resolvedDescription : summary,
    detail:
      (!preferDescription && resolvedDescription ? resolvedDescription : null) ??
      (targets.detail && targets.detail !== targets.summary ? targets.detail : null),
  }
}

export function buildUpgradeCategoryMeta(typeLabel: string, locale: 'zh-CN' | 'en-US') {
  const defaultCollapsedLabels =
    locale === 'zh-CN' ? new Set(['自身增伤', '全队增伤']) : new Set(['Self damage', 'Party damage'])

  return {
    key: typeLabel,
    label: typeLabel,
    defaultEnabled: !defaultCollapsedLabels.has(typeLabel),
  }
}

export function buildUnavailableUpgradeLabel(locale: 'zh-CN' | 'en-US'): string {
  return buildNotAvailableLabel(locale)
}

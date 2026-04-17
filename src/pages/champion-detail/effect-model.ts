import type { AppLocale } from '../../app/i18n'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionRawEntry, ChampionUpgradeDetail } from '../../domain/types'
import type {
  EffectContext,
  EffectDefinitionPresentation,
  EffectDescriptor,
  ParsedEffectPayload,
  UpgradeCategoryMeta,
  UpgradePresentation,
} from './types'
import {
  buildNotAvailableLabel,
  containsCjkCharacters,
  formatMultiplierValue,
  formatNumberishToken,
  isJsonObject,
  isNumberishToken,
  localizeAbilityScore,
  localizeEffectKind,
  localizeUpgradeType,
  parseInlineJsonValue,
} from './shared'

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

export function summarizeTargetLabels(labels: string[], locale: AppLocale): { summary: string | null; detail: string | null } {
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

  if (kind === 'buff_upgrade' || kind === 'buff_upgrade_add_flat_amount' || kind === 'buff_upgrade_effect_stacks_max_mult' || kind === 'change_upgrade_data' || kind === 'change_upgrade_targets') {
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
    case 'set_ultimate_attack':
      categoryLabel = locale === 'zh-CN' ? '终极技' : 'Ultimate'
      {
        const attackLabel = targets.summary ?? `#${payload.args[0] ?? ''}`
        summary =
          locale === 'zh-CN'
            ? `解锁终极技「${attackLabel}」`
            : `Unlock ultimate "${attackLabel}"`
      }
      break
    case 'add_attack_targets':
      categoryLabel = locale === 'zh-CN' ? '普攻强化' : 'Base attack'
      summary =
        locale === 'zh-CN'
          ? `普攻额外命中 ${amount} 个目标`
          : `Base attack hits ${amount} additional targets`
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
    case 'change_base_attack':
      categoryLabel = locale === 'zh-CN' ? '替换普攻' : 'Swap base attack'
      {
        const attackLabel = targets.summary ?? `#${payload.args[0] ?? ''}`
        summary =
          locale === 'zh-CN'
            ? `将普攻替换为「${attackLabel}」`
            : `Replace the base attack with "${attackLabel}"`
      }
      break
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
      summary =
        locale === 'zh-CN'
          ? `压制起始值提高 ${amount}`
          : `Starting overwhelm increases by ${amount}`
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

export function buildEffectDefinitionPresentation(
  entry: ChampionRawEntry | null,
  effectContext: EffectContext,
): EffectDefinitionPresentation {
  if (!entry) {
    return {
      summary: null,
      detail: null,
      bullets: [],
    }
  }

  const snapshot =
    effectContext.locale === 'zh-CN' ? entry.snapshots.display : entry.snapshots.original

  if (!isJsonObject(snapshot)) {
    return {
      summary: null,
      detail: null,
      bullets: [],
    }
  }

  const descriptionValue = snapshot.description
  const description =
    isJsonObject(descriptionValue) && typeof descriptionValue.desc === 'string'
      ? descriptionValue.desc
      : typeof descriptionValue === 'string'
        ? descriptionValue
        : null
  const effectKeys = Array.isArray(snapshot.effect_keys)
    ? snapshot.effect_keys.filter(isJsonObject)
    : []
  const descriptors = effectKeys
    .map((effectKey) => {
      if (typeof effectKey.effect_string !== 'string') {
        return null
      }

      const payload = parseEffectPayload(effectKey.effect_string)
      return payload ? describeEffectPayload(payload, effectContext) : null
    })
    .filter((value): value is EffectDescriptor => Boolean(value))
  const primaryPayload =
    effectKeys.length > 0 && typeof effectKeys[0]?.effect_string === 'string'
      ? parseEffectPayload(effectKeys[0].effect_string)
      : null
  const primaryDescription =
    primaryPayload && description
      ? resolveEffectDescription(description, primaryPayload, effectContext)
      : description
  const summary =
    primaryDescription ||
    descriptors[0]?.summary ||
    null
  const detail = descriptors[0]?.detail ?? null
  const bullets = descriptors
    .map((descriptor) => descriptor.summary)
    .filter((item, index, list) => item !== summary && list.indexOf(item) === index)

  return {
    summary,
    detail,
    bullets,
  }
}

export function buildUpgradeReferenceLabel(
  upgrade: ChampionUpgradeDetail,
  locale: AppLocale,
  attackLabelById: Map<string, string>,
): string {
  if (upgrade.name) {
    return getPrimaryLocalizedText(upgrade.name, locale)
  }

  if (upgrade.specializationName) {
    return getPrimaryLocalizedText(upgrade.specializationName, locale)
  }

  if (upgrade.upgradeType === 'unlock_ultimate') {
    const payload = upgrade.effectReference ? parseEffectPayload(upgrade.effectReference) : null
    const attackLabel =
      payload?.kind === 'set_ultimate_attack' && payload.args[0]
        ? attackLabelById.get(payload.args[0]) ?? null
        : null

    return attackLabel ?? (locale === 'zh-CN' ? '终极技解锁' : 'Ultimate unlock')
  }

  if (upgrade.upgradeType === 'unlock_ability') {
    return locale === 'zh-CN' ? `能力 #${upgrade.id}` : `Ability #${upgrade.id}`
  }

  if (upgrade.upgradeType) {
    return localizeUpgradeType(upgrade.upgradeType, locale)
  }

  return locale === 'zh-CN' ? `升级 #${upgrade.id}` : `Upgrade #${upgrade.id}`
}

export function buildUpgradePresentation(
  upgrade: ChampionUpgradeDetail,
  effectContext: EffectContext,
): UpgradePresentation {
  const effectPayload = upgrade.effectReference ? parseEffectPayload(upgrade.effectReference) : null
  const validEffectDescriptor = effectPayload ? describeEffectPayload(effectPayload, effectContext) : null
  const effectDefinition = buildEffectDefinitionPresentation(upgrade.effectDefinition, effectContext)
  const typeLabel =
    upgrade.upgradeType
      ? localizeUpgradeType(upgrade.upgradeType, effectContext.locale)
      : validEffectDescriptor?.categoryLabel ?? localizeUpgradeType(null, effectContext.locale)
  const title = (() => {
    if (upgrade.name) {
      return getPrimaryLocalizedText(upgrade.name, effectContext.locale)
    }

    if (upgrade.specializationName) {
      return getPrimaryLocalizedText(upgrade.specializationName, effectContext.locale)
    }

    if (upgrade.upgradeType === 'unlock_ultimate') {
      return effectContext.locale === 'zh-CN'
        ? `解锁终极技：${validEffectDescriptor?.targetLabel ?? buildNotAvailableLabel(effectContext.locale)}`
        : `Unlock ultimate: ${validEffectDescriptor?.targetLabel ?? buildNotAvailableLabel(effectContext.locale)}`
    }

    if (upgrade.upgradeType === 'upgrade_ability' && validEffectDescriptor?.targetLabel) {
      return effectContext.locale === 'zh-CN'
        ? `强化：${validEffectDescriptor.targetLabel}`
        : `Boost: ${validEffectDescriptor.targetLabel}`
    }

    if (validEffectDescriptor?.targetLabel) {
      return effectContext.locale === 'zh-CN'
        ? `${typeLabel}：${validEffectDescriptor.targetLabel}`
        : `${typeLabel}: ${validEffectDescriptor.targetLabel}`
    }

    return effectContext.locale === 'zh-CN' ? `${typeLabel}升级` : `${typeLabel} upgrade`
  })()
  const summary =
    effectDefinition.summary ??
    validEffectDescriptor?.summary ??
    (upgrade.specializationDescription ? getPrimaryLocalizedText(upgrade.specializationDescription, effectContext.locale) : null) ??
    (upgrade.tipText ? getPrimaryLocalizedText(upgrade.tipText, effectContext.locale) : null)
  const prerequisiteLabel = upgrade.requiredUpgradeId
    ? effectContext.upgradeLabelById.get(upgrade.requiredUpgradeId) ??
      (effectContext.locale === 'zh-CN'
        ? `升级 #${upgrade.requiredUpgradeId}`
        : `Upgrade #${upgrade.requiredUpgradeId}`)
    : effectContext.locale === 'zh-CN'
      ? '无前置'
      : 'No prerequisite'
  const detailLines = [
    upgrade.specializationDescription
      ? getPrimaryLocalizedText(upgrade.specializationDescription, effectContext.locale)
      : null,
    upgrade.tipText ? getPrimaryLocalizedText(upgrade.tipText, effectContext.locale) : null,
    effectDefinition.detail,
    ...effectDefinition.bullets,
    validEffectDescriptor?.detail ?? null,
  ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value as string) === index && value !== summary)

  return {
    title,
    typeLabel,
    targetLabel: validEffectDescriptor?.targetLabel ?? null,
    targetHint: validEffectDescriptor?.targetHint ?? null,
    summary,
    detailLines,
    prerequisiteLabel,
    staticMultiplierLabel: formatMultiplierValue(upgrade.staticDpsMult, effectContext.locale),
  }
}

export function buildUpgradeCategoryMeta(typeLabel: string, locale: AppLocale): UpgradeCategoryMeta {
  const defaultCollapsedLabels =
    locale === 'zh-CN'
      ? new Set(['自身增伤', '全队增伤'])
      : new Set(['Self damage', 'Party damage'])

  return {
    key: typeLabel,
    label: typeLabel,
    defaultEnabled: !defaultCollapsedLabels.has(typeLabel),
  }
}

import type { AppLocale } from '../../app/i18n'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionRawEntry, ChampionUpgradeDetail, LocalizedText } from '../../domain/types'
import type { EffectContext, EffectDefinitionPresentation, EffectDescriptor, UpgradePresentation } from './types'
import { describeEffectPayload, buildUnavailableUpgradeLabel } from './effect-descriptor'
import { buildEffectKeyPayload, parseEffectPayload, resolveEffectDescription, sanitizeEffectText } from './effect-payload'
import { isJsonObject } from './detail-json'
import { localizeUpgradeType } from './detail-localization'
import { formatMultiplierValue } from './detail-value-formatters'

function getSanitizedLocalizedText(value: LocalizedText | null, locale: AppLocale, effectContext: EffectContext): string | null {
  if (!value) {
    return null
  }

  return sanitizeEffectText(getPrimaryLocalizedText(value, locale), effectContext)
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

  const snapshot = effectContext.locale === 'zh-CN' ? entry.snapshots.display : entry.snapshots.original

  if (!isJsonObject(snapshot)) {
    return {
      summary: null,
      detail: null,
      bullets: [],
    }
  }

  const descriptionValue = snapshot.description
  let description: string | null = null
  if (isJsonObject(descriptionValue) && typeof descriptionValue.desc === 'string') {
    description = descriptionValue.desc
  } else if (typeof descriptionValue === 'string') {
    description = descriptionValue
  }
  const effectKeys = Array.isArray(snapshot.effect_keys) ? snapshot.effect_keys.filter(isJsonObject) : []
  const payloads = effectKeys.map((effectKey) => buildEffectKeyPayload(effectKey)).filter((value): value is NonNullable<typeof value> => Boolean(value))
  const descriptors = payloads
    .map((payload) => describeEffectPayload(payload, effectContext, payloads))
    .filter((value): value is EffectDescriptor => Boolean(value))
  const readableDescriptors = descriptors.filter((descriptor) => !descriptor.isRawEffectKindFallback)
  const primaryPayload = payloads[0] ?? null
  const primaryDescription =
    primaryPayload && description != null && description !== ''
      ? resolveEffectDescription(description, primaryPayload, effectContext, payloads)
      : description
  const summary = [primaryDescription, readableDescriptors[0]?.summary].find(
    (value): value is string => value != null && value !== '',
  ) ?? null
  const detail = readableDescriptors[0]?.detail ?? null
  const bullets = readableDescriptors
    .map((descriptor) => descriptor.summary)
    .filter((item, index, list) => item !== summary && list.indexOf(item) === index)

  return {
    summary,
    detail,
    bullets,
  }
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- 升级标签构建，多类型分支
export function buildUpgradeReferenceLabel(
  upgrade: ChampionUpgradeDetail,
  locale: AppLocale,
  attackLabelById: Map<string, string>,
): string {
  if (upgrade.name) {
    return sanitizeEffectText(getPrimaryLocalizedText(upgrade.name, locale), {
      locale,
      attackLabelById,
      championName: '',
      upgradeLabelById: new Map<string, string>(),
    })
  }

  if (upgrade.specializationName) {
    return sanitizeEffectText(getPrimaryLocalizedText(upgrade.specializationName, locale), {
      locale,
      attackLabelById,
      championName: '',
      upgradeLabelById: new Map<string, string>(),
    })
  }

  if (upgrade.upgradeType === 'unlock_ultimate') {
    const payload =
      upgrade.effectReference != null && upgrade.effectReference !== ''
        ? parseEffectPayload(upgrade.effectReference)
        : null
    let attackLabel: string | null = null
    if (payload?.kind === 'set_ultimate_attack' && payload.args[0] != null && payload.args[0] !== '') {
      attackLabel = attackLabelById.get(payload.args[0]) ?? null
    }

    return attackLabel ?? (locale === 'zh-CN' ? '终极技解锁' : 'Ultimate unlock')
  }

  if (upgrade.upgradeType === 'unlock_ability') {
    return locale === 'zh-CN' ? `能力 #${upgrade.id}` : `Ability #${upgrade.id}`
  }

  if (upgrade.upgradeType != null && upgrade.upgradeType !== '') {
    return localizeUpgradeType(upgrade.upgradeType, locale)
  }

  return locale === 'zh-CN' ? `升级 #${upgrade.id}` : `Upgrade #${upgrade.id}`
}

// eslint-disable-next-line complexity, sonarjs/max-lines-per-function -- 展示模型构建，自然条件分支
export function buildUpgradePresentation(
  upgrade: ChampionUpgradeDetail,
  effectContext: EffectContext,
): UpgradePresentation {
  const effectPayload =
    upgrade.effectReference != null && upgrade.effectReference !== ''
      ? parseEffectPayload(upgrade.effectReference)
      : null
  const validEffectDescriptor = effectPayload ? describeEffectPayload(effectPayload, effectContext) : null
  const readableEffectDescriptor =
    validEffectDescriptor && !validEffectDescriptor.isRawEffectKindFallback ? validEffectDescriptor : null
  const effectDefinition = buildEffectDefinitionPresentation(upgrade.effectDefinition, effectContext)
  const typeLabel =
    upgrade.upgradeType != null && upgrade.upgradeType !== ''
      ? localizeUpgradeType(upgrade.upgradeType, effectContext.locale)
      : validEffectDescriptor?.categoryLabel ?? localizeUpgradeType(null, effectContext.locale)
  // eslint-disable-next-line complexity -- title 多分支构建
  const title = (() => {
    if (upgrade.name) {
      return getSanitizedLocalizedText(upgrade.name, effectContext.locale, effectContext) ?? buildUnavailableUpgradeLabel(effectContext.locale)
    }

    if (upgrade.specializationName) {
      return getSanitizedLocalizedText(upgrade.specializationName, effectContext.locale, effectContext) ?? buildUnavailableUpgradeLabel(effectContext.locale)
    }

    if (upgrade.upgradeType === 'unlock_ultimate') {
      return effectContext.locale === 'zh-CN'
        ? `解锁终极技：${validEffectDescriptor?.targetLabel ?? buildUnavailableUpgradeLabel(effectContext.locale)}`
        : `Unlock ultimate: ${validEffectDescriptor?.targetLabel ?? buildUnavailableUpgradeLabel(effectContext.locale)}`
    }

    if (upgrade.upgradeType === 'upgrade_ability' && validEffectDescriptor?.targetLabel != null && validEffectDescriptor.targetLabel !== '') {
      return effectContext.locale === 'zh-CN' ? `强化：${validEffectDescriptor.targetLabel}` : `Boost: ${validEffectDescriptor.targetLabel}`
    }

    if (validEffectDescriptor?.targetLabel != null && validEffectDescriptor.targetLabel !== '') {
      return effectContext.locale === 'zh-CN' ? `${typeLabel}：${validEffectDescriptor.targetLabel}` : `${typeLabel}: ${validEffectDescriptor.targetLabel}`
    }

    return effectContext.locale === 'zh-CN' ? `${typeLabel}升级` : `${typeLabel} upgrade`
  })()
  const summary =
    effectDefinition.summary ??
    readableEffectDescriptor?.summary ??
    getSanitizedLocalizedText(upgrade.specializationDescription, effectContext.locale, effectContext) ??
    getSanitizedLocalizedText(upgrade.tipText, effectContext.locale, effectContext)
  const fallbackPrerequisiteLabel = effectContext.locale === 'zh-CN' ? '无前置' : 'No prerequisite'
  let prerequisiteLabel: string
  if (upgrade.requiredUpgradeId != null && upgrade.requiredUpgradeId !== '') {
    prerequisiteLabel = effectContext.upgradeLabelById.get(upgrade.requiredUpgradeId)
      ?? (effectContext.locale === 'zh-CN' ? `升级 #${upgrade.requiredUpgradeId}` : `Upgrade #${upgrade.requiredUpgradeId}`)
  } else {
    prerequisiteLabel = fallbackPrerequisiteLabel
  }
  const detailLines = [
    getSanitizedLocalizedText(upgrade.specializationDescription, effectContext.locale, effectContext),
    getSanitizedLocalizedText(upgrade.tipText, effectContext.locale, effectContext),
    effectDefinition.detail,
    ...effectDefinition.bullets,
    readableEffectDescriptor?.detail ?? null,
  ].filter(
    (value, index, list): value is string => Boolean(value) && list.indexOf(value as string) === index && value !== summary,
  )

  return {
    title,
    typeLabel,
    summary,
    detailLines,
    prerequisiteLabel,
    targetLabel: validEffectDescriptor?.targetLabel ?? null,
    targetHint: validEffectDescriptor?.targetHint ?? null,
    staticMultiplierLabel: formatMultiplierValue(upgrade.staticDpsMult, effectContext.locale),
  }
}

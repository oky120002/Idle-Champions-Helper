import type { AppLocale } from '../../app/i18n'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionRawEntry, ChampionUpgradeDetail } from '../../domain/types'
import type { EffectContext, EffectDefinitionPresentation, EffectDescriptor, UpgradePresentation } from './types'
import { describeEffectPayload, buildUnavailableUpgradeLabel } from './effect-descriptor'
import { parseEffectPayload, resolveEffectDescription } from './effect-payload'
import { isJsonObject } from './detail-json'
import { localizeUpgradeType } from './detail-localization'
import { formatMultiplierValue } from './detail-value-formatters'

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
  const description =
    isJsonObject(descriptionValue) && typeof descriptionValue.desc === 'string'
      ? descriptionValue.desc
      : typeof descriptionValue === 'string'
        ? descriptionValue
        : null
  const effectKeys = Array.isArray(snapshot.effect_keys) ? snapshot.effect_keys.filter(isJsonObject) : []
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
  const primaryDescription = primaryPayload && description ? resolveEffectDescription(description, primaryPayload, effectContext) : description
  const summary = primaryDescription || descriptors[0]?.summary || null
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
        ? `解锁终极技：${validEffectDescriptor?.targetLabel ?? buildUnavailableUpgradeLabel(effectContext.locale)}`
        : `Unlock ultimate: ${validEffectDescriptor?.targetLabel ?? buildUnavailableUpgradeLabel(effectContext.locale)}`
    }

    if (upgrade.upgradeType === 'upgrade_ability' && validEffectDescriptor?.targetLabel) {
      return effectContext.locale === 'zh-CN' ? `强化：${validEffectDescriptor.targetLabel}` : `Boost: ${validEffectDescriptor.targetLabel}`
    }

    if (validEffectDescriptor?.targetLabel) {
      return effectContext.locale === 'zh-CN' ? `${typeLabel}：${validEffectDescriptor.targetLabel}` : `${typeLabel}: ${validEffectDescriptor.targetLabel}`
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
      (effectContext.locale === 'zh-CN' ? `升级 #${upgrade.requiredUpgradeId}` : `Upgrade #${upgrade.requiredUpgradeId}`)
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
  ].filter(
    (value, index, list): value is string => Boolean(value) && list.indexOf(value as string) === index && value !== summary,
  )

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

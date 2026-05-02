import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionDetail } from '../../domain/types'
import type { AppLocale } from '../../app/i18n'
import type { EffectContext, UpgradePresentation } from './types'
import { buildUpgradePresentation, buildUpgradeReferenceLabel } from './effect-model'

export function buildAttackLabelById(detail: ChampionDetail | null, locale: AppLocale): Map<string, string> {
  if (!detail) {
    return new Map<string, string>()
  }

  const nextMap = new Map<string, string>()

  detail.raw.attacks.forEach((attackEntry) => {
    const snapshot = locale === 'zh-CN' ? attackEntry.snapshots.display : attackEntry.snapshots.original

    if (
      snapshot &&
      typeof snapshot === 'object' &&
      !Array.isArray(snapshot) &&
      typeof snapshot.id === 'number' &&
      typeof snapshot.name === 'string'
    ) {
      nextMap.set(String(snapshot.id), snapshot.name)
    }
  })

  return nextMap
}

export function buildUpgradeLabelById(
  detail: ChampionDetail | null,
  locale: AppLocale,
  attackLabelById: Map<string, string>,
): Map<string, string> {
  if (!detail) {
    return new Map<string, string>()
  }

  return new Map(
    detail.upgrades.map((upgrade) => [upgrade.id, buildUpgradeReferenceLabel(upgrade, locale, attackLabelById)]),
  )
}

export function buildEffectContext(
  detail: ChampionDetail | null,
  locale: AppLocale,
  attackLabelById: Map<string, string>,
  upgradeLabelById: Map<string, string>,
): EffectContext | null {
  if (!detail) {
    return null
  }

  return {
    locale,
    championName: getPrimaryLocalizedText(detail.summary.name, locale),
    attackLabelById,
    upgradeLabelById,
  }
}

export function buildUpgradePresentations(
  detail: ChampionDetail | null,
  effectContext: EffectContext | null,
): Map<string, UpgradePresentation> {
  if (!detail || !effectContext) {
    return new Map<string, UpgradePresentation>()
  }

  return new Map(detail.upgrades.map((upgrade) => [upgrade.id, buildUpgradePresentation(upgrade, effectContext)]))
}

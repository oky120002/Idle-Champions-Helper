import type { ChampionDetail, ChampionUpgradeDetail } from '../../domain/types'
import { isJsonObject } from './detail-json'
import { buildUpgradePresentation, parseEffectPayload } from './effect-model'
import type {
  EffectContext,
  SpecializationUpgradeColumn,
  SpecializationUpgradeEntry,
  UpgradePresentation,
} from './types'

function extractTargetIdsFromEffectString(effectString: string): string[] {
  const payload = parseEffectPayload(effectString)

  if (!payload) {
    return []
  }

  const { kind, args } = payload

  if (
    kind === 'buff_upgrade' ||
    kind === 'buff_upgrade_add_flat_amount' ||
    kind === 'buff_upgrade_effect_stacks_max_mult' ||
    kind === 'buff_upgrade_per_any_tagged_crusader_mult' ||
    kind === 'change_upgrade_data' ||
    kind === 'change_upgrade_targets'
  ) {
    return [args[1] ?? args[0]].filter((value): value is string => Boolean(value))
  }

  if (kind === 'buff_upgrades' || kind === 'damage_buff_on_upgrade_tag_targets') {
    return args.slice(1)
  }

  if (kind === 'buff_upgrade_per_any_tagged_crusader') {
    return [args[1]].filter((value): value is string => Boolean(value))
  }

  return []
}

function collectEffectStrings(value: unknown, effectStrings: string[], depth = 0): void {
  if (depth > 5 || value == null) {
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectEffectStrings(item, effectStrings, depth + 1))
    return
  }

  if (!isJsonObject(value)) {
    return
  }

  if (typeof value.effect_string === 'string') {
    effectStrings.push(value.effect_string)
  }

  Object.values(value).forEach((item) => collectEffectStrings(item, effectStrings, depth + 1))
}

function buildUpgradeTargetIdMap(detail: ChampionDetail): Map<string, Set<string>> {
  const targetIdMap = new Map<string, Set<string>>()

  detail.upgrades.forEach((upgrade) => {
    const effectStrings: string[] = []

    if (upgrade.effectReference) {
      effectStrings.push(upgrade.effectReference)
    }

    if (upgrade.effectDefinition) {
      collectEffectStrings(upgrade.effectDefinition, effectStrings)
    }

    const targetIds = new Set(effectStrings.flatMap(extractTargetIdsFromEffectString))

    if (targetIds.size > 0) {
      targetIdMap.set(upgrade.id, targetIds)
    }
  })

  return targetIdMap
}

function compareUpgradesByLevel(left: ChampionUpgradeDetail, right: ChampionUpgradeDetail): number {
  const leftLevel = left.requiredLevel ?? Number.MAX_SAFE_INTEGER
  const rightLevel = right.requiredLevel ?? Number.MAX_SAFE_INTEGER

  if (leftLevel !== rightLevel) {
    return leftLevel - rightLevel
  }

  const leftId = Number(left.id)
  const rightId = Number(right.id)

  if (Number.isFinite(leftId) && Number.isFinite(rightId)) {
    return leftId - rightId
  }

  return left.id.localeCompare(right.id)
}

function isSpecializationSeed(upgrade: ChampionUpgradeDetail): boolean {
  return Boolean(upgrade.specializationName || upgrade.specializationGraphicId)
}

function isHiddenProgressionUpgrade(upgrade: ChampionUpgradeDetail): boolean {
  return upgrade.requiredLevel === 9999 || upgrade.requiredUpgradeId === '9999'
}

function normalizeGraphicId(graphicId: string | null | undefined): string | null {
  const trimmedGraphicId = graphicId?.trim()

  return trimmedGraphicId && trimmedGraphicId !== '0' ? trimmedGraphicId : null
}

function resolveUpgradeIconGraphicId(detail: ChampionDetail, upgrade: ChampionUpgradeDetail): string | null {
  const specializationGraphicId = normalizeGraphicId(upgrade.specializationGraphicId)

  if (specializationGraphicId) {
    return specializationGraphicId
  }

  if (upgrade.upgradeType !== 'unlock_ultimate') {
    return null
  }

  const payload = upgrade.effectReference ? parseEffectPayload(upgrade.effectReference) : null

  if (payload?.kind !== 'set_ultimate_attack') {
    return normalizeGraphicId(detail.attacks.ultimate?.graphicId)
  }

  const attackId = payload.args[0]

  if (attackId && detail.attacks.ultimate?.id !== attackId) {
    return null
  }

  return normalizeGraphicId(detail.attacks.ultimate?.graphicId)
}

export function buildSpecializationUpgradeColumns(
  detail: ChampionDetail | null,
  spotlightUpgrades: ChampionUpgradeDetail[],
  effectContext: EffectContext | null,
  upgradePresentations: Map<string, UpgradePresentation>,
): SpecializationUpgradeColumn[] {
  if (!detail || !effectContext) {
    return []
  }

  const targetIdMap = buildUpgradeTargetIdMap(detail)
  const sortedSpotlightUpgrades = [...spotlightUpgrades]
    .filter((upgrade) => !isHiddenProgressionUpgrade(upgrade))
    .sort(compareUpgradesByLevel)
  const columnSeeds = sortedSpotlightUpgrades.filter(isSpecializationSeed)

  return columnSeeds.map((seed) => {
    const entryMap = new Map<string, SpecializationUpgradeEntry>()
    const seedPresentation = upgradePresentations.get(seed.id) ?? buildUpgradePresentation(seed, effectContext)

    sortedSpotlightUpgrades.forEach((upgrade) => {
      if (isSpecializationSeed(upgrade) && upgrade.id !== seed.id) {
        return
      }

      entryMap.set(upgrade.id, {
        upgrade,
        presentation: upgradePresentations.get(upgrade.id) ?? buildUpgradePresentation(upgrade, effectContext),
        relation: upgrade.id === seed.id ? 'primary' : 'related',
        iconGraphicId: resolveUpgradeIconGraphicId(detail, upgrade),
      })
    })

    detail.upgrades.forEach((upgrade) => {
      if (upgrade.id === seed.id || entryMap.has(upgrade.id) || isHiddenProgressionUpgrade(upgrade)) {
        return
      }

      const targetIds = targetIdMap.get(upgrade.id)
      const isRelated = upgrade.requiredUpgradeId === seed.id || targetIds?.has(seed.id)

      if (!isRelated) {
        return
      }

      entryMap.set(upgrade.id, {
        upgrade,
        presentation: upgradePresentations.get(upgrade.id) ?? buildUpgradePresentation(upgrade, effectContext),
        relation: 'related',
        iconGraphicId: resolveUpgradeIconGraphicId(detail, upgrade),
      })
    })

    const entries = Array.from(entryMap.values()).sort((left, right) =>
      compareUpgradesByLevel(left.upgrade, right.upgrade),
    )

    return {
      key: seed.id,
      title: seedPresentation.title,
      typeLabel: seedPresentation.typeLabel,
      summary: seedPresentation.summary,
      detailLines: seedPresentation.detailLines,
      targetLabel: seedPresentation.targetLabel,
      staticMultiplierLabel: seedPresentation.staticMultiplierLabel,
      prerequisiteLabel: seedPresentation.prerequisiteLabel,
      specializationGraphicId: seed.specializationGraphicId,
      entries,
    }
  })
}

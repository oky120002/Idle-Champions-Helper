export interface ChampionSimulationProfile {
  englishName: string
  upgrades: unknown[]
  feats: unknown[]
  loot: unknown[]
  legendaryEffects: unknown[]
  rawEffectStrings: string[]
  unsupportedEffects: string[]
}

const KNOWN_EFFECT_PREFIXES = new Set([
  'global_dps_multiplier_mult',
  'hero_dps_multiplier_mult',
])

export function projectChampionSimulationProfile(
  detail: Record<string, unknown>,
): ChampionSimulationProfile {
  const rawEffects = extractRawEffectStrings(detail)

  const rawEffectStrings: string[] = []
  const unsupportedEffects: string[] = []

  for (const effect of rawEffects) {
    if (isKnownEffect(effect)) {
      rawEffectStrings.push(effect)
    } else {
      unsupportedEffects.push(effect)
    }
  }

  return {
    englishName: (detail.englishName as string) ?? 'Unknown',
    upgrades: detail.upgrades as unknown[] ?? [],
    feats: detail.feats as unknown[] ?? [],
    loot: detail.loot as unknown[] ?? [],
    legendaryEffects: detail.legendaryEffects as unknown[] ?? [],
    rawEffectStrings,
    unsupportedEffects,
  }
}

function extractRawEffectStrings(detail: Record<string, unknown>): string[] {
  const effects: string[] = []

  // Extract from upgrades
  const upgrades = (detail.upgrades as Array<Record<string, unknown>>) ?? []
  for (const upgrade of upgrades) {
    if (typeof upgrade.effectReference === 'string') {
      effects.push(upgrade.effectReference)
    }
  }

  // Extract from raw effects array if present
  const rawEffects = detail.rawEffects as string[] | undefined
  if (rawEffects) {
    effects.push(...rawEffects)
  }

  return effects
}

function isKnownEffect(effect: string): boolean {
  for (const prefix of KNOWN_EFFECT_PREFIXES) {
    if (effect.startsWith(prefix)) return true
  }
  return false
}

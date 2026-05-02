/** Fallback unlock level when no specialization upgrades exist. */
export const SPECIALIZATION_FALLBACK_LEVEL = 1

export interface SpecializationUpgrade {
  requiredLevel: number
  upgradeType: string
}

export interface SpecializationBaselineResult {
  baseline: number
  usedFallback: boolean
  warnings: string[]
}

export function extractSpecializationBaseline(
  upgrades: SpecializationUpgrade[],
): SpecializationBaselineResult {
  const warnings: string[] = []
  const specLevels = upgrades
    .filter((u) => u.upgradeType === 'specialization')
    .map((u) => u.requiredLevel)

  if (specLevels.length === 0) {
    return {
      baseline: SPECIALIZATION_FALLBACK_LEVEL,
      usedFallback: true,
      warnings,
    }
  }

  const validLevels: number[] = []
  for (const level of specLevels) {
    if (!Number.isFinite(level) || level < 0 || !Number.isInteger(level)) {
      warnings.push(`Ignoring invalid specialization level: ${level}`)
      continue
    }
    validLevels.push(level)
  }

  if (validLevels.length === 0) {
    return {
      baseline: SPECIALIZATION_FALLBACK_LEVEL,
      usedFallback: true,
      warnings,
    }
  }

  return {
    baseline: Math.max(...validLevels),
    usedFallback: false,
    warnings,
  }
}

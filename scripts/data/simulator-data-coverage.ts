/**
 * Simulator data coverage report — audits which definition keys are covered
 * by the simulator and which need further normalization work.
 */

interface CoverageEntry {
  key: string
  status: 'covered' | 'uncovered'
  usefulness: string
  currentOutput: string
  nextAction: string
  reviewNeeded?: boolean
}

interface KnownUsefulKey {
  usefulness: string
  currentOutput: string
  nextAction: string
}

const KNOWN_USEFUL_KEYS: Record<string, KnownUsefulKey> = {
  hero_id: { usefulness: 'high', currentOutput: 'hero id string', nextAction: 'used in owned hero projection' },
  level: { usefulness: 'high', currentOutput: 'hero level number', nextAction: 'used in level baseline' },
  upgrades: { usefulness: 'high', currentOutput: 'upgrade array', nextAction: 'extract specialization levels' },
  feats: { usefulness: 'high', currentOutput: 'feat array', nextAction: 'extract feat effects' },
  loot: { usefulness: 'high', currentOutput: 'loot array', nextAction: 'extract equipment rarity' },
  legendary_effects: { usefulness: 'medium', currentOutput: 'legendary array', nextAction: 'extract legendary effect modifiers' },
  attacks: { usefulness: 'low', currentOutput: 'attack array', nextAction: 'evaluate for DPS calculation' },
  skins: { usefulness: 'none', currentOutput: 'skin array', nextAction: 'skip for simulator' },
}

/**
 * Generate a coverage report for simulator data keys.
 */
export function generateCoverageReport(
  definitionKeys: string[],
  coveredKeys: Set<string>,
): CoverageEntry[] {
  return definitionKeys.map((key): CoverageEntry => {
    const known = KNOWN_USEFUL_KEYS[key]

    if (coveredKeys.has(key)) {
      return {
        key,
        status: 'covered',
        usefulness: known?.usefulness ?? 'unknown',
        currentOutput: known?.currentOutput ?? 'present in output',
        nextAction: known?.nextAction ?? 'verify usage',
      }
    }

    return {
      key,
      status: 'uncovered',
      usefulness: known?.usefulness ?? 'unknown',
      currentOutput: 'not yet used',
      nextAction: known?.nextAction ?? 'evaluate for inclusion',
      reviewNeeded: !known,
    }
  })
}

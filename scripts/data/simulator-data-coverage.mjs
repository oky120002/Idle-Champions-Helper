/**
 * Simulator data coverage report — audits which definition keys are covered
 * by the simulator and which need further normalization work.
 */

/** @typedef {{key: string, status: 'covered' | 'uncovered', usefulness: string, currentOutput: string, nextAction: string, reviewNeeded?: boolean}} CoverageEntry */

const KNOWN_USEFUL_KEYS = {
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
 *
 * @param {string[]} definitionKeys - All keys found in the definition data.
 * @param {Set<string>} coveredKeys - Keys that the simulator already uses.
 * @returns {CoverageEntry[]}
 */
export function generateCoverageReport(definitionKeys, coveredKeys) {
  return definitionKeys.map((key) => {
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

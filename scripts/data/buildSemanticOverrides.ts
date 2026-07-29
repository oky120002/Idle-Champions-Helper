import { asRecord } from './io-utils.ts'

interface SemanticOverrideItem {
  heroId: string
  carrySignals: unknown[] | undefined
  supportSignals: unknown[] | undefined
  unsupportedSignals: unknown[] | undefined
}

interface SemanticOverridesModel {
  items: SemanticOverrideItem[]
  updatedAt: string
}

export function normalizeSemanticOverrides(
  rawOverrides: unknown,
  updatedAt: string,
): SemanticOverridesModel {
  const overridesRecord = asRecord(rawOverrides) ?? {}
  const heroOverridesRecord = asRecord(overridesRecord.heroOverrides) ?? {}
  const items: SemanticOverrideItem[] = Object.entries(heroOverridesRecord).map(([heroId, patch]) => {
    const patchRecord = asRecord(patch) ?? {}
    return {
      heroId,
      carrySignals: Array.isArray(patchRecord.carrySignals) ? patchRecord.carrySignals : undefined,
      supportSignals: Array.isArray(patchRecord.supportSignals) ? patchRecord.supportSignals : undefined,
      unsupportedSignals: Array.isArray(patchRecord.unsupportedSignals) ? patchRecord.unsupportedSignals : undefined,
    }
  })

  return {
    items,
    updatedAt,
  }
}

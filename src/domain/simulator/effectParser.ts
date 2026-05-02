export type ParsedEffectOk = {
  ok: true
  kind: 'globalDpsMultiplier' | 'heroDpsMultiplier' | 'adjacentBuff' | 'taggedChampionBuff'
  value: number
}

export type ParsedEffectUnsupported = {
  ok: false
  kind: 'unsupported'
  rawEffect: string
  rawValue: string
  note: string
}

export type ParsedEffect = ParsedEffectOk | ParsedEffectUnsupported

export function parseEffect(effectName: string, effectValue: string): ParsedEffect {
  const numericValue = parseFloat(effectValue)

  if (effectName === 'global_dps_multiplier_mult') {
    return { ok: true, kind: 'globalDpsMultiplier', value: numericValue }
  }

  if (effectName === 'hero_dps_multiplier_mult') {
    return { ok: true, kind: 'heroDpsMultiplier', value: numericValue }
  }

  if (effectName.startsWith('adjacent_')) {
    return { ok: true, kind: 'adjacentBuff', value: numericValue }
  }

  if (effectName.startsWith('tag_')) {
    return { ok: true, kind: 'taggedChampionBuff', value: numericValue }
  }

  return {
    ok: false,
    kind: 'unsupported',
    rawEffect: effectName,
    rawValue: effectValue,
    note: `No parser for effect: ${effectName}`,
  }
}

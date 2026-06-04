export function normalizePlannerEffectSignal(effectName, effectValue, source) {
  const numericValue = parseFloat(effectValue)

  if (effectName === 'global_dps_multiplier_mult') {
    return {
      ok: true,
      signal: { kind: 'globalDpsMultiplier', value: numericValue, rawEffect: `${effectName},${effectValue}`, source },
      bucket: 'supportSignals',
    }
  }

  if (effectName === 'hero_dps_multiplier_mult') {
    return {
      ok: true,
      signal: { kind: 'heroDpsMultiplier', value: numericValue, rawEffect: `${effectName},${effectValue}`, source },
      bucket: 'carrySignals',
    }
  }

  if (effectName.startsWith('adjacent_')) {
    return {
      ok: true,
      signal: { kind: 'adjacentBuff', value: numericValue, rawEffect: `${effectName},${effectValue}`, source },
      bucket: 'supportSignals',
    }
  }

  if (effectName.startsWith('tag_')) {
    return {
      ok: true,
      signal: { kind: 'taggedChampionBuff', value: numericValue, rawEffect: `${effectName},${effectValue}`, source },
      bucket: 'supportSignals',
    }
  }

  return {
    ok: false,
    unsupported: {
      rawEffect: effectName,
      rawValue: effectValue,
      note: `No parser for effect: ${effectName}`,
      source,
    },
  }
}

export function splitPlannerEffectString(effectString) {
  if (typeof effectString !== 'string' || effectString.trim().length === 0) {
    return null
  }

  const [effectName, effectValue = '1'] = effectString.split(',', 2)
  return { effectName, effectValue }
}

export function collectPlannerEffectEntries(detail) {
  const effectEntries = []

  for (const upgrade of detail.upgrades ?? []) {
    if (typeof upgrade.effectReference === 'string') {
      effectEntries.push({ effectString: upgrade.effectReference, effect: upgrade, sourceBucket: 'upgrade' })
    }

    const effectKeys = upgrade.effectDefinition?.snapshots?.original?.effect_keys
    if (Array.isArray(effectKeys)) {
      for (const effectKey of effectKeys) {
        if (typeof effectKey?.effect_string === 'string') {
          effectEntries.push({ effectString: effectKey.effect_string, effect: effectKey, sourceBucket: 'upgrade-effect-key' })
        }
      }
    }
  }

  for (const lootItem of detail.loot ?? []) {
    for (const effect of lootItem.effects ?? []) {
      if (typeof effect?.effect_string === 'string') {
        effectEntries.push({ effectString: effect.effect_string, effect, sourceBucket: 'loot' })
      }
    }
  }

  for (const legendaryEffect of detail.legendaryEffects ?? []) {
    for (const effect of legendaryEffect.effects ?? []) {
      if (typeof effect?.effect_string === 'string') {
        effectEntries.push({ effectString: effect.effect_string, effect, sourceBucket: 'legendary' })
      }
    }
  }

  return effectEntries
}

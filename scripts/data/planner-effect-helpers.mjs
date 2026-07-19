import {
  buildEffectKeyPayload,
  extractTargetIdsFromParsedEffectPayload,
  parseEffectPayload,
  resolveEffectPayloadAmountToken,
} from '../../src/domain/effects/effect-string.js'
import {
  attachSignalSemantics,
  normalizeExplicitTargeting,
  normalizeStatQualifiers,
  normalizeTargetQualifier,
  parsePerHeroExpr,
} from '../../src/domain/abilities/signalSemantics.js'

function resolvePlannerNumericValue(effectValue, effectPayload, effectPayloads) {
  if (typeof effectPayload?.meta?.amount_expr === 'string') {
    const resolved = resolveEffectPayloadAmountToken(effectPayload, effectPayloads ?? [effectPayload])
    const resolvedValue = resolved === null ? Number.NaN : parseFloat(String(resolved))

    if (Number.isFinite(resolvedValue)) {
      return resolvedValue
    }
  }

  return parseFloat(effectValue)
}

function buildPlannerRawEffect(effectName, effectValue, effectPayload) {
  return effectPayload?.effectString ?? `${effectName},${effectValue}`
}

function resolvePlannerBucket(effect) {
  const explicitTargeting = normalizeExplicitTargeting(effect)

  if (explicitTargeting.status === 'unsupported') {
    return {
      ok: false,
      note: explicitTargeting.note,
    }
  }

  return {
    ok: true,
    bucket:
      explicitTargeting.status === 'supported' && explicitTargeting.relation !== 'self'
        ? 'supportSignals'
        : 'carrySignals',
  }
}

function resolvePlannerCountRelation(rawTarget) {
  const targeting = normalizeExplicitTargeting({ targets: [rawTarget] })

  if (targeting.status !== 'supported' || targeting.relation === 'any') {
    return null
  }

  return targeting.relation
}

function parsePlannerTagQualifierFromArg(rawValue) {
  if (typeof rawValue !== 'string') {
    return null
  }

  const requiredTags = rawValue
    .split('|')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)

  if (requiredTags.length === 0) {
    return null
  }

  return {
    requiredTags: [...new Set(requiredTags)],
    matchMode: 'any',
  }
}

function buildPlannerEffectEntry({
  effectString,
  effect,
  effectPayload,
  effectPayloads = [],
  sourceBucket,
  upgradeId = null,
  signalPreset = null,
  bucketOverride = null,
}) {
  return {
    effectString,
    effect,
    effectPayload,
    effectPayloads,
    sourceBucket,
    upgradeId,
    signalPreset,
    bucketOverride,
  }
}

function isAnyPlannerBuffUpgradeWrapperKind(kind) {
  return kind === 'buff_upgrades'
    || (typeof kind === 'string' && kind.startsWith('buff_upgrade'))
}

function isPlannerBuffUpgradeKind(kind) {
  return kind === 'buff_upgrade'
    || kind === 'buff_upgrades'
    || kind === 'buff_upgrade_per_any_tagged_crusader_mult'
    || kind === 'buff_upgrade_per_target_crusader'
    || kind === 'buff_upgrade_per_any_crusader_where_mult'
    || kind === 'buff_upgrade_mult_by_distance_from_source'
    || kind === 'buff_upgrade_mult_by_distance_from_source_mult'
}

export function shouldIgnorePlannerUnsupportedEffectEntry(entry, rawEffect) {
  if (rawEffect === 'effect_def') {
    return true
  }

  if (entry?.sourceBucket !== 'upgrade-effect-key') {
    return false
  }

  return rawEffect === 'buff_upgrade'
    || rawEffect === 'buff_upgrades'
    || rawEffect === 'buff_upgrade_per_any_tagged_crusader_mult'
    || rawEffect === 'buff_upgrade_per_target_crusader'
    || rawEffect === 'buff_upgrade_per_any_crusader_where_mult'
    || rawEffect === 'buff_upgrade_mult_by_distance_from_source'
    || rawEffect === 'buff_upgrade_mult_by_distance_from_source_mult'
}

function resolvePlannerTargetUpgradeIds(payload) {
  if (!payload) {
    return []
  }

  if (payload.kind === 'buff_upgrade_per_target_crusader') {
    return [payload.args[1]].filter(Boolean)
  }

  return extractTargetIdsFromParsedEffectPayload(payload)
}

function parsePlannerWhereQualifierFromArgs(compare, comparison, check) {
  if (
    typeof compare !== 'string'
    || typeof comparison !== 'string'
    || (typeof check !== 'string' && typeof check !== 'number')
  ) {
    return null
  }

  const normalizedCompare = compare.trim().toLowerCase()
  const normalizedComparison = comparison.trim()
  const numericCheck = Number(check)

  if (normalizedCompare === 'age' || normalizedCompare === 'base_attack_cooldown') {
    return parsePerHeroExpr(`${normalizedCompare}${normalizedComparison}${check}`)
  }

  if (!Number.isFinite(numericCheck)) {
    return null
  }

  const requiredStats = normalizeStatQualifiers({
    target_filters: [
      {
        type: 'stat',
        stat: normalizedCompare,
        comparison: normalizedComparison,
        check: numericCheck,
      },
    ],
  })

  if (!requiredStats) {
    return null
  }

  return { requiredStats }
}

function resolvePlannerBuffUpgradeSeed(entry) {
  const payload = entry.effectPayload
  if (!payload) {
    return null
  }

  if (payload.kind === 'buff_upgrade' || payload.kind === 'buff_upgrades') {
    return {}
  }

  if (payload.kind === 'buff_upgrade_per_any_tagged_crusader_mult') {
    const formationCountQualifier = parsePlannerTagQualifierFromArg(payload.args[2] ?? null)
    if (!formationCountQualifier) {
      return null
    }

    return {
      amountFunc: 'mult',
      stackFunc: 'per_tagged_crusader_mult',
      formationCountQualifier,
    }
  }

  if (payload.kind === 'buff_upgrade_per_any_crusader_where_mult') {
    const formationCountQualifier = parsePlannerWhereQualifierFromArgs(
      payload.args[2] ?? null,
      payload.args[3] ?? null,
      payload.args[4] ?? null,
    )
    if (!formationCountQualifier) {
      return null
    }

    return {
      amountFunc: 'mult',
      stackFunc: 'per_crusader',
      formationCountQualifier,
    }
  }

  if (payload.kind === 'buff_upgrade_per_target_crusader') {
    const countRelation = resolvePlannerCountRelation(payload.args[2] ?? null)
    if (!countRelation) {
      return null
    }

    return {
      amountFunc: 'add',
      stackFunc: 'per_target_crusader',
      formationCountPositionQualifier: { relation: countRelation },
    }
  }

  if (payload.kind === 'buff_upgrade_mult_by_distance_from_source') {
    return {
      amountFunc: 'add',
      stackFunc: 'per_slot_distance_from_source',
    }
  }

  if (payload.kind === 'buff_upgrade_mult_by_distance_from_source_mult') {
    return {
      amountFunc: 'mult',
      stackFunc: 'per_slot_distance_from_source',
    }
  }

  return null
}

function resolvePlannerEntrySignal(entry) {
  if (entry.signalPreset) {
    return {
      ok: true,
      signal: entry.signalPreset,
      bucket: entry.bucketOverride ?? 'supportSignals',
    }
  }

  const split = splitPlannerEffectString(entry.effectString)
  if (!split) {
    return null
  }

  const parsed = normalizePlannerEffectSignal(
    split.effectName,
    split.effectValue,
    'official-parsed',
    entry,
  )

  if (!parsed.ok) {
    return parsed
  }

  return {
    ok: true,
    signal: attachSignalSemantics(parsed.signal, entry.effect),
    bucket: parsed.bucket,
  }
}

function collectPlannerRawEffectEntries(detail) {
  const effectEntries = []
  const upgradeEffectEntriesById = new Map()

  for (const upgrade of detail.upgrades ?? []) {
    const upgradeEntries = []

    if (typeof upgrade.effectReference === 'string') {
      const entry = buildPlannerEffectEntry({
        effectString: upgrade.effectReference,
        effect: upgrade,
        effectPayload: parseEffectPayload(upgrade.effectReference),
        effectPayloads: [],
        sourceBucket: 'upgrade',
        upgradeId: String(upgrade.id ?? ''),
      })
      effectEntries.push(entry)
      upgradeEntries.push(entry)
    }

    const effectKeys = upgrade.effectDefinition?.snapshots?.original?.effect_keys
    if (Array.isArray(effectKeys)) {
      const effectPayloads = effectKeys.map((effectKey) => buildEffectKeyPayload(effectKey))
      for (const [index, effectKey] of effectKeys.entries()) {
        if (typeof effectKey?.effect_string === 'string') {
          const entry = buildPlannerEffectEntry({
            effectString: effectKey.effect_string,
            effect: effectKey,
            effectPayload: effectPayloads[index] ?? null,
            effectPayloads,
            sourceBucket: 'upgrade-effect-key',
            upgradeId: String(upgrade.id ?? ''),
          })
          effectEntries.push(entry)
          upgradeEntries.push(entry)
        }
      }
    }

    if (upgradeEntries.length > 0) {
      upgradeEffectEntriesById.set(String(upgrade.id ?? ''), upgradeEntries)
    }
  }

  for (const lootItem of detail.loot ?? []) {
    for (const effect of lootItem.effects ?? []) {
      if (typeof effect?.effect_string === 'string') {
        effectEntries.push(buildPlannerEffectEntry({
          effectString: effect.effect_string,
          effect,
          effectPayload: parseEffectPayload(effect.effect_string),
          effectPayloads: [],
          sourceBucket: 'loot',
        }))
      }
    }
  }

  for (const legendaryEffect of detail.legendaryEffects ?? []) {
    for (const effect of legendaryEffect.effects ?? []) {
      if (typeof effect?.effect_string === 'string') {
        effectEntries.push(buildPlannerEffectEntry({
          effectString: effect.effect_string,
          effect,
          effectPayload: parseEffectPayload(effect.effect_string),
          effectPayloads: [],
          sourceBucket: 'legendary',
        }))
      }
    }
  }

  return { effectEntries, upgradeEffectEntriesById }
}

function summarizePlannerBuffUpgradeBase(entry, targetEntries) {
  const unresolvedBaseEffectNames = []
  const ignoredBaseEffectNames = []
  const resolvedSignals = []

  for (const targetEntry of targetEntries) {
    const targetSignalResult = resolvePlannerEntrySignal(targetEntry)
    if (targetSignalResult?.ok) {
      resolvedSignals.push(targetSignalResult)
      continue
    }

    const split = splitPlannerEffectString(targetEntry.effectString)
    if (!split) {
      continue
    }

    if (shouldIgnorePlannerUnsupportedEffectEntry(targetEntry, split.effectName)) {
      ignoredBaseEffectNames.push(split.effectName)
      continue
    }

    unresolvedBaseEffectNames.push(split.effectName)
  }

  if (resolvedSignals.length > 0) {
    return {
      status: 'wrapper-supported-base-resolved',
      resolvedSignals,
      unresolvedBaseEffectNames,
      ignoredBaseEffectNames,
      unresolvedReason: null,
    }
  }

  const unresolvedReason =
    targetEntries.length === 0
      ? 'target-upgrade-missing'
      : unresolvedBaseEffectNames.length > 0
        ? 'base-effect-unrecognized'
        : ignoredBaseEffectNames.length > 0
          ? 'base-effect-ignored-or-empty'
          : 'base-signal-not-derived'

  return {
    status: 'wrapper-supported-base-unresolved',
    resolvedSignals,
    unresolvedBaseEffectNames,
    ignoredBaseEffectNames,
    unresolvedReason,
  }
}

export function analyzePlannerBuffUpgradeWrappers(detail) {
  const { effectEntries, upgradeEffectEntriesById } = collectPlannerRawEffectEntries(detail)
  const auditEntries = []

  for (const entry of effectEntries) {
    const kind = entry.effectPayload?.kind
    if (!isAnyPlannerBuffUpgradeWrapperKind(kind) || entry.sourceBucket !== 'upgrade-effect-key') {
      continue
    }

    const targetUpgradeIds = resolvePlannerTargetUpgradeIds(entry.effectPayload)
    const wrapperSupported = isPlannerBuffUpgradeKind(kind)
    const buffSeed = wrapperSupported ? resolvePlannerBuffUpgradeSeed(entry) : null

    if (!wrapperSupported || !buffSeed) {
      auditEntries.push({
        wrapperKind: kind,
        wrapperEffectString: entry.effectString,
        status: 'wrapper-family-unsupported',
        targetUpgradeIds,
        unresolvedReason: !wrapperSupported ? 'wrapper-kind-unsupported' : 'wrapper-seed-unresolved',
        unresolvedBaseEffectNames: [],
        ignoredBaseEffectNames: [],
      })
      continue
    }

    const allTargetEntries = targetUpgradeIds.flatMap((targetUpgradeId) =>
      upgradeEffectEntriesById.get(String(targetUpgradeId)) ?? [],
    )
    const summary = summarizePlannerBuffUpgradeBase(entry, allTargetEntries)

    auditEntries.push({
      wrapperKind: kind,
      wrapperEffectString: entry.effectString,
      status: summary.status,
      targetUpgradeIds,
      unresolvedReason: summary.unresolvedReason,
      unresolvedBaseEffectNames: summary.unresolvedBaseEffectNames,
      ignoredBaseEffectNames: summary.ignoredBaseEffectNames,
    })
  }

  return auditEntries
}

export function normalizePlannerEffectSignal(effectName, effectValue, source, effectMetadata = {}) {
  if (effectMetadata.signalPreset) {
    return {
      ok: true,
      signal: effectMetadata.signalPreset,
      bucket: effectMetadata.bucketOverride ?? 'supportSignals',
    }
  }

  const rawEffect = buildPlannerRawEffect(effectName, effectValue, effectMetadata.effectPayload)
  const numericValue = resolvePlannerNumericValue(
    effectValue,
    effectMetadata.effectPayload,
    effectMetadata.effectPayloads,
  )

  if (!Number.isFinite(numericValue)) {
    return {
      ok: false,
        unsupported: {
          rawEffect: effectName,
          rawValue: effectValue,
          note: `Effect value is not numeric: ${effectValue}`,
          source,
      },
    }
  }

  if (effectName === 'global_dps_multiplier_mult') {
    return {
      ok: true,
      signal: { kind: 'globalDpsMultiplier', value: numericValue, rawEffect, source },
      bucket: 'supportSignals',
    }
  }

  if (effectName === 'hero_dps_multiplier_mult') {
    const explicitTargeting = normalizeExplicitTargeting(effectMetadata.effect)

    if (explicitTargeting.status === 'unsupported') {
      return {
        ok: false,
        unsupported: {
          rawEffect: effectName,
          rawValue: effectValue,
          note: explicitTargeting.note,
          source,
        },
      }
    }

    return {
      ok: true,
      signal: { kind: 'heroDpsMultiplier', value: numericValue, rawEffect, source },
      bucket:
        explicitTargeting.status === 'supported' && explicitTargeting.relation !== 'self'
          ? 'supportSignals'
          : 'carrySignals',
    }
  }

  if (effectName === 'hero_dps_mult_per_target_crusader') {
    const bucketResult = resolvePlannerBucket(effectMetadata.effect)
    if (!bucketResult.ok) {
      return {
        ok: false,
        unsupported: {
          rawEffect: effectName,
          rawValue: effectValue,
          note: bucketResult.note,
          source,
        },
      }
    }

    const countRelation = resolvePlannerCountRelation(effectMetadata.effectPayload?.args?.[1] ?? null)
    if (!countRelation) {
      return {
        ok: false,
        unsupported: {
          rawEffect: effectName,
          rawValue: effectValue,
          note: `Unsupported per-target count relation: ${JSON.stringify(effectMetadata.effectPayload?.args?.[1] ?? null)}`,
          source,
        },
      }
    }

    return {
      ok: true,
      signal: {
        kind: 'heroDpsMultiplier',
        value: numericValue,
        rawEffect,
        source,
        amountFunc: 'add',
        stackFunc: 'per_target_crusader',
        formationCountPositionQualifier: { relation: countRelation },
      },
      bucket: bucketResult.bucket,
    }
  }

  if (
    effectName === 'hero_dps_mult_per_target_crusader_mult'
    || effectName === 'hero_dps_mult_per_target_crusader_prebonus_mult'
  ) {
    const bucketResult = resolvePlannerBucket(effectMetadata.effect)
    if (!bucketResult.ok) {
      return {
        ok: false,
        unsupported: {
          rawEffect: effectName,
          rawValue: effectValue,
          note: bucketResult.note,
          source,
        },
      }
    }

    const countRelation = resolvePlannerCountRelation(effectMetadata.effectPayload?.args?.[1] ?? null)
    if (!countRelation) {
      return {
        ok: false,
        unsupported: {
          rawEffect: effectName,
          rawValue: effectValue,
          note: `Unsupported per-target count relation: ${JSON.stringify(effectMetadata.effectPayload?.args?.[1] ?? null)}`,
          source,
        },
      }
    }

    return {
      ok: true,
      signal: {
        kind: 'heroDpsMultiplier',
        value: numericValue,
        rawEffect,
        source,
        amountFunc: 'mult',
        stackFunc: 'per_target_crusader',
        formationCountPositionQualifier: { relation: countRelation },
      },
      bucket: bucketResult.bucket,
    }
  }

  if (effectName === 'hero_dps_mult_per_tagged_crusader_mult') {
    const bucketResult = resolvePlannerBucket(effectMetadata.effect)
    if (!bucketResult.ok) {
      return {
        ok: false,
        unsupported: {
          rawEffect: effectName,
          rawValue: effectValue,
          note: bucketResult.note,
          source,
        },
      }
    }

    const formationCountQualifier = parsePlannerTagQualifierFromArg(effectMetadata.effectPayload?.args?.[1] ?? null)
    if (!formationCountQualifier) {
      return {
        ok: false,
        unsupported: {
          rawEffect: effectName,
          rawValue: effectValue,
          note: `Unsupported tagged count qualifier: ${JSON.stringify(effectMetadata.effectPayload?.args?.[1] ?? null)}`,
          source,
        },
      }
    }

    return {
      ok: true,
      signal: {
        kind: 'heroDpsMultiplier',
        value: numericValue,
        rawEffect,
        source,
        amountFunc: 'mult',
        stackFunc: 'per_tagged_crusader_mult',
        formationCountQualifier,
      },
      bucket: bucketResult.bucket,
    }
  }

  if (effectName === 'hero_dps_mult_per_tagged_crusader_mult_amount_before') {
    const bucketResult = resolvePlannerBucket(effectMetadata.effect)
    if (!bucketResult.ok) {
      return {
        ok: false,
        unsupported: {
          rawEffect: effectName,
          rawValue: effectValue,
          note: bucketResult.note,
          source,
        },
      }
    }

    const formationCountQualifier = parsePlannerTagQualifierFromArg(effectMetadata.effectPayload?.args?.[1] ?? null)
    if (!formationCountQualifier) {
      return {
        ok: false,
        unsupported: {
          rawEffect: effectName,
          rawValue: effectValue,
          note: `Unsupported tagged count qualifier: ${JSON.stringify(effectMetadata.effectPayload?.args?.[1] ?? null)}`,
          source,
        },
      }
    }

    return {
      ok: true,
      signal: {
        kind: 'heroDpsMultiplier',
        value: numericValue,
        rawEffect,
        source,
        amountFunc: 'mult',
        stackFunc: 'per_tagged_crusader_mult',
        formationCountQualifier,
      },
      bucket: bucketResult.bucket,
    }
  }

  if (effectName === 'hero_dps_mult_per_crusader_mult') {
    const bucketResult = resolvePlannerBucket(effectMetadata.effect)
    if (!bucketResult.ok) {
      return {
        ok: false,
        unsupported: {
          rawEffect: effectName,
          rawValue: effectValue,
          note: bucketResult.note,
          source,
        },
      }
    }

    const targetQualifier = normalizeTargetQualifier(effectMetadata.effect)

    return {
      ok: true,
      signal: {
        kind: 'heroDpsMultiplier',
        value: numericValue,
        rawEffect,
        source,
        amountFunc: 'mult',
        stackFunc: 'per_crusader',
        targetQualifier,
        formationCountQualifier: targetQualifier,
      },
      bucket: bucketResult.bucket,
    }
  }

  if (effectName === 'hero_dps_mult_per_col_behind') {
    const bucketResult = resolvePlannerBucket(effectMetadata.effect)
    if (!bucketResult.ok) {
      return {
        ok: false,
        unsupported: {
          rawEffect: effectName,
          rawValue: effectValue,
          note: bucketResult.note,
          source,
        },
      }
    }

    return {
      ok: true,
      signal: {
        kind: 'heroDpsMultiplier',
        value: numericValue,
        rawEffect,
        source,
        amountFunc: 'mult',
        stackFunc: 'per_col_behind',
      },
      bucket: bucketResult.bucket,
    }
  }

  if (effectName.startsWith('adjacent_')) {
    return {
      ok: true,
      signal: { kind: 'adjacentBuff', value: numericValue, rawEffect, source },
      bucket: 'supportSignals',
    }
  }

  if (effectName.startsWith('tag_')) {
    return {
      ok: true,
      signal: { kind: 'taggedChampionBuff', value: numericValue, rawEffect, source },
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
  const { effectEntries, upgradeEffectEntriesById } = collectPlannerRawEffectEntries(detail)

  const derivedEntries = []

  for (const entry of effectEntries) {
    if (!isPlannerBuffUpgradeKind(entry.effectPayload?.kind)) {
      continue
    }

    const buffSeed = resolvePlannerBuffUpgradeSeed(entry)
    if (!buffSeed) {
      continue
    }

    const targetUpgradeIds = resolvePlannerTargetUpgradeIds(entry.effectPayload)
    for (const targetUpgradeId of targetUpgradeIds) {
      const targetEntries = upgradeEffectEntriesById.get(String(targetUpgradeId)) ?? []
      for (const targetEntry of targetEntries) {
        const targetSignalResult = resolvePlannerEntrySignal(targetEntry)
        if (!targetSignalResult?.ok) {
          continue
        }

        const targetSignal = targetSignalResult.signal
        derivedEntries.push(buildPlannerEffectEntry({
          effectString: entry.effectString,
          effect: entry.effect,
          effectPayload: entry.effectPayload,
          effectPayloads: entry.effectPayloads,
          sourceBucket: 'upgrade-buffed-signal',
          upgradeId: entry.upgradeId,
          bucketOverride: targetSignalResult.bucket,
          signalPreset: {
            ...targetSignal,
            rawEffect: entry.effectString,
            value: resolvePlannerNumericValue(
              entry.effectPayload?.args?.[0] ?? '',
              entry.effectPayload,
              entry.effectPayloads,
            ),
            bonusScaleOfSignal: targetSignal,
            amountFunc: buffSeed.amountFunc ?? null,
            stackFunc: buffSeed.stackFunc ?? null,
            formationCountQualifier: buffSeed.formationCountQualifier ?? null,
            formationCountPositionQualifier: buffSeed.formationCountPositionQualifier ?? null,
          },
        }))
      }
    }
  }

  return [...effectEntries, ...derivedEntries]
}

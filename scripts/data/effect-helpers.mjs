import {
  buildEffectKeyPayload,
  extractTargetIdsFromParsedEffectPayload,
  parseEffectPayload,
  resolveEffectPayloadAmountToken,
} from '../../src/domain/effects/effect-string.js'
import {
  attachSignalSemantics,
  mergeHeroQualifiers,
  normalizeExplicitTargeting,
  normalizeStatQualifiers,
  statQualifiersToNodes,
  normalizeTargetQualifier,
  parsePerHeroExpr,
} from '../../src/domain/abilities/signalSemantics.js'
import { parseHeroPredicate } from '../../src/domain/abilities/heroPredicate.js'

function resolveNumericValue(effectValue, effectPayload, effectPayloads, upgradePayloadsById) {
  if (typeof effectPayload?.meta?.amount_expr === 'string') {
    const resolved = resolveEffectPayloadAmountToken(
      effectPayload,
      effectPayloads ?? [effectPayload],
      upgradePayloadsById,
    )
    const resolvedValue = resolved === null ? Number.NaN : parseFloat(String(resolved))

    if (Number.isFinite(resolvedValue)) {
      return resolvedValue
    }
  }

  return parseFloat(effectValue)
}

function buildRawEffect(effectName, effectValue, effectPayload) {
  return effectPayload?.effectString ?? `${effectName},${effectValue}`
}

function resolveBucket(effect) {
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

function resolveCountRelation(rawTarget) {
  const targeting = normalizeExplicitTargeting({ targets: [rawTarget] })

  // 'all' / 'all_slots' → relation 'any' = 全阵位计数（不计位置，只按 formationCountQualifier
  // 计数所有匹配英雄）。消费层 countQualifiedHeroes 已显式支持 'any'（跳过 matchesSlotRelation），
  // 故此处放行；曾因 relation==='any' 返回 null，导致全阵位 per_target_crusader effect 被静默丢弃。
  if (targeting.status !== 'supported') {
    return null
  }

  return targeting.relation
}

function parseTagQualifierFromArg(rawValue) {
  if (typeof rawValue !== 'string') {
    return null
  }
  const predicate = parseHeroPredicate(rawValue, 'shorthand')
  return predicate ? { predicate } : null
}

function buildEffectEntry({
  effectString,
  effect,
  effectPayload,
  effectPayloads = [],
  sourceBucket,
  upgradeId = null,
  signalPreset = null,
  bucketOverride = null,
  upgradePayloadsById = null,
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
    upgradePayloadsById,
  }
}

const BUFF_UPGRADE_WRAPPER_KINDS = new Set([
  'buff_upgrade',
  'buff_upgrades',
  'buff_upgrade_per_any_tagged_crusader_mult',
  'buff_upgrade_per_target_crusader',
  'buff_upgrade_per_any_crusader_where_mult',
  'buff_upgrade_mult_by_distance_from_source',
  'buff_upgrade_mult_by_distance_from_source_mult',
])

function isAnyBuffUpgradeWrapperKind(kind) {
  return kind === 'buff_upgrades'
    || (typeof kind === 'string' && kind.startsWith('buff_upgrade'))
}

function isBuffUpgradeKind(kind) {
  return typeof kind === 'string' && BUFF_UPGRADE_WRAPPER_KINDS.has(kind)
}

/**
 * crit effect 名 → (kind, amountFunc) 映射。阶段 4.2。
 * 默认暴击 chance/damage 由 crit_factor 公式（steadyStateScoring）应用，不在此处。
 */
const CRIT_KIND_BY_EFFECT = {
  buff_base_crit_chance_add: { kind: 'heroCritChance', amountFunc: 'add' },
  buff_base_crit_chance_mult: { kind: 'heroCritChance', amountFunc: 'mult' },
  buff_base_crit_damage: { kind: 'heroCritDamage', amountFunc: 'add' },
  buff_base_crit_damage_mult: { kind: 'heroCritDamage', amountFunc: 'mult' },
  global_buff_base_crit_chance_add: { kind: 'globalCritChance', amountFunc: 'add' },
  global_buff_base_crit_damage_add: { kind: 'globalCritDamage', amountFunc: 'add' },
  global_buff_base_crit_damage_mult: { kind: 'globalCritDamage', amountFunc: 'mult' },
}

/**
 * survival effect 名 → (kind, amountFunc) 映射。阶段 5.1。
 * health/healing 折入 health multiplier（MVP：healing 近似为生命加成，survival 软约束）；
 * damage_reduction 单独 kind（玩家侧减伤，作用于 incoming damage）。
 */
const SURVIVAL_KIND_BY_EFFECT = {
  health_mult: { kind: 'heroHealthMultiplier', amountFunc: 'add' },
  increase_health_by_source_percent: { kind: 'heroHealthMultiplier', amountFunc: 'add' },
  healing_mult: { kind: 'heroHealthMultiplier', amountFunc: 'add' },
  global_healing_mult: { kind: 'globalHealthMultiplier', amountFunc: 'add' },
  global_health_mult: { kind: 'globalHealthMultiplier', amountFunc: 'add' },
  damage_reduction: { kind: 'damageReduction', amountFunc: 'add' },
  damage_reduction_ranged: { kind: 'damageReduction', amountFunc: 'add' },
  fixed_damage_reduction_all_enemy_attacks: { kind: 'damageReduction', amountFunc: 'add' },
  trials_damage_reduction_mult: { kind: 'damageReduction', amountFunc: 'mult' },
}

/**
 * buff_upgrade wrapper 家族的裸 effect 名是否应从 unsupportedSignals 中忽略。
 * 这些 wrapper 的实际 signal 由 collectEffectEntries 派生（bonusScaleOfSignal = 目标 base）；
 * 未派生的 wrapper 变体由 analyzeBuffUpgradeWrappers 独立审计。
 * 故无论来自 effectReference（sourceBucket='upgrade'）还是 effect_keys（'upgrade-effect-key'）路径，
 * 裸 wrapper 名都不进 unsupportedSignals——否则会产生数千条 "No parser for effect: buff_upgrade" 噪声。
 */
export function shouldIgnoreUnsupportedEffectEntry(rawEffect) {
  if (rawEffect === 'effect_def') {
    return true
  }
  return isBuffUpgradeKind(rawEffect)
}

function resolveTargetUpgradeIds(payload) {
  if (!payload) {
    return []
  }

  if (payload.kind === 'buff_upgrade_per_target_crusader') {
    return [payload.args[1]].filter(Boolean)
  }

  return extractTargetIdsFromParsedEffectPayload(payload)
}

function parseWhereQualifierFromArgs(compare, comparison, check) {
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
    const predicate = parsePerHeroExpr(`${normalizedCompare}${normalizedComparison}${check}`)
    return predicate ? { predicate } : null
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

  if (!requiredStats || requiredStats.length === 0) {
    return null
  }

  const nodes = statQualifiersToNodes(requiredStats)
  return { predicate: nodes.length === 1 ? nodes[0] : { op: 'and', children: nodes } }
}

function resolveBuffUpgradeSeed(entry) {
  const payload = entry.effectPayload
  if (!payload) {
    return null
  }

  if (payload.kind === 'buff_upgrade' || payload.kind === 'buff_upgrades') {
    return {}
  }

  if (payload.kind === 'buff_upgrade_per_any_tagged_crusader_mult') {
    const formationCountQualifier = parseTagQualifierFromArg(payload.args[2] ?? null)
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
    const formationCountQualifier = parseWhereQualifierFromArgs(
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
    const countRelation = resolveCountRelation(payload.args[2] ?? null)
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

function resolveEntrySignal(entry) {
  if (entry.signalPreset) {
    return {
      ok: true,
      signal: entry.signalPreset,
      bucket: entry.bucketOverride ?? 'supportSignals',
    }
  }

  const split = splitEffectString(entry.effectString)
  if (!split) {
    return null
  }

  const parsed = normalizeEffectSignal(
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

function collectRawEffectEntries(detail) {
  const effectEntries = []
  const upgradeEffectEntriesById = new Map()
  // upgrade id → 该 upgrade 的 effect_keys payloads；供 amount_expr='upgrade_amount(id,index)'
  // 跨 upgrade 解析目标 effect 的 amount（真实数据有少量跨 upgrade 引用）。
  const upgradePayloadsById = new Map()

  for (const upgrade of detail.upgrades ?? []) {
    const upgradeEntries = []
    const upgradeId = String(upgrade.id ?? '')

    if (typeof upgrade.effectReference === 'string') {
      const effectPayload = parseEffectPayload(upgrade.effectReference)
      const entry = buildEffectEntry({
        // effectReference 已由 normalize 层 normalizeEffectReference 提取为干净标准串，
        // 直接用作 effectString；effectPayload 仅用于提取 kind/args。
        effectString: upgrade.effectReference,
        effect: upgrade,
        effectPayload,
        effectPayloads: [],
        sourceBucket: 'upgrade',
        upgradeId,
      })
      effectEntries.push(entry)
      upgradeEntries.push(entry)
    }

    const effectKeys = upgrade.effectDefinition?.snapshots?.original?.effect_keys
    if (Array.isArray(effectKeys)) {
      const effectPayloads = effectKeys.map((effectKey) => buildEffectKeyPayload(effectKey))
      if (upgradeId) {
        upgradePayloadsById.set(upgradeId, effectPayloads)
      }
      for (const [index, effectKey] of effectKeys.entries()) {
        if (typeof effectKey?.effect_string === 'string') {
          const entry = buildEffectEntry({
            effectString: effectKey.effect_string,
            effect: effectKey,
            effectPayload: effectPayloads[index] ?? null,
            effectPayloads,
            sourceBucket: 'upgrade-effect-key',
            upgradeId,
          })
          effectEntries.push(entry)
          upgradeEntries.push(entry)
        }
      }
    }

    if (upgradeEntries.length > 0) {
      upgradeEffectEntriesById.set(upgradeId, upgradeEntries)
    }
  }

  for (const lootItem of detail.loot ?? []) {
    for (const effect of lootItem.effects ?? []) {
      if (typeof effect?.effect_string === 'string') {
        effectEntries.push(buildEffectEntry({
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
        effectEntries.push(buildEffectEntry({
          effectString: effect.effect_string,
          effect,
          effectPayload: parseEffectPayload(effect.effect_string),
          effectPayloads: [],
          sourceBucket: 'legendary',
        }))
      }
    }
  }

  // feat effects（英雄专属固定能力）：与 loot/legendary 同结构（detail.feats[].effects[]），
  // 同属 M1 理论最大 carryDps 基线；含 filter_targets/stack_func/per_hero_expr，由消费层
  // attachSignalSemantics 统一处理。阶段 13「feat 精细乘数」指按玩家实际选择精算，
  // 不影响此处「全 feat 进理论基线」。
  for (const feat of detail.feats ?? []) {
    for (const effect of feat.effects ?? []) {
      if (typeof effect?.effect_string === 'string') {
        effectEntries.push(buildEffectEntry({
          effectString: effect.effect_string,
          effect,
          effectPayload: parseEffectPayload(effect.effect_string),
          effectPayloads: [],
          sourceBucket: 'feat',
        }))
      }
    }
  }

  // 附加 upgradePayloadsById 到所有 entry，使 resolveNumericValue 能跨 upgrade 解析 amount_expr。
  for (const entry of effectEntries) {
    entry.upgradePayloadsById = upgradePayloadsById
  }

  return { effectEntries, upgradeEffectEntriesById }
}

function summarizeBuffUpgradeBase(entry, targetEntries) {
  const unresolvedBaseEffectNames = []
  const ignoredBaseEffectNames = []
  const resolvedSignals = []

  for (const targetEntry of targetEntries) {
    const targetSignalResult = resolveEntrySignal(targetEntry)
    if (targetSignalResult?.ok) {
      resolvedSignals.push(targetSignalResult)
      continue
    }

    const split = splitEffectString(targetEntry.effectString)
    if (!split) {
      continue
    }

    if (shouldIgnoreUnsupportedEffectEntry(split.effectName)) {
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

export function analyzeBuffUpgradeWrappers(detail) {
  const { effectEntries, upgradeEffectEntriesById } = collectRawEffectEntries(detail)
  const auditEntries = []

  for (const entry of effectEntries) {
    const kind = entry.effectPayload?.kind
    if (!isAnyBuffUpgradeWrapperKind(kind) || entry.sourceBucket !== 'upgrade-effect-key') {
      continue
    }

    const targetUpgradeIds = resolveTargetUpgradeIds(entry.effectPayload)
    const wrapperSupported = isBuffUpgradeKind(kind)
    const buffSeed = wrapperSupported ? resolveBuffUpgradeSeed(entry) : null

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
    const summary = summarizeBuffUpgradeBase(entry, allTargetEntries)

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

export function normalizeEffectSignal(effectName, effectValue, source, effectMetadata = {}) {
  if (effectMetadata.signalPreset) {
    return {
      ok: true,
      signal: effectMetadata.signalPreset,
      bucket: effectMetadata.bucketOverride ?? 'supportSignals',
    }
  }

  const rawEffect = buildRawEffect(effectName, effectValue, effectMetadata.effectPayload)
  const numericValue = resolveNumericValue(
    effectValue,
    effectMetadata.effectPayload,
    effectMetadata.effectPayloads,
    effectMetadata.upgradePayloadsById,
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
    const bucketResult = resolveBucket(effectMetadata.effect)
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

    const countRelation = resolveCountRelation(effectMetadata.effectPayload?.args?.[1] ?? null)
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
    const bucketResult = resolveBucket(effectMetadata.effect)
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

    const countRelation = resolveCountRelation(effectMetadata.effectPayload?.args?.[1] ?? null)
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
    const bucketResult = resolveBucket(effectMetadata.effect)
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

    const formationCountQualifier = parseTagQualifierFromArg(effectMetadata.effectPayload?.args?.[1] ?? null)
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
    const bucketResult = resolveBucket(effectMetadata.effect)
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

    const formationCountQualifier = parseTagQualifierFromArg(effectMetadata.effectPayload?.args?.[1] ?? null)
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
    const bucketResult = resolveBucket(effectMetadata.effect)
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
    const bucketResult = resolveBucket(effectMetadata.effect)
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

  // 阶段 3.2：金币（gold pool）。gold find 是全队聚合 stat → globalGoldMultiplier。
  if (effectName === 'gold_multiplier_mult') {
    return {
      ok: true,
      signal: { kind: 'globalGoldMultiplier', value: numericValue, rawEffect, source },
      bucket: 'supportSignals',
    }
  }

  if (effectName === 'gold_mult_per_tagged_crusader_mult') {
    const formationCountQualifier = parseTagQualifierFromArg(effectMetadata.effectPayload?.args?.[1] ?? null)
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
        kind: 'globalGoldMultiplier',
        value: numericValue,
        rawEffect,
        source,
        amountFunc: 'mult',
        stackFunc: 'per_tagged_crusader_mult',
        formationCountQualifier,
      },
      bucket: 'supportSignals',
    }
  }

  // 阶段 4.2：暴击（crit pool）。chance/damage 各 global/hero；默认 chance=2.5%/damage=100%
  // 来自 default_crit_info（游戏全局），在 crit_factor 公式（阶段 4.3）应用，不在解析层。
  const critMatch = CRIT_KIND_BY_EFFECT[effectName]
  if (critMatch) {
    return {
      ok: true,
      signal: {
        kind: critMatch.kind,
        value: numericValue,
        rawEffect,
        source,
        ...(critMatch.amountFunc === 'mult' ? { amountFunc: 'mult' } : {}),
      },
      bucket: 'supportSignals',
    }
  }

  // 阶段 5.1：survival（health/healing/damage_reduction）。
  const survivalMatch = SURVIVAL_KIND_BY_EFFECT[effectName]
  if (survivalMatch) {
    return {
      ok: true,
      signal: {
        kind: survivalMatch.kind,
        value: numericValue,
        rawEffect,
        source,
        ...(survivalMatch.amountFunc === 'mult' ? { amountFunc: 'mult' } : {}),
      },
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

export function splitEffectString(effectString) {
  if (typeof effectString !== 'string' || effectString.trim().length === 0) {
    return null
  }

  const [effectName, effectValue = '1'] = effectString.split(',', 2)
  return { effectName, effectValue }
}

// derived signal 去重 key：捕获所有影响 pool 聚合语义的字段。
// IC 装备系统把同一 buff 按 装备槽/稀有度 展开成多条 effect 完全相同的 upgrade（仅 id 不同，
// magnitude 相同），游戏 buff 按 effect 逻辑去重（同 effect 不叠加）。此处对完全相同的
// derived signal 去重；不同 magnitude 的稀有度取最高归阶段 8。
function derivedSignalKey(preset) {
  return JSON.stringify({
    kind: preset.kind,
    rawEffect: preset.rawEffect,
    value: preset.value,
    amountFunc: preset.amountFunc,
    stackFunc: preset.stackFunc,
    bonusScaleRawEffect: preset.bonusScaleOfSignal?.rawEffect ?? null,
    targetQualifier: preset.targetQualifier ?? null,
    formationCountQualifier: preset.formationCountQualifier ?? null,
    positionQualifier: preset.positionQualifier ?? null,
    formationCountPositionQualifier: preset.formationCountPositionQualifier ?? null,
  })
}

export function collectEffectEntries(detail) {
  const { effectEntries, upgradeEffectEntriesById } = collectRawEffectEntries(detail)

  const derivedByKey = new Map()

  for (const entry of effectEntries) {
    if (!isBuffUpgradeKind(entry.effectPayload?.kind)) {
      continue
    }

    const buffSeed = resolveBuffUpgradeSeed(entry)
    if (!buffSeed) {
      continue
    }

    const targetUpgradeIds = resolveTargetUpgradeIds(entry.effectPayload)
    for (const targetUpgradeId of targetUpgradeIds) {
      const targetEntries = upgradeEffectEntriesById.get(String(targetUpgradeId)) ?? []
      for (const targetEntry of targetEntries) {
        const targetSignalResult = resolveEntrySignal(targetEntry)
        if (!targetSignalResult?.ok) {
          continue
        }

        const targetSignal = targetSignalResult.signal
        // wrapper 自身的 filter_targets（如 hero_ids 白名单）限定 buff 只对特定英雄生效；
        // 合并到 base 的 targetQualifier（AND），避免 wrapper 层 targeting 丢失（第四轮审计）。
        const wrapperQualifier = normalizeTargetQualifier(entry.effect)
        const preset = {
          ...targetSignal,
          targetQualifier: mergeHeroQualifiers(targetSignal.targetQualifier ?? null, wrapperQualifier),
          rawEffect: entry.effectString,
          value: resolveNumericValue(
            entry.effectPayload?.args?.[0] ?? '',
            entry.effectPayload,
            entry.effectPayloads,
            entry.upgradePayloadsById,
          ),
          bonusScaleOfSignal: targetSignal,
          amountFunc: buffSeed.amountFunc ?? null,
          stackFunc: buffSeed.stackFunc ?? null,
          formationCountQualifier: buffSeed.formationCountQualifier ?? null,
          formationCountPositionQualifier: buffSeed.formationCountPositionQualifier ?? null,
        }

        const key = derivedSignalKey(preset)
        if (!derivedByKey.has(key)) {
          derivedByKey.set(key, buildEffectEntry({
            effectString: entry.effectString,
            effect: entry.effect,
            effectPayload: entry.effectPayload,
            effectPayloads: entry.effectPayloads,
            sourceBucket: 'upgrade-buffed-signal',
            upgradeId: entry.upgradeId,
            bucketOverride: targetSignalResult.bucket,
            signalPreset: preset,
          }))
        }
      }
    }
  }

  return [...effectEntries, ...derivedByKey.values()]
}

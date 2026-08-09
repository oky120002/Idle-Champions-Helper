import {
  buildEffectKeyPayload,
  extractTargetIdsFromParsedEffectPayload,
  parseEffectPayload,
  type ParsedEffectPayload,
} from '../../src/domain/effects/effect-string.ts'
import {
  attachSignalSemantics,
  mergeHeroQualifiers,
  normalizeStatQualifiers,
  statQualifiersToNodes,
  normalizeTargetQualifier,
  parsePerHeroExpr,
} from '../../src/domain/abilities/signalSemantics.ts'
import type { JsonValue } from '../../src/domain/types'
import type {
  HeroAbilityAmountFunc,
  HeroAbilitySignal,
  HeroPositionQualifier,
  HeroQualifier,
} from '../../src/domain/abilities/abilityModel'
import {
  parseTagQualifierFromArg,
  resolveCountRelation,
  resolveNumericValue,
  type EffectSignalResult,
  type SignalBucket,
} from './effect-resolvers/resolverShared.ts'
import { normalizeEffectSignal } from './effect-resolvers/resolverDispatch.ts'

// effect → signal 的解析层拆分到 ./effect-resolvers/（8 个 resolver + dispatch + shared）；
// 此处只保留 buff_upgrade 展开与 effect entry 收集（collectEffectEntries），解析入口 re-export。
export { normalizeEffectSignal }

// === Internal types ===

interface EffectEntry {
  effectString: string
  effect: Record<string, unknown>
  effectPayload: ParsedEffectPayload | null
  effectPayloads: Array<ParsedEffectPayload | null | undefined>
  sourceBucket: string
  upgradeId: string | null
  signalPreset: HeroAbilitySignal | null
  bucketOverride: SignalBucket | null
  upgradePayloadsById: Map<string, Array<ParsedEffectPayload | null | undefined>> | null
  /** upgrade 解锁等级；非 upgrade 源 = null。消费侧 evaluatePlacementFit 按 supportLevel 过滤。 */
  requiredLevel: number | null
}

interface BuffUpgradeSeed {
  amountFunc?: HeroAbilityAmountFunc
  stackFunc?: string
  formationCountQualifier?: HeroQualifier
  formationCountPositionQualifier?: HeroPositionQualifier
}

interface ResolvedEntrySignal {
  ok: true
  signal: HeroAbilitySignal
  bucket: SignalBucket
}

interface BuffUpgradeBaseSummary {
  status: 'wrapper-supported-base-resolved' | 'wrapper-supported-base-unresolved'
  resolvedSignals: ResolvedEntrySignal[]
  unresolvedBaseEffectNames: string[]
  ignoredBaseEffectNames: string[]
  unresolvedReason: string | null
}

interface BuffUpgradeWrapperAuditEntry {
  wrapperKind: string
  wrapperEffectString: string
  status: 'wrapper-supported-base-resolved' | 'wrapper-supported-base-unresolved' | 'wrapper-family-unsupported'
  targetUpgradeIds: string[]
  unresolvedReason: string | null
  unresolvedBaseEffectNames: string[]
  ignoredBaseEffectNames: string[]
}

// raw JSON 收窄辅助：把 unknown 安全收成 Record<string, unknown>（null 安全）。
function asRecord(value: unknown): Record<string, JsonValue> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, JsonValue>) : null
}

function asUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function parseStaticDpsMult(raw: unknown): number {
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string' && raw !== '') return Number.parseFloat(raw)
  return Number.NaN
}

type EffectEntryInit = {
  effectString: string
  effect: Record<string, unknown>
  effectPayload: ParsedEffectPayload | null
  effectPayloads?: Array<ParsedEffectPayload | null | undefined>
  sourceBucket: string
  upgradeId?: string | null
  signalPreset?: HeroAbilitySignal | null
  bucketOverride?: SignalBucket | null
  upgradePayloadsById?: Map<string, Array<ParsedEffectPayload | null | undefined>> | null
  /** upgrade 解锁等级（ChampionUpgrade.requiredLevel）；非 upgrade 源（loot/feat/legendary）= null。 */
  requiredLevel?: number | null
}

function buildEffectEntry(init: EffectEntryInit): EffectEntry {
  return {
    effectString: init.effectString,
    effect: init.effect,
    effectPayload: init.effectPayload,
    effectPayloads: init.effectPayloads ?? [],
    sourceBucket: init.sourceBucket,
    upgradeId: init.upgradeId ?? null,
    signalPreset: init.signalPreset ?? null,
    bucketOverride: init.bucketOverride ?? null,
    upgradePayloadsById: init.upgradePayloadsById ?? null,
    requiredLevel: init.requiredLevel ?? null,
  }
}

const BUFF_UPGRADE_WRAPPER_KINDS = new Set<string>([
  'buff_upgrade',
  'buff_upgrades',
  'buff_upgrade_per_any_tagged_crusader_mult',
  'buff_upgrade_per_target_crusader',
  'buff_upgrade_per_any_crusader_where_mult',
  'buff_upgrade_mult_by_distance_from_source',
  'buff_upgrade_mult_by_distance_from_source_mult',
  // top N 变体（复用既有 seed 模式）：
  'buff_upgrade_add_flat_amount',
  'buff_upgrade_add_then_mult',
  'buff_upgrade_per_any_tagged_crusader',
  'buff_upgrade_by_tag_mult',
  'buff_upgrade_by_target_tag_mult',
  'buff_upgrade_per_crusader',
])

function isAnyBuffUpgradeWrapperKind(kind: unknown): boolean {
  return kind === 'buff_upgrades'
    || (typeof kind === 'string' && kind.startsWith('buff_upgrade'))
}

function isBuffUpgradeKind(kind: unknown): kind is string {
  return typeof kind === 'string' && BUFF_UPGRADE_WRAPPER_KINDS.has(kind)
}

/**
 * buff_upgrade wrapper 家族的裸 effect 名是否应从 unsupportedSignals 中忽略。
 * 这些 wrapper 的实际 signal 由 collectEffectEntries 派生（bonusScaleOfSignal = 目标 base）；
 * 未派生的 wrapper 变体由 analyzeBuffUpgradeWrappers 独立审计。
 * 故无论来自 effectReference（sourceBucket='upgrade'）还是 effect_keys（'upgrade-effect-key'）路径，
 * 裸 wrapper 名都不进 unsupportedSignals——否则会产生数千条 "No parser for effect: buff_upgrade" 噪声。
 */
export function shouldIgnoreUnsupportedEffectEntry(rawEffect: string): boolean {
  if (rawEffect === 'effect_def') {
    return true
  }
  if (rawEffect === 'set_base_crit_chance') {
    return true
  }
  return isBuffUpgradeKind(rawEffect)
}

/**
 * set_base_crit_chance：英雄 innate base crit % 的 SET（非位置信号）。
 * build 期提取为 hero.baseCritChancePercent（覆盖默认 2.5%），不进信号池；
 * shouldIgnoreUnsupportedEffectEntry 同名忽略，使 signal-coverage 不计 unsupported（两处同源，勿单改）。
 */
export function parseBaseCritChancePercent(effectName: string, effectValue: string): number | null {
  if (effectName !== 'set_base_crit_chance') {
    return null
  }
  const value = parseFloat(effectValue)
  return Number.isFinite(value) ? value : null
}

function resolveTargetUpgradeIds(payload: ParsedEffectPayload | null): string[] {
  if (!payload) {
    return []
  }

  if (payload.kind === 'buff_upgrade_per_target_crusader') {
    return [payload.args[1] ?? undefined].filter((id): id is string => Boolean(id))
  }

  return extractTargetIdsFromParsedEffectPayload(payload)
}

function parseWhereQualifierFromArgs(
  compare: unknown,
  comparison: unknown,
  check: unknown,
): HeroQualifier | null {
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
    const predicate = parsePerHeroExpr(`${normalizedCompare}${normalizedComparison}${String(check)}`)
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
  if (nodes.length === 1) {
    const node = nodes[0]
    if (node === undefined) {
      throw new Error('statQualifiersToNodes returned length=1 but nodes[0] is undefined')
    }
    return { predicate: node }
  }
  return { predicate: { op: 'and', children: nodes } }
}

function resolveBuffUpgradeSeed(entry: EffectEntry): BuffUpgradeSeed | null {
  const payload = entry.effectPayload
  if (!payload) {
    return null
  }

  if (payload.kind === 'buff_upgrade' || payload.kind === 'buff_upgrades') {
    // 普通形态：就是固定百分比放大 base，不需要叠层计数。
    // per_hero_expr 不会传到 wrapper（signalPreset 跳过了 attachSignalSemantics），
    // 但 2026-08-08 全量验证过没问题：带条件的那些效果在 line 764 就被排除了，
    // 能存活到这里的 wrapper 带的 per_hero_expr 都是数值表达式（int/dex 这种），不是条件判断。
    return {}
  }

  // flat/add_then_mult 变体按 buff_upgrade 同构（magnitude 直接作用于 base）。
  if (
    payload.kind === 'buff_upgrade_add_flat_amount'
    || payload.kind === 'buff_upgrade_add_then_mult'
  ) {
    return payload.kind === 'buff_upgrade_add_then_mult' ? { amountFunc: 'mult' } : {}
  }

  // per_tagged 变体（add/mult/by_tag/by_target_tag）：tag 取 args[2]，复用 per_tagged_crusader_mult 模式。
  if (
    payload.kind === 'buff_upgrade_per_any_tagged_crusader'
    || payload.kind === 'buff_upgrade_by_tag_mult'
    || payload.kind === 'buff_upgrade_by_target_tag_mult'
  ) {
    const formationCountQualifier = parseTagQualifierFromArg(payload.args[2] ?? null)
    if (!formationCountQualifier) {
      return null
    }
    const isMult = payload.kind !== 'buff_upgrade_per_any_tagged_crusader'
    return {
      amountFunc: isMult ? 'mult' : 'add',
      stackFunc: 'per_tagged_crusader_mult',
      formationCountQualifier,
    }
  }

  // per_crusader 变体：复用 per_crusader stackFunc。
  if (payload.kind === 'buff_upgrade_per_crusader') {
    return {
      amountFunc: 'add',
      stackFunc: 'per_crusader',
    }
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
    if (countRelation == null) {
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

function resolveEntrySignal(entry: EffectEntry): EffectSignalResult | null {
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
    signal: { ...attachSignalSemantics(parsed.signal, entry.effect), requiredLevel: entry.requiredLevel },
    bucket: parsed.bucket,
  }
}

function collectRawEffectEntries(detail: unknown): {
  effectEntries: EffectEntry[]
  upgradeEffectEntriesById: Map<string, EffectEntry[]>
  staticDpsMults: Map<string, number>
  specializationEntries: EffectEntry[]
} {
  const detailRecord = asRecord(detail)
  const effectEntries: EffectEntry[] = []
  const upgradeEffectEntriesById = new Map<string, EffectEntry[]>()
  // 专精 upgrade（specializationName != null）的 effect entry：与 base 同源同解析（buildEffectEntry），
  // 供 specialization-catalog build 期归一化为按 upgradeId 索引的可选 signal（ADR 0017）。
  const specializationEntries: EffectEntry[] = []
  // 机制: static-dps-mult-fallback（upgrade id → static_dps_mult，CNE 静态 dps 乘数近似 1.25–5）；
  // 其 effect 多为复杂机制（target_attacking_monsters_hero_dps_mult 等）进 unsupported，static_dps_mult 作 fallback。
  const staticDpsMults = new Map<string, number>()
  // upgrade id → 该 upgrade 的 effect_keys payloads；供 amount_expr='upgrade_amount(id,index)'
  // 跨 upgrade 解析目标 effect 的 amount（真实数据有少量跨 upgrade 引用）。
  const upgradePayloadsById = new Map<string, Array<ParsedEffectPayload | null | undefined>>()

  for (const upgradeRaw of asUnknownArray(detailRecord?.upgrades)) {
    const upgrade = asRecord(upgradeRaw)
    if (!upgrade) continue
    const upgradeEntries: EffectEntry[] = []
    const upgradeId = typeof upgrade.id === 'string' || typeof upgrade.id === 'number'
      ? String(upgrade.id)
      : ''
    // 专精 upgrade 标记：normalize 层已把 specialization_name 提到 upgrades[].specializationName
    // （{original, display} 或 null）。非 null = 玩家互斥选择的专精节点。
    const isSpecialization = upgrade.specializationName != null

    const staticDpsMultRaw = upgrade.staticDpsMult
    const staticDpsMult = parseStaticDpsMult(staticDpsMultRaw)
    if (Number.isFinite(staticDpsMult) && staticDpsMult > 1 && upgradeId !== '') {
      staticDpsMults.set(upgradeId, staticDpsMult)
    }

    // 等级解锁门控：upgrade 的 required_level（normalize 已提取为 requiredLevel 驼峰）烘进 EffectEntry，
    // 下游 resolveEntrySignal 写进 signal.requiredLevel，消费侧按 supportLevel 过滤。
    const upgradeRequiredLevelRaw = upgrade.requiredLevel
    const upgradeRequiredLevel = typeof upgradeRequiredLevelRaw === 'number'
      && Number.isFinite(upgradeRequiredLevelRaw)
      ? upgradeRequiredLevelRaw
      : null

    if (typeof upgrade.effectReference === 'string') {
      const effectPayload = parseEffectPayload(upgrade.effectReference)
      const entry = buildEffectEntry({
        // effectReference 已由 normalize 层 normalizeEffectReference 提取为干净标准串，
        // 直接用作 effectString；effectPayload 仅用于提取 kind/args。
        effectString: upgrade.effectReference,
        effect: upgrade,
        effectPayloads: [],
        sourceBucket: 'upgrade',
        requiredLevel: upgradeRequiredLevel,
        effectPayload,
        upgradeId,
      })
      upgradeEntries.push(entry)
      if (isSpecialization) {
        specializationEntries.push(entry)
      } else {
        effectEntries.push(entry)
      }
    }

    // effect_keys 只认数组：raw 中 6 个 effect_def 的 effect_keys 是单对象/空串
    // （CNE 单元素序列化为裸对象而非 1 元数组），非数组时整条静默丢弃。当前影响 0
    // （6 个全是孤儿 effect_def，无 upgrade 引用）；若将来出现被引用的非数组
    // effect_keys，在消费层归一化「非数组→[对象]」或在 normalize 层 coerce。
    const effectDefinition = asRecord(upgrade.effectDefinition)
    const snapshots = asRecord(effectDefinition?.snapshots)
    const original = asRecord(snapshots?.original)
    const effectKeys = asUnknownArray(original?.effect_keys)
    if (effectKeys.length > 0) {
      const effectPayloads = effectKeys.map((effectKey) => {
        const record = asRecord(effectKey)
        return record ? buildEffectKeyPayload(record) : null
      })
      if (upgradeId !== '') {
        upgradePayloadsById.set(upgradeId, effectPayloads)
      }
      effectKeys.forEach((effectKeyRaw, index) => {
        const effectKey = asRecord(effectKeyRaw)
        if (effectKey && typeof effectKey.effect_string === 'string') {
          const entry = buildEffectEntry({
            effectString: effectKey.effect_string,
            effect: effectKey,
            effectPayload: effectPayloads[index] ?? null,
            sourceBucket: 'upgrade-effect-key',
            requiredLevel: upgradeRequiredLevel,
            effectPayloads,
            upgradeId,
          })
          upgradeEntries.push(entry)
          if (isSpecialization) {
            specializationEntries.push(entry)
          } else {
            effectEntries.push(entry)
          }
        }
      })
    }

    if (upgradeEntries.length > 0) {
      upgradeEffectEntriesById.set(upgradeId, upgradeEntries)
    }
  }

  for (const lootItemRaw of asUnknownArray(detailRecord?.loot)) {
    const lootItem = asRecord(lootItemRaw)
    if (!lootItem) continue
    for (const effectRaw of asUnknownArray(lootItem.effects)) {
      const effect = asRecord(effectRaw)
      if (effect && typeof effect.effect_string === 'string') {
        effectEntries.push(buildEffectEntry({
          effectString: effect.effect_string,
          effectPayload: parseEffectPayload(effect.effect_string),
          effectPayloads: [],
          sourceBucket: 'loot',
          effect,
        }))
      }
    }
  }

  for (const legendaryEffectRaw of asUnknownArray(detailRecord?.legendaryEffects)) {
    const legendaryEffect = asRecord(legendaryEffectRaw)
    if (!legendaryEffect) continue
    for (const effectRaw of asUnknownArray(legendaryEffect.effects)) {
      const effect = asRecord(effectRaw)
      if (effect && typeof effect.effect_string === 'string') {
        effectEntries.push(buildEffectEntry({
          effectString: effect.effect_string,
          effectPayload: parseEffectPayload(effect.effect_string),
          effectPayloads: [],
          sourceBucket: 'legendary',
          effect,
        }))
      }
    }
  }

  // feat effects（英雄专属固定能力）：与 loot/legendary 同结构（detail.feats[].effects[]），
  // 同属理论最大 carryDps 基线；含 filter_targets/stack_func/per_hero_expr，由消费层
  // attachSignalSemantics 统一处理。「feat 精细乘数」指按玩家实际选择精算，
  // 不影响此处「全 feat 进理论基线」。
  for (const featRaw of asUnknownArray(detailRecord?.feats)) {
    const feat = asRecord(featRaw)
    if (!feat) continue
    for (const effectRaw of asUnknownArray(feat.effects)) {
      const effect = asRecord(effectRaw)
      if (effect && typeof effect.effect_string === 'string') {
        effectEntries.push(buildEffectEntry({
          effectString: effect.effect_string,
          effectPayload: parseEffectPayload(effect.effect_string),
          effectPayloads: [],
          sourceBucket: 'feat',
          effect,
        }))
      }
    }
  }

  // ability 源：detail.ability.effects 已在 normalize 层完成 uptime 折算
  // （value × min(1, duration/baseCooldown)，modron 满级 steady-state），此处按 effect_string 收集，
  // 消费层正常进对应 pool（global_dps/hero_dps/attack_speed/buff_upgrades）。
  const ability = asRecord(detailRecord?.ability)
  if (ability) {
    for (const effectStringRaw of asUnknownArray(ability.effects)) {
      if (typeof effectStringRaw !== 'string' || effectStringRaw === '') continue
      effectEntries.push(buildEffectEntry({
        effectString: effectStringRaw,
        effect: { duration: ability.duration, baseCooldown: ability.baseCooldown },
        effectPayload: parseEffectPayload(effectStringRaw),
        effectPayloads: [],
        sourceBucket: 'ability',
      }))
    }
  }

  // 附加 upgradePayloadsById 到所有 entry，使 resolveNumericValue 能跨 upgrade 解析 amount_expr。
  for (const entry of effectEntries) {
    entry.upgradePayloadsById = upgradePayloadsById
  }
  for (const entry of specializationEntries) {
    entry.upgradePayloadsById = upgradePayloadsById
  }

  return { effectEntries, upgradeEffectEntriesById, staticDpsMults, specializationEntries }
}

/**
 * 专精 upgrade 的 effect entry（collectRawEffectEntries 已按 specializationName 标记分流）。
 * 与 base effect entry 同源同解析（同一 buildEffectEntry），供 specialization-catalog 归一化为
 * 按 upgradeId 索引的可选 signal——保证 catalog signal 与原 base 逐字节一致（ADR 0017）。
 */
export function collectSpecializationEffectEntries(detail: unknown): EffectEntry[] {
  return collectRawEffectEntries(detail).specializationEntries
}

function summarizeBuffUpgradeBase(
  targetEntries: EffectEntry[],
): BuffUpgradeBaseSummary {
  const unresolvedBaseEffectNames: string[] = []
  const ignoredBaseEffectNames: string[] = []
  const resolvedSignals: ResolvedEntrySignal[] = []

  for (const targetEntry of targetEntries) {
    const targetSignalResult = resolveEntrySignal(targetEntry)
    if (targetSignalResult?.ok === true) {
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
      unresolvedReason: null,
      resolvedSignals,
      unresolvedBaseEffectNames,
      ignoredBaseEffectNames,
    }
  }

  let unresolvedReason: string
  if (targetEntries.length === 0) {
    unresolvedReason = 'target-upgrade-missing'
  } else if (unresolvedBaseEffectNames.length > 0) {
    unresolvedReason = 'base-effect-unrecognized'
  } else if (ignoredBaseEffectNames.length > 0) {
    unresolvedReason = 'base-effect-ignored-or-empty'
  } else {
    unresolvedReason = 'base-signal-not-derived'
  }

  return {
    status: 'wrapper-supported-base-unresolved',
    resolvedSignals,
    unresolvedBaseEffectNames,
    ignoredBaseEffectNames,
    unresolvedReason,
  }
}

export function analyzeBuffUpgradeWrappers(detail: unknown): BuffUpgradeWrapperAuditEntry[] {
  const { effectEntries, upgradeEffectEntriesById } = collectRawEffectEntries(detail)
  const auditEntries: BuffUpgradeWrapperAuditEntry[] = []

  for (const entry of effectEntries) {
    const kind = entry.effectPayload?.kind
    if (!isAnyBuffUpgradeWrapperKind(kind) || entry.sourceBucket !== 'upgrade-effect-key') {
      continue
    }

    const wrapperKind = typeof kind === 'string' ? kind : ''
    const targetUpgradeIds = resolveTargetUpgradeIds(entry.effectPayload)
    const wrapperSupported = isBuffUpgradeKind(kind)
    const buffSeed = wrapperSupported ? resolveBuffUpgradeSeed(entry) : null

    if (!wrapperSupported || !buffSeed) {
      auditEntries.push({
        wrapperEffectString: entry.effectString,
        status: 'wrapper-family-unsupported',
        unresolvedReason: !wrapperSupported ? 'wrapper-kind-unsupported' : 'wrapper-seed-unresolved',
        unresolvedBaseEffectNames: [],
        ignoredBaseEffectNames: [],
        wrapperKind,
        targetUpgradeIds,
      })
      continue
    }

    const allTargetEntries = targetUpgradeIds.flatMap((targetUpgradeId) =>
      upgradeEffectEntriesById.get(targetUpgradeId) ?? [],
    )
    const summary = summarizeBuffUpgradeBase(allTargetEntries)

    auditEntries.push({
      wrapperEffectString: entry.effectString,
      status: summary.status,
      unresolvedReason: summary.unresolvedReason,
      unresolvedBaseEffectNames: summary.unresolvedBaseEffectNames,
      ignoredBaseEffectNames: summary.ignoredBaseEffectNames,
      wrapperKind,
      targetUpgradeIds,
    })
  }

  return auditEntries
}

export function splitEffectString(effectString: unknown): { effectName: string; effectValue: string } | null {
  if (typeof effectString !== 'string' || effectString.trim().length === 0) {
    return null
  }

  const [effectName, effectValue = '1'] = effectString.split(',', 2)
  return { effectName: effectName ?? '', effectValue }
}

// derived signal 身份 key：捕获影响 pool 聚合语义的字段（kind/amountFunc/stackFunc/base targeting），
// 排除 magnitude（value）。用于识别「同一信号位」——同 key 的 wrapper 视为同一信号位，首次出现保留
// （去重 CNE 重复展开副本，不折叠不同 upgrade 的独立 wrapper）。详见 collectEffectEntries 去重策略。
function rarityGroupKey(preset: HeroAbilitySignal): string {
  return JSON.stringify({
    kind: preset.kind,
    amountFunc: preset.amountFunc,
    stackFunc: preset.stackFunc,
    bonusScaleRawEffect: preset.bonusScaleOfSignal?.rawEffect ?? null,
    targetQualifier: preset.targetQualifier ?? null,
    formationCountQualifier: preset.formationCountQualifier ?? null,
    positionQualifier: preset.positionQualifier ?? null,
    formationCountPositionQualifier: preset.formationCountPositionQualifier ?? null,
  })
}

// 同信号位已有 entry 时是否应以 candidate 替换：loot/feat 装备源同槽多 rarity（upgradeId=null→同 key）
// 装备每槽只装一件最高 rarity，取最大 magnitude（保守上界）。upgrade 源 CNE 重复展开副本 magnitude
// 相同，取 max 等价首条保留，无副作用。magnitude 缺失（非数值）不替换。
function shouldReplaceWithHigherMagnitude(existing: EffectEntry | undefined, candidate: EffectEntry): boolean {
  const existingValue = existing?.signalPreset?.value
  const candidateValue = candidate.signalPreset?.value
  if (typeof candidateValue !== 'number' || typeof existingValue !== 'number') {
    return false
  }
  return candidateValue > existingValue
}

export function collectEffectEntries(detail: unknown): {
  entries: EffectEntry[]
  /** buff_upgrade wrapper 派生信号中靶向专精的部分，按 target spec upgradeId 归集（进 catalog，不进 base）。 */
  specializationDerived: Map<string, EffectEntry[]>
} {
  const { effectEntries, upgradeEffectEntriesById, staticDpsMults, specializationEntries } = collectRawEffectEntries(detail)

  // 专精 upgradeId 集合：wrapper 派生信号若靶向专精，路由到 catalog（附到该 spec），不进 base。
  // 修复 ADR 0017 偏差：专精外部化后 wrapper 仍能找到专精作 target，派生增益（如明斯克偏好敌人 +25%）
  // 随专精进 catalog，runtime 按玩家选择注入，而非丢失或泄漏到 base。
  const specializationUpgradeIds = new Set<string>()
  for (const entry of specializationEntries) {
    if (entry.upgradeId != null && entry.upgradeId !== '') {
      specializationUpgradeIds.add(entry.upgradeId)
    }
  }

  const derivedByKey = new Map<string, EffectEntry>()
  // spec upgradeId →（dedupKey → 派生 entry）
  const specializationDerivedByKey = new Map<string, Map<string, EffectEntry>>()

  for (const entry of effectEntries) {
    if (!isBuffUpgradeKind(entry.effectPayload?.kind)) {
      continue
    }

    // 审计根因（2026-07-28）：buff-upgrade-progression-exclusion（归一化期排除，非评估机制）
    // IC 的 effect_def effect_string 是满级 snapshot 计算值，已含该 ability 自身 upgrade 树的全部静态
    // buff_upgrade 贡献（ranked effectReference 节点 + 同 ability 源 effect_keys 静态修饰，如蔚劝人向善）。
    // 证据：蔚善良榜样 effect_string=300 含 20 条 ranked buff_upgrade,100,12312 + 劝人向善 buff_upgrade,200,12312，
    // 游戏显示 per-stack 恰好 +300%（4^7=16384），叠层系数 2.92e7=4^7×576×1.2×2.578 只含 2 个外部修饰器
    // （道德规范专长 / 时髦披肩装备）。若独立 ×3 则叠层系数应 8.76e7，实测 2.92e7 → 劝人向善贡献已在 300。
    // 故 ability 源（upgrade effectReference / effect_keys）的静态 plain buff_upgrade 不再派生计入目标值信号，
    // 否则每条叠 base.value×X/100 进 addPercent → 蔚 damage:hero pool 6.4e8 vs 游戏 2.92e7（22× 高估），
    // 影响 162/164 英雄、4727 条 ability 源静态 entry。
    // 保留三类运行时修饰：(1) stacks_multiply 动态（area 依赖，如蔚出言不逊）；(2) 复杂 wrapper（per_tagged /
    // distance 等，阵型依赖）；(3) 外部源 loot/feat/legendary（装备/feat/专长，不在 ability snapshot 内）。
    const buffUpgradeKind = entry.effectPayload.kind
    const isPlainBuffUpgrade = buffUpgradeKind === 'buff_upgrade' || buffUpgradeKind === 'buff_upgrades'
    const isAbilitySource = entry.sourceBucket === 'upgrade' || entry.sourceBucket === 'upgrade-effect-key'
    const isDynamicStacks = asRecord(entry.effect)?.stacks_multiply === true
    if (isPlainBuffUpgrade && isAbilitySource && !isDynamicStacks) {
      continue
    }

    const buffSeed = resolveBuffUpgradeSeed(entry)
    if (!buffSeed) {
      continue
    }

    const targetUpgradeIds = resolveTargetUpgradeIds(entry.effectPayload)
    for (const targetUpgradeId of targetUpgradeIds) {
      const targetIdStr = targetUpgradeId
      const targetsSpecialization = specializationUpgradeIds.has(targetIdStr)
      const targetEntries = upgradeEffectEntriesById.get(targetIdStr) ?? []
      for (const targetEntry of targetEntries) {
        const targetSignalResult = resolveEntrySignal(targetEntry)
        if (targetSignalResult?.ok !== true) {
          continue
        }

        const targetSignal = targetSignalResult.signal
        // wrapper 自身的 filter_targets（如 hero_ids 白名单）限定 buff 只对特定英雄生效；
        // 合并到 base 的 targetQualifier（AND），避免 wrapper 层 targeting 丢失。
        const wrapperQualifier = normalizeTargetQualifier(entry.effect)
        // per_hero_expr 不会传到 wrapper：signalPreset 直接用预设信号，不走 attachSignalSemantics，
        // 所以 wrapper 上的 per_hero_expr 不会被解析。
        // 2026-08-08 全量验证（287 个 wrapper）确认没问题：带 HasEffect 条件的 buff_upgrade
        // 全是技能树自带的，在 line 764 就被排除了；能存活到这里的 wrapper 带的都是
        // int/cha/dex 这类数值算式，不是条件判断，丢掉不影响。
        const preset: HeroAbilitySignal = {
          ...targetSignal,
          targetQualifier: mergeHeroQualifiers(targetSignal.targetQualifier ?? null, wrapperQualifier),
          rawEffect: entry.effectString,
          value: resolveNumericValue(
            entry.effectPayload.args[0] ?? '',
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

        // 同信号位去重：key=rarityGroupKey@wrapperUpgradeId。同 upgrade 内重复展开的 wrapper（同位同源）
        // 只生效一次（首条保留）；不同 upgrade 的 wrapper upgradeId 不同，各自独立。
        const key = `${rarityGroupKey(preset)}@${entry.upgradeId ?? '?'}`
        // 派生信号靶向专精 → 路由到 catalog（附到 target spec），不进 base；其余进 base derivedByKey。
        // sourceBucket 透传原始 wrapper 来源（upgrade-effect-key/loot/legendary），不用统一别名——
        // buildHeroModels 的源过滤据此拦截外部装备源（loot/legendary）不进 scored profile
        // （加成源唯一性不变式，见 simulator.md + modeling-pitfalls.md）。
        const buffedEntry = buildEffectEntry({
          effectString: entry.effectString,
          effect: entry.effect,
          effectPayload: entry.effectPayload,
          effectPayloads: entry.effectPayloads,
          sourceBucket: entry.sourceBucket,
          upgradeId: entry.upgradeId,
          bucketOverride: targetSignalResult.bucket,
          signalPreset: preset,
        })
        if (targetsSpecialization) {
          const inner = specializationDerivedByKey.get(targetIdStr) ?? new Map<string, EffectEntry>()
          if (!inner.has(key) || shouldReplaceWithHigherMagnitude(inner.get(key), buffedEntry)) {
            inner.set(key, buffedEntry)
          }
          specializationDerivedByKey.set(targetIdStr, inner)
        } else if (!derivedByKey.has(key) || shouldReplaceWithHigherMagnitude(derivedByKey.get(key), buffedEntry)) {
          derivedByKey.set(key, buffedEntry)
        }
      }
    }
  }

  const allEntries = [...effectEntries, ...derivedByKey.values()]

  // static_dps_mult fallback（见 simulator.md「加成聚合与 DPS 公式」Π(static_dps_mults)）：upgrade 带 static_dps_mult
  // （CNE 静态 dps 乘数近似）且其 effect 未产出可解析 signal（复杂机制 effect 进 unsupported）时，
  // 生成一个 mult signal 作为静态近似，避免 dps 贡献丢失。防重复：该 upgrade 已有可解析
  // signal（含 wrapper 派生的 signalPreset entry）时不 fallback。
  if (staticDpsMults.size > 0) {
    const upgradesWithSignal = new Set<string>()
    for (const entry of allEntries) {
      if (entry.upgradeId == null || entry.upgradeId === '') continue
      if (entry.signalPreset) {
        upgradesWithSignal.add(entry.upgradeId)
        continue
      }
      const result = resolveEntrySignal(entry)
      if (result?.ok === true) {
        upgradesWithSignal.add(entry.upgradeId)
      }
    }
    for (const [upgradeId, mult] of staticDpsMults) {
      if (upgradesWithSignal.has(upgradeId)) continue
      allEntries.push(buildEffectEntry({
        effectString: `static_dps_mult,${String(mult)}`,
        effect: {},
        effectPayload: null,
        effectPayloads: [],
        sourceBucket: 'static-dps',
        bucketOverride: 'carrySignals',
        signalPreset: {
          kind: 'heroDpsMultiplier',
          value: (mult - 1) * 100,
          rawEffect: `static_dps_mult,${String(mult)}`,
          source: 'official-parsed',
          amountFunc: 'mult',
        },
        upgradeId,
      }))
    }
  }

  const specializationDerived = new Map<string, EffectEntry[]>()
  for (const [specId, inner] of specializationDerivedByKey) {
    specializationDerived.set(specId, [...inner.values()])
  }
  return { entries: allEntries, specializationDerived }
}

import {
  buildEffectKeyPayload,
  extractTargetIdsFromParsedEffectPayload,
  parseEffectPayload,
  resolveEffectPayloadAmountToken,
  type ParsedEffectPayload,
} from '../../src/domain/effects/effect-string.ts'
import {
  attachSignalSemantics,
  mergeHeroQualifiers,
  normalizeExplicitTargeting,
  normalizeStatQualifiers,
  statQualifiersToNodes,
  normalizeTargetQualifier,
  parsePerHeroExpr,
} from '../../src/domain/abilities/signalSemantics.ts'
import { parseHeroPredicate } from '../../src/domain/abilities/heroPredicate.ts'
import type { JsonValue } from '../../src/domain/types'
import type {
  HeroAbilityAmountFunc,
  HeroAbilityKind,
  HeroAbilitySignal,
  HeroAbilitySource,
  HeroPositionQualifier,
  HeroPositionRelation,
  HeroQualifier,
  HeroUnsupportedSignal,
} from '../../src/domain/abilities/abilityModel'

// === Internal types ===

type SignalBucket = 'supportSignals' | 'carrySignals'

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
}

// normalizeEffectSignal 接收的 metadata：所有字段可选（默认 {}），
// 调用方通常传完整 EffectEntry，但也允许空对象走 fallback 路径。
interface EffectSignalMetadata {
  signalPreset?: HeroAbilitySignal | null
  bucketOverride?: SignalBucket | null
  effectPayload?: ParsedEffectPayload | null
  effectPayloads?: Array<ParsedEffectPayload | null | undefined>
  upgradePayloadsById?: Map<string, Array<ParsedEffectPayload | null | undefined>> | null
  effect?: unknown
}

type EffectSignalResult =
  | { ok: true; signal: HeroAbilitySignal; bucket: SignalBucket }
  | { ok: false; unsupported: HeroUnsupportedSignal }

interface EffectResolveContext {
  effectName: string
  effectValue: string
  source: HeroAbilitySource
  numericValue: number
  rawEffect: string
  effectMetadata: EffectSignalMetadata
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

function resolveNumericValue(
  effectValue: string,
  effectPayload: ParsedEffectPayload | null | undefined,
  effectPayloads: Array<ParsedEffectPayload | null | undefined> | null | undefined,
  upgradePayloadsById: Map<string, Array<ParsedEffectPayload | null | undefined>> | null | undefined,
): number {
  if (effectPayload && typeof effectPayload.meta?.amount_expr === 'string') {
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

function buildRawEffect(
  effectName: string,
  effectValue: string,
  effectPayload: ParsedEffectPayload | null | undefined,
): string {
  return effectPayload?.effectString ?? `${effectName},${effectValue}`
}

function resolveBucket(effect: unknown): { ok: true; bucket: SignalBucket } | { ok: false; note: string } {
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

function resolveCountRelation(rawTarget: unknown): HeroPositionRelation | null {
  const targeting = normalizeExplicitTargeting({ targets: [rawTarget] })

  // 'all' / 'all_slots' → relation 'any' = 全阵位计数（不计位置，只按 formationCountQualifier
  // 计数所有匹配英雄）。消费层 countQualifiedHeroes 已显式支持 'any'（跳过 matchesSlotRelation），
  // 故此处放行；曾因 relation==='any' 返回 null，导致全阵位 per_target_crusader effect 被静默丢弃。
  if (targeting.status !== 'supported') {
    return null
  }

  return targeting.relation
}

function parseTagQualifierFromArg(rawValue: unknown): HeroQualifier | null {
  if (typeof rawValue !== 'string') {
    return null
  }
  const predicate = parseHeroPredicate(rawValue, 'shorthand')
  return predicate ? { predicate } : null
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
 * crit effect 名 → (kind, amountFunc) 映射。
 * 默认暴击 chance/damage 由 crit_factor 公式（steadyStateScoring）应用，不在此处。
 */
const CRIT_KIND_BY_EFFECT: Record<string, { kind: HeroAbilityKind; amountFunc: HeroAbilityAmountFunc }> = {
  buff_base_crit_chance_add: { kind: 'heroCritChance', amountFunc: 'add' },
  buff_base_crit_chance_mult: { kind: 'heroCritChance', amountFunc: 'mult' },
  buff_base_crit_damage: { kind: 'heroCritDamage', amountFunc: 'add' },
  buff_base_crit_damage_mult: { kind: 'heroCritDamage', amountFunc: 'mult' },
  global_buff_base_crit_chance_add: { kind: 'globalCritChance', amountFunc: 'add' },
  global_buff_base_crit_damage_add: { kind: 'globalCritDamage', amountFunc: 'add' },
  global_buff_base_crit_damage_mult: { kind: 'globalCritDamage', amountFunc: 'mult' },
}

/**
 * survival effect 名 → (kind, amountFunc) 映射。
 * health/healing 折入 health multiplier（MVP：healing 近似为生命加成，survival 软约束）；
 * damage_reduction 单独 kind（玩家侧减伤，作用于 incoming damage）。
 */
const SURVIVAL_KIND_BY_EFFECT: Record<string, { kind: HeroAbilityKind; amountFunc: HeroAbilityAmountFunc }> = {
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
 * vulnerability effect 名 → monsterTags 映射。
 * null = 无条件（对任意怪物生效）；数组 = 仅当场景 enemyTypes 含其中任一 tag 时生效。
 * increase_damage_against_monster_tag 的 tag 动态取自 args[1]，单独处理（| 为 OR，词表与 enemyTypes 一致）。
 */
const VULNERABILITY_MONSTER_TAGS_BY_EFFECT: Record<string, string[] | null> = {
  damage_increase: null,
  increase_damage_against_monster: null,
  increase_armored_damage: ['armored'],
  bonus_armored_damage: ['armored'],
}

/**
 * speed/cooldown effect 名 → (kind, amountFunc) 映射。
 * attack_speed_mult/time_scale → attackSpeedMult（mult）；reduce_attack_cooldown → attackSpeedMult（add，
 * 减少攻击冷却=提速）；reduce_ultimate_cooldown/ability_cooldown_reduction_mult → cooldownReduction。
 */
const SPEED_KIND_BY_EFFECT: Record<string, { kind: HeroAbilityKind; amountFunc: HeroAbilityAmountFunc }> = {
  base_attack_speed_mult: { kind: 'attackSpeedMult', amountFunc: 'mult' },
  ult_attack_speed_mult: { kind: 'attackSpeedMult', amountFunc: 'mult' },
  time_scale: { kind: 'attackSpeedMult', amountFunc: 'mult' },
  time_scale_when_not_attacked: { kind: 'attackSpeedMult', amountFunc: 'mult' },
  reduce_attack_cooldown: { kind: 'attackSpeedMult', amountFunc: 'add' },
  reduce_ultimate_cooldown: { kind: 'cooldownReduction', amountFunc: 'add' },
  ability_cooldown_reduction_mult: { kind: 'cooldownReduction', amountFunc: 'mult' },
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
  return isBuffUpgradeKind(rawEffect)
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
  return { predicate: nodes.length === 1 ? nodes[0]! : { op: 'and', children: nodes } }
}

function resolveBuffUpgradeSeed(entry: EffectEntry): BuffUpgradeSeed | null {
  const payload = entry.effectPayload
  if (!payload) {
    return null
  }

  if (payload.kind === 'buff_upgrade' || payload.kind === 'buff_upgrades') {
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
    signal: attachSignalSemantics(parsed.signal, entry.effect),
    bucket: parsed.bucket,
  }
}

function collectRawEffectEntries(detail: unknown): {
  effectEntries: EffectEntry[]
  upgradeEffectEntriesById: Map<string, EffectEntry[]>
  staticDpsMults: Map<string, number>
} {
  const detailRecord = asRecord(detail)
  const effectEntries: EffectEntry[] = []
  const upgradeEffectEntriesById = new Map<string, EffectEntry[]>()
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

    const staticDpsMultRaw = upgrade.staticDpsMult
    const staticDpsMult = typeof staticDpsMultRaw === 'number'
      ? staticDpsMultRaw
      : typeof staticDpsMultRaw === 'string' && staticDpsMultRaw !== ''
        ? Number.parseFloat(staticDpsMultRaw)
        : NaN
    if (Number.isFinite(staticDpsMult) && staticDpsMult > 1 && upgradeId) {
      staticDpsMults.set(upgradeId, staticDpsMult)
    }

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
      if (upgradeId) {
        upgradePayloadsById.set(upgradeId, effectPayloads)
      }
      effectKeys.forEach((effectKeyRaw, index) => {
        const effectKey = asRecord(effectKeyRaw)
        if (effectKey && typeof effectKey.effect_string === 'string') {
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
          effect,
          effectPayload: parseEffectPayload(effect.effect_string),
          effectPayloads: [],
          sourceBucket: 'loot',
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
          effect,
          effectPayload: parseEffectPayload(effect.effect_string),
          effectPayloads: [],
          sourceBucket: 'legendary',
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
          effect,
          effectPayload: parseEffectPayload(effect.effect_string),
          effectPayloads: [],
          sourceBucket: 'feat',
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

  return { effectEntries, upgradeEffectEntriesById, staticDpsMults }
}

function summarizeBuffUpgradeBase(
  targetEntries: EffectEntry[],
): BuffUpgradeBaseSummary {
  const unresolvedBaseEffectNames: string[] = []
  const ignoredBaseEffectNames: string[] = []
  const resolvedSignals: ResolvedEntrySignal[] = []

  for (const targetEntry of targetEntries) {
    const targetSignalResult = resolveEntrySignal(targetEntry)
    if (targetSignalResult && targetSignalResult.ok) {
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
        wrapperKind,
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
    const summary = summarizeBuffUpgradeBase(allTargetEntries)

    auditEntries.push({
      wrapperKind,
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

// 构造 unsupported 结果。normalizeEffectSignal 各分支共用，集中此处避免重复。
function makeUnsupported(
  effectName: string,
  effectValue: string,
  note: string,
  source: HeroAbilitySource,
): EffectSignalResult {
  return {
    ok: false,
    unsupported: { rawEffect: effectName, rawValue: effectValue, note, source },
  }
}

// crit/survival/speed 三个 map 派发池共用信号形状：kind + value + 可选 amountFunc=mult。
function buildSimplePoolSignal(
  ctx: Pick<EffectResolveContext, 'numericValue' | 'rawEffect' | 'source'>,
  kind: HeroAbilityKind,
  amountFunc: HeroAbilityAmountFunc,
  bucket: SignalBucket,
): EffectSignalResult {
  return {
    ok: true,
    signal: {
      kind,
      value: ctx.numericValue,
      rawEffect: ctx.rawEffect,
      source: ctx.source,
      ...(amountFunc === 'mult' ? { amountFunc: 'mult' } : {}),
    },
    bucket,
  }
}

// hero_dps_mult_per_target_crusader[_mult|_prebonus_mult]：按位置计数目标。
// add（单数名）/ mult（_mult、_prebonus_mult）仅 amountFunc 不同，其余逻辑一致。
function resolveHeroDpsPerTarget(ctx: EffectResolveContext, amountFunc: HeroAbilityAmountFunc): EffectSignalResult {
  const { effectName, effectValue, source, numericValue, rawEffect, effectMetadata } = ctx
  const bucketResult = resolveBucket(effectMetadata.effect)
  if (!bucketResult.ok) {
    return makeUnsupported(effectName, effectValue, bucketResult.note, source)
  }

  const countRelation = resolveCountRelation(effectMetadata.effectPayload?.args?.[1] ?? null)
  if (!countRelation) {
    return makeUnsupported(
      effectName,
      effectValue,
      `Unsupported per-target count relation: ${JSON.stringify(effectMetadata.effectPayload?.args?.[1] ?? null)}`,
      source,
    )
  }

  return {
    ok: true,
    signal: {
      kind: 'heroDpsMultiplier',
      value: numericValue,
      rawEffect,
      source,
      amountFunc,
      stackFunc: 'per_target_crusader',
      formationCountPositionQualifier: { relation: countRelation },
    },
    bucket: bucketResult.bucket,
  }
}

// hero_dps_mult_per_tagged_crusader_mult[_amount_before]：按 tag 计数。两个 effect 逻辑完全一致。
function resolveHeroDpsPerTagged(ctx: EffectResolveContext): EffectSignalResult {
  const { effectName, effectValue, source, numericValue, rawEffect, effectMetadata } = ctx
  const bucketResult = resolveBucket(effectMetadata.effect)
  if (!bucketResult.ok) {
    return makeUnsupported(effectName, effectValue, bucketResult.note, source)
  }

  const formationCountQualifier = parseTagQualifierFromArg(effectMetadata.effectPayload?.args?.[1] ?? null)
  if (!formationCountQualifier) {
    return makeUnsupported(
      effectName,
      effectValue,
      `Unsupported tagged count qualifier: ${JSON.stringify(effectMetadata.effectPayload?.args?.[1] ?? null)}`,
      source,
    )
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

// DPS 池。global_dps_multiplier_mult → 全队；hero_dps_* → 英雄侧（carry/support 按 targeting）。
function resolveDpsSignal(ctx: EffectResolveContext): EffectSignalResult | null {
  const { effectName, effectValue, source, numericValue, rawEffect, effectMetadata } = ctx

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
      return makeUnsupported(effectName, effectValue, explicitTargeting.note, source)
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
    return resolveHeroDpsPerTarget(ctx, 'add')
  }

  if (
    effectName === 'hero_dps_mult_per_target_crusader_mult'
    || effectName === 'hero_dps_mult_per_target_crusader_prebonus_mult'
  ) {
    return resolveHeroDpsPerTarget(ctx, 'mult')
  }

  if (
    effectName === 'hero_dps_mult_per_tagged_crusader_mult'
    || effectName === 'hero_dps_mult_per_tagged_crusader_mult_amount_before'
  ) {
    return resolveHeroDpsPerTagged(ctx)
  }

  if (effectName === 'hero_dps_mult_per_crusader_mult') {
    const bucketResult = resolveBucket(effectMetadata.effect)
    if (!bucketResult.ok) {
      return makeUnsupported(effectName, effectValue, bucketResult.note, source)
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
      return makeUnsupported(effectName, effectValue, bucketResult.note, source)
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

  return null
}

// adjacent_* 前缀 → 邻位 buff。
function resolveAdjacentSignal(ctx: Pick<EffectResolveContext, 'effectName' | 'numericValue' | 'rawEffect' | 'source'>): EffectSignalResult | null {
  const { effectName, numericValue, rawEffect, source } = ctx
  if (!effectName.startsWith('adjacent_')) {
    return null
  }
  return {
    ok: true,
    signal: { kind: 'adjacentBuff', value: numericValue, rawEffect, source },
    bucket: 'supportSignals',
  }
}

// 金币池（gold find 全队聚合 stat → globalGoldMultiplier）。
function resolveGoldSignal(ctx: EffectResolveContext): EffectSignalResult | null {
  const { effectName, effectValue, source, numericValue, rawEffect, effectMetadata } = ctx

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
      return makeUnsupported(
        effectName,
        effectValue,
        `Unsupported tagged count qualifier: ${JSON.stringify(effectMetadata.effectPayload?.args?.[1] ?? null)}`,
        source,
      )
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

  return null
}

// 暴击池（chance/damage 各 global/hero；默认值来自 default_crit_info，在 crit_factor 公式应用，不在解析层）。
function resolveCritSignal(ctx: EffectResolveContext): EffectSignalResult | null {
  const match = CRIT_KIND_BY_EFFECT[ctx.effectName]
  return match ? buildSimplePoolSignal(ctx, match.kind, match.amountFunc, 'supportSignals') : null
}

// survival 池（health/healing/damage_reduction）。
function resolveSurvivalSignal(ctx: EffectResolveContext): EffectSignalResult | null {
  const match = SURVIVAL_KIND_BY_EFFECT[ctx.effectName]
  return match ? buildSimplePoolSignal(ctx, match.kind, match.amountFunc, 'supportSignals') : null
}

// vulnerability 池（敌人侧受伤倍率，条件性按怪物 tag）。
function resolveVulnerabilitySignal(ctx: EffectResolveContext): EffectSignalResult | null {
  const { effectName, source, numericValue, rawEffect, effectMetadata } = ctx

  if (effectName === 'increase_damage_against_monster_tag') {
    const tagArg = effectMetadata.effectPayload?.args?.[1] ?? null
    const monsterTags = typeof tagArg === 'string'
      ? tagArg.split('|').map((tag) => tag.trim()).filter(Boolean)
      : null
    return {
      ok: true,
      signal: {
        kind: 'enemyVulnerability',
        value: numericValue,
        rawEffect,
        source,
        monsterTags: monsterTags && monsterTags.length > 0 ? monsterTags : null,
      },
      bucket: 'supportSignals',
    }
  }

  const vulnMatch = VULNERABILITY_MONSTER_TAGS_BY_EFFECT[effectName]
  if (vulnMatch !== undefined) {
    return {
      ok: true,
      signal: {
        kind: 'enemyVulnerability',
        value: numericValue,
        rawEffect,
        source,
        monsterTags: vulnMatch,
      },
      bucket: 'supportSignals',
    }
  }

  return null
}

// speed/cooldown 池（进 pool 供覆盖率与未来 ult/step-simulation 消费；7.2 决定不进 carryDps——
// hero_dps 按秒模型，speed 精确建模依赖 BUD/cooldown，MVP 暂不应用）。
function resolveSpeedSignal(ctx: EffectResolveContext): EffectSignalResult | null {
  const match = SPEED_KIND_BY_EFFECT[ctx.effectName]
  return match ? buildSimplePoolSignal(ctx, match.kind, match.amountFunc, 'supportSignals') : null
}

// tag_* 前缀 → tagged champion buff。
function resolveTagSignal(ctx: Pick<EffectResolveContext, 'effectName' | 'numericValue' | 'rawEffect' | 'source'>): EffectSignalResult | null {
  const { effectName, numericValue, rawEffect, source } = ctx
  if (!effectName.startsWith('tag_')) {
    return null
  }
  return {
    ok: true,
    signal: { kind: 'taggedChampionBuff', value: numericValue, rawEffect, source },
    bucket: 'supportSignals',
  }
}

export function normalizeEffectSignal(
  effectName: string,
  effectValue: string,
  source: HeroAbilitySource,
  effectMetadata: EffectSignalMetadata = {},
): EffectSignalResult {
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
    return makeUnsupported(effectName, effectValue, `Effect value is not numeric: ${effectValue}`, source)
  }

  const ctx: EffectResolveContext = { effectName, effectValue, source, numericValue, rawEffect, effectMetadata }

  return (
    resolveDpsSignal(ctx)
    ?? resolveAdjacentSignal(ctx)
    ?? resolveGoldSignal(ctx)
    ?? resolveCritSignal(ctx)
    ?? resolveSurvivalSignal(ctx)
    ?? resolveVulnerabilitySignal(ctx)
    ?? resolveSpeedSignal(ctx)
    ?? resolveTagSignal(ctx)
    ?? makeUnsupported(effectName, effectValue, `No parser for effect: ${effectName}`, source)
  )
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

export function collectEffectEntries(detail: unknown): EffectEntry[] {
  const { effectEntries, upgradeEffectEntriesById, staticDpsMults } = collectRawEffectEntries(detail)

  const derivedByKey = new Map<string, EffectEntry>()

  for (const entry of effectEntries) {
    if (!isBuffUpgradeKind(entry.effectPayload?.kind)) {
      continue
    }

    // 审计根因（2026-07-28）：buff-upgrade-progression-exclusion（归一化期排除，非评分机制）
    // IC 的 effect_def effect_string 是满级 snapshot 计算值，已含该 ability 自身 upgrade 树的全部静态
    // buff_upgrade 贡献（ranked effectReference 节点 + 同 ability 源 effect_keys 静态修饰，如蔚劝人向善）。
    // 证据：蔚善良榜样 effect_string=300 含 20 条 ranked buff_upgrade,100,12312 + 劝人向善 buff_upgrade,200,12312，
    // 游戏显示 per-stack 恰好 +300%（4^7=16384），叠层系数 2.92e7=4^7×576×1.2×2.578 只含 2 个外部修饰器
    // （道德规范专长 / 时髦披肩装备）。若独立 ×3 则叠层系数应 8.76e7，实测 2.92e7 → 劝人向善贡献已在 300。
    // 故 ability 源（upgrade effectReference / effect_keys）的静态 plain buff_upgrade 不再派生计分信号，
    // 否则每条叠 base.value×X/100 进 addPercent → 蔚 damage:hero pool 6.4e8 vs 游戏 2.92e7（22× 高估），
    // 影响 162/164 英雄、4727 条 ability 源静态 entry。
    // 保留三类运行时修饰：(1) stacks_multiply 动态（area 依赖，如蔚出言不逊）；(2) 复杂 wrapper（per_tagged /
    // distance 等，阵型依赖）；(3) 外部源 loot/feat/legendary（装备/feat/专长，不在 ability snapshot 内）。
    const buffUpgradeKind = entry.effectPayload?.kind
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
      const targetEntries = upgradeEffectEntriesById.get(String(targetUpgradeId)) ?? []
      for (const targetEntry of targetEntries) {
        const targetSignalResult = resolveEntrySignal(targetEntry)
        if (!targetSignalResult || !targetSignalResult.ok) {
          continue
        }

        const targetSignal = targetSignalResult.signal
        // wrapper 自身的 filter_targets（如 hero_ids 白名单）限定 buff 只对特定英雄生效；
        // 合并到 base 的 targetQualifier（AND），避免 wrapper 层 targeting 丢失。
        const wrapperQualifier = normalizeTargetQualifier(entry.effect)
        const preset: HeroAbilitySignal = {
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

        // 同信号位去重：key=rarityGroupKey@upgradeId。同 upgrade 内重复展开的 wrapper（同位同源）
        // 只生效一次（首条保留）；不同 upgrade 的 wrapper upgradeId 不同，各自独立。
        const key = `${rarityGroupKey(preset)}@${entry.upgradeId ?? '?'}`
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

  const allEntries = [...effectEntries, ...derivedByKey.values()]

  // static_dps_mult fallback（见 development-design-simulator.md「加成聚合与 DPS 公式」Π(static_dps_mults)）：upgrade 带 static_dps_mult
  // （CNE 静态 dps 乘数近似）且其 effect 未产出可解析 signal（复杂机制 effect 进 unsupported）时，
  // 生成一个 mult signal 作为静态近似，避免 dps 贡献丢失。防重复：该 upgrade 已有可解析
  // signal（含 wrapper 派生的 signalPreset entry）时不 fallback。
  if (staticDpsMults.size > 0) {
    const upgradesWithSignal = new Set<string>()
    for (const entry of allEntries) {
      if (!entry.upgradeId) continue
      if (entry.signalPreset) {
        upgradesWithSignal.add(entry.upgradeId)
        continue
      }
      const result = resolveEntrySignal(entry)
      if (result?.ok) {
        upgradesWithSignal.add(entry.upgradeId)
      }
    }
    for (const [upgradeId, mult] of staticDpsMults) {
      if (upgradesWithSignal.has(upgradeId)) continue
      allEntries.push(buildEffectEntry({
        effectString: `static_dps_mult,${mult}`,
        effect: {},
        effectPayload: null,
        effectPayloads: [],
        sourceBucket: 'static-dps',
        upgradeId,
        bucketOverride: 'carrySignals',
        signalPreset: {
          kind: 'heroDpsMultiplier',
          value: (mult - 1) * 100,
          rawEffect: `static_dps_mult,${mult}`,
          source: 'official-parsed',
          amountFunc: 'mult',
        },
      }))
    }
  }

  return allEntries
}

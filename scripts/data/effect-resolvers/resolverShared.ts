import {
  resolveEffectPayloadAmountToken,
  type ParsedEffectPayload,
} from '../../../src/domain/effects/effect-string.ts'
import { normalizeExplicitTargeting } from '../../../src/domain/abilities/signalSemantics.ts'
import { parseHeroPredicate } from '../../../src/domain/abilities/heroPredicate.ts'
import {
  POOL_SCOPE_BY_KIND,
  type HeroAbilityAmountFunc,
  type HeroAbilityKind,
  type HeroAbilitySignal,
  type HeroAbilitySource,
  type HeroPositionRelation,
  type HeroQualifier,
  type HeroUnsupportedSignal,
} from '../../../src/domain/abilities/abilityModel'

// === Shared resolver types ===

export type SignalBucket = 'supportSignals' | 'carrySignals'

// normalizeEffectSignal 接收的 metadata：所有字段可选（默认 {}），
// 调用方通常传完整 EffectEntry，但也允许空对象走 fallback 路径。
export interface EffectSignalMetadata {
  signalPreset?: HeroAbilitySignal | null
  bucketOverride?: SignalBucket | null
  effectPayload?: ParsedEffectPayload | null
  effectPayloads?: Array<ParsedEffectPayload | null | undefined>
  upgradePayloadsById?: Map<string, Array<ParsedEffectPayload | null | undefined>> | null
  effect?: unknown
}

export type EffectSignalResult =
  | { ok: true; signal: HeroAbilitySignal; bucket: SignalBucket }
  | { ok: false; unsupported: HeroUnsupportedSignal }

export interface EffectResolveContext {
  effectName: string
  effectValue: string
  source: HeroAbilitySource
  numericValue: number
  rawEffect: string
  effectMetadata: EffectSignalMetadata
}

// === Shared resolver helpers ===

// 构造 unsupported 结果。各 resolver 共用，集中此处避免重复。
export function makeUnsupported(
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
export function buildSimplePoolSignal(
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

// 按 explicit targeting 判定 signal 落 carry 还是 support 池。
export function resolveBucket(effect: unknown): { ok: true; bucket: SignalBucket } | { ok: false; note: string } {
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

/**
 * crit/survival/speed map 派发池的 bucket 判定（替代原先一刀切 'supportSignals'）：
 * - global 池（globalCrit/globalHealth/damageReduction/cooldownReduction）全队生效 → 恒 supportSignals。
 * - hero 池（heroCrit/heroHealth/attackSpeed）按 explicit targeting：无目标=自身增益→carrySignals，
 *   有非 self 目标=光环→supportSignals；targeting 不可解析→unsupported。
 *   与 dpsResolver 的 hero_dps_multiplier_mult 一致——同是无 target 的英雄侧 stat 增益视为自身。
 *   依据：effect_def id 1603「Increases $source's Critical Hit chance」(无 target=自身) vs
 *   id 1504「all Companions」(targets:["all"]+filter=光环)。
 */
export function resolvePoolSignal(
  ctx: EffectResolveContext,
  kind: HeroAbilityKind,
  amountFunc: HeroAbilityAmountFunc,
): EffectSignalResult {
  if (POOL_SCOPE_BY_KIND[kind] === 'global') {
    return buildSimplePoolSignal(ctx, kind, amountFunc, 'supportSignals')
  }

  const bucketResult = resolveBucket(ctx.effectMetadata.effect)
  if (!bucketResult.ok) {
    return makeUnsupported(ctx.effectName, ctx.effectValue, bucketResult.note, ctx.source)
  }

  return buildSimplePoolSignal(ctx, kind, amountFunc, bucketResult.bucket)
}

export function resolveCountRelation(rawTarget: unknown): HeroPositionRelation | null {
  const targeting = normalizeExplicitTargeting({ targets: [rawTarget] })

  // 'all' / 'all_slots' → relation 'any' = 全阵位计数（不计位置，只按 formationCountQualifier
  // 计数所有匹配英雄）。消费层 countQualifiedHeroes 已显式支持 'any'（跳过 matchesSlotRelation），
  // 故此处放行；曾因 relation==='any' 返回 null，导致全阵位 per_target_crusader effect 被静默丢弃。
  if (targeting.status !== 'supported') {
    return null
  }

  return targeting.relation
}

export function parseTagQualifierFromArg(rawValue: unknown): HeroQualifier | null {
  if (typeof rawValue !== 'string') {
    return null
  }
  const predicate = parseHeroPredicate(rawValue, 'shorthand')
  return predicate ? { predicate } : null
}

// 解析 effect 数值：优先 amount_expr（跨 upgrade 引用），fallback parseFloat(effectValue)。
// normalizeEffectSignal（resolverDispatch）与 collectEffectEntries（buff_upgrade 展开）共用。
export function resolveNumericValue(
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
    const resolvedValue = resolved === null ? Number.NaN : parseFloat(resolved)

    if (Number.isFinite(resolvedValue)) {
      return resolvedValue
    }
  }

  return parseFloat(effectValue)
}

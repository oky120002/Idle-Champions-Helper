import {
  applyHeroAbilityPatch,
  type HeroAbilityDimension,
  type HeroAbilitySignal,
  type ResolvedHeroAbilityProfile,
} from './abilityModel'

/**
 * feat（专长）运行时信号注入。
 *
 * featCatalog（build 期 hero_feat_defines 归一化，scripts/data/feat-catalog.ts）按 heroId 索引
 * FeatEntry[]；每 feat 含按 dimension 归类的 signal。运行时按 scoringMode 选对应 dimension
 * 的 active feat → signal → applyHeroAbilityPatch 注入 profile（同 dimension add pool 叠加）。
 *
 * 消费类型与 scripts/data/feat-catalog.ts 的 FeatEntry 字段对齐（id/rarity/signals.dimension/.signal），
 * 序列化兼容 feat-catalog.json。
 */
export interface FeatSignalEntry {
  dimension: HeroAbilityDimension
  signal: HeroAbilitySignal
}

export interface FeatEntry {
  id: string
  rarity: number
  signals: FeatSignalEntry[]
}

export type FeatCatalog = Record<string, FeatEntry[]>

/**
 * 选 active feat 的 signal（可选按 dimension 过滤——scoringMode 对应维度）。
 * 同 dimension 多 feat signal 由 evaluatePlacementFit 的 pool 聚合 add 合并（1+Σ/100）。
 */
export function selectFeatSignals(
  activeFeatIds: readonly string[],
  heroFeats: readonly FeatEntry[] | undefined,
  dimension?: HeroAbilityDimension,
): HeroAbilitySignal[] {
  const active = new Set(activeFeatIds.map((id) => String(id)))
  const out: HeroAbilitySignal[] = []
  for (const feat of heroFeats ?? []) {
    if (!active.has(feat.id)) {
      continue
    }
    for (const entry of feat.signals) {
      if (dimension && entry.dimension !== dimension) {
        continue
      }
      out.push(entry.signal)
    }
  }
  return out
}

/**
 * 应用 active feat signal 到 profile（注入 supportSignals）。
 * - dimension 缺省 = 所有 dimension（向后兼容/全 feat）。
 * - 无 active feat signal → 原样返回（不建空 patch）。
 */
export function applyFeatsToProfile(
  profile: ResolvedHeroAbilityProfile,
  activeFeatIds: readonly string[],
  heroFeats: readonly FeatEntry[] | undefined,
  dimension?: HeroAbilityDimension,
): ResolvedHeroAbilityProfile {
  const signals = selectFeatSignals(activeFeatIds, heroFeats, dimension)
  if (signals.length === 0) {
    return profile
  }
  return applyHeroAbilityPatch(
    profile,
    { heroId: profile.heroId, supportSignals: signals },
    'official-parsed',
  )
}

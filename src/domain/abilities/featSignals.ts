import {
  appendHeroAbilitySignals,
  type HeroAbilityDimension,
  type HeroAbilitySignal,
  type ResolvedHeroAbilityProfile,
  type SignalBucket,
} from './abilityModel'

/**
 * feat（专长）运行时信号注入。
 *
 * featCatalog（build 期 hero_feat_defines 归一化，scripts/data/feat-catalog.ts）按 heroId 索引
 * FeatEntry[]；每 feat 含按 dimension 归类、按 bucket 路由的 signal。运行时注入选中 feat 的全部
 * signal（按 bucket 追加到 profile，保留 base 信号），scoring 按模式自取所需维度——与专精同构
 * （ADR 0017 不变量）：不做 scoringMode 维度预过滤，否则 carry-dps 会漏掉 crit 维度 feat
 * （crit 经 computeCritFactor 直接乘进 carryDps）。
 *
 * 消费类型与 scripts/data/feat-catalog.ts 的 FeatEntry 字段对齐（id/rarity/signals.dimension/.bucket/.signal），
 * 序列化兼容 feat-catalog.json。
 */
export interface FeatSignalEntry {
  dimension: HeroAbilityDimension
  /** build 期 resolveBucket 判定的归属（自增益 carrySignals / 支援全局 supportSignals），与专精同构。 */
  bucket: SignalBucket
  signal: HeroAbilitySignal
}

export interface FeatEntry {
  id: string
  rarity: number
  signals: FeatSignalEntry[]
}

export type FeatCatalog = Record<string, FeatEntry[]>

/**
 * 应用 active feat signal 到 profile：注入选中 feat 的全部 signal，按 build 期 bucket 追加
 * （保留 base 信号）。无 active feat signal → 原样返回。
 *
 * 与专精同构（appendHeroAbilitySignals）：误用 applyHeroAbilityPatch 传子集会整体替换、抹掉
 * base 支援信号（P0 根因，与专精注入同病）。bucket 路由复现 base 分类。
 */
export function applyFeatsToProfile(
  profile: ResolvedHeroAbilityProfile,
  activeFeatIds: readonly string[],
  heroFeats: readonly FeatEntry[] | undefined,
): ResolvedHeroAbilityProfile {
  const active = new Set(activeFeatIds.map((id) => String(id)))
  const carry: HeroAbilitySignal[] = []
  const support: HeroAbilitySignal[] = []
  for (const feat of heroFeats ?? []) {
    if (!active.has(feat.id)) {
      continue
    }
    for (const entry of feat.signals) {
      if (entry.bucket === 'carrySignals') {
        carry.push(entry.signal)
      } else {
        support.push(entry.signal)
      }
    }
  }
  if (carry.length === 0 && support.length === 0) {
    return profile
  }
  return appendHeroAbilitySignals(profile, { carrySignals: carry, supportSignals: support }, 'official-parsed')
}

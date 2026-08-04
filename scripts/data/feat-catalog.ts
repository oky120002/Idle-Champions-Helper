import {
  DIMENSION_BY_KIND,
  type HeroAbilityDimension,
  type HeroAbilitySignal,
} from '../../src/domain/abilities/abilityModel'
import { attachSignalSemantics } from '../../src/domain/abilities/signalSemantics'
import { parseEffectPayload } from '../../src/domain/effects/effect-string'
import { parseBuffUpgradeEffect } from '../../src/domain/buffs/equipmentMult'
import { normalizeEffectSignal, splitEffectString } from './effect-helpers'
import type { SignalBucket } from './effect-resolvers/resolverShared'

/**
 * feat（专长）归一化：hero_feat_defines → 按 heroId 索引的 FeatEntry[]。
 *
 * feat effect 是标准 effect_string，复用 effect-helpers 的 normalizeEffectSignal 解析 → signal，
 * 按 effect kind 归类到 HeroAbilityDimension（damage/gold/speed/survival），供运行时按 scoringMode
 * 选对应维度 feat + snapshot.feat_slots 选 top + 同维度 add pool 叠加。
 *
 * 非 scoring dimension（utility/unique，如 increase_ability_score/add_hero_tags/英雄专属）跳过——
 * 这些无 dps/gold/速度/生存收益，不进 featCatalog。独特机制走 semantic-overrides 单独 patch。
 *
 * 数据源 hero_feat_defines 公开（getdefinitions），CI 可重建 → public json。
 */
export interface FeatSignalEntry {
  dimension: HeroAbilityDimension
  /** build 期 resolveBucket 判定的归属（自增益 carrySignals / 支援全局 supportSignals）。 */
  bucket: SignalBucket
  signal: HeroAbilitySignal
}

export interface FeatEntry {
  id: string
  rarity: number
  signals: FeatSignalEntry[]
  /**
   * feat 源 buff_upgrade wrapper（放大英雄自身 upgrade 效果），owned-aware 接入。
   * runtime 经 collectFeatBuffWrappers 合并进 equipmentBuffsByHero，复用 applyEquipmentBuffsToProfile
   * 按 targetUpgradeId 反查 base signal 构造 wrapper（与 loot 源同通道，spec 之后注入）。
   * feat 无 enchant 缩放（非装备），value=base。复杂变体（per_tagged 等）不收，与 loot plain 同口径。
   */
  buffWrappers: FeatBuffWrapper[]
}

/** feat 源 buff_upgrade wrapper 元数据（owned-aware，放大 target upgrade 的 base signal）。 */
export interface FeatBuffWrapper {
  targetUpgradeId: string
  value: number
  rawEffect: string
}

type RawFeat = Record<string, unknown>

export function normalizeFeatEntry(feat: RawFeat): FeatEntry | null {
  const id = feat.id
  if (typeof id !== 'number' && typeof id !== 'string') {
    return null
  }
  const rarity = typeof feat.rarity === 'number' ? feat.rarity : 0
  const effects = Array.isArray(feat.effects) ? feat.effects : []
  const signals: FeatSignalEntry[] = []
  const buffWrappers: FeatBuffWrapper[] = []

  for (const effect of effects) {
    if (effect === null || typeof effect !== 'object') {
      continue
    }
    const effectString = (effect as Record<string, unknown>).effect_string
    if (typeof effectString !== 'string') {
      continue
    }
    // buff_upgrade wrapper（放大英雄自身 upgrade）：独立于 direct signal 收集（normalizeEffectSignal 不解析
    // wrapper kind），owned-aware 接入（runtime 合并进 equipmentBuffsByHero，复用装备反查通道）。
    // 只收 plain buff_upgrade/buff_upgrades（parseBuffUpgradeEffect 的 PLAIN_BUFF_UPGRADE_KINDS），
    // 复杂变体（per_tagged/flat_amount 等）不收——与 loot plain 同口径，避免半接。
    const buffParsed = parseBuffUpgradeEffect(effectString)
    if (buffParsed) {
      for (const targetUpgradeId of buffParsed.targetUpgradeIds) {
        buffWrappers.push({ targetUpgradeId, value: buffParsed.value, rawEffect: effectString })
      }
      continue // buff_upgrade wrapper 非 direct signal，不进 signal 收集
    }
    const split = splitEffectString(effectString)
    if (!split) {
      continue
    }
    const payload = parseEffectPayload(effectString)
    const result = normalizeEffectSignal(split.effectName, split.effectValue, 'official-parsed', { effectPayload: payload, effect })
    if (!result.ok) {
      continue
    }
    const dimension = DIMENSION_BY_KIND[result.signal.kind]
    // attachSignalSemantics 与 buildOfficialHeroModel 同源，保证限定符与 base 一致；
    // bucket 复现 base 分类（resolveBucket），供 runtime 路由（feat 外部化，与专精同构）。
    const signal = attachSignalSemantics(result.signal, effect as Record<string, unknown>)
    signals.push({ dimension, signal, bucket: result.bucket })
  }

  // 既无 direct scoring signal 也无 buff_upgrade wrapper → 不进 catalog（同既有 signals 兜底）。
  if (signals.length === 0 && buffWrappers.length === 0) {
    return null
  }
  return { id: String(id), rarity, signals, buffWrappers }
}

export function buildFeatCatalog(
  heroFeatDefines: readonly RawFeat[],
): Record<string, FeatEntry[]> {
  const catalog: Record<string, FeatEntry[]> = {}
  for (const feat of heroFeatDefines) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions -- 防御 JSON 畸形数据（null/非对象元素），类型签名 RawFeat[] 不保证运行期
    if (!feat || typeof feat !== 'object') {
      continue
    }
    const heroId = feat.hero_id
    if (typeof heroId !== 'number' && typeof heroId !== 'string') {
      continue
    }
    const entry = normalizeFeatEntry(feat)
    if (!entry) {
      continue
    }
    const key = String(heroId)
    const bucket = catalog[key] ?? []
    catalog[key] = bucket
    bucket.push(entry)
  }
  return catalog
}

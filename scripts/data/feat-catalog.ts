import { normalizeEffectSignal, splitEffectString } from './effect-helpers'
import {
  DIMENSION_BY_KIND,
  type HeroAbilityDimension,
  type HeroAbilitySignal,
} from '../../src/domain/abilities/abilityModel'
import { parseEffectPayload } from '../../src/domain/effects/effect-string'

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
  signal: HeroAbilitySignal
}

export interface FeatEntry {
  id: string
  rarity: number
  signals: FeatSignalEntry[]
}

type RawFeat = Record<string, unknown>

export function normalizeFeatEntry(feat: RawFeat): FeatEntry | null {
  const id = feat.id
  if (id === undefined || id === null) {
    return null
  }
  const rarity = typeof feat.rarity === 'number' ? feat.rarity : 0
  const effects = Array.isArray(feat.effects) ? feat.effects : []
  const signals: FeatSignalEntry[] = []

  for (const effect of effects) {
    if (!effect || typeof effect !== 'object') {
      continue
    }
    const effectString = (effect as Record<string, unknown>).effect_string
    if (typeof effectString !== 'string') {
      continue
    }
    const split = splitEffectString(effectString)
    if (!split) {
      continue
    }
    const payload = parseEffectPayload(effectString)
    const result = normalizeEffectSignal(split.effectName, split.effectValue, 'official-parsed', { effectPayload: payload })
    if (!result.ok) {
      continue
    }
    const dimension = DIMENSION_BY_KIND[result.signal.kind]
    if (!dimension) {
      continue
    }
    signals.push({ dimension, signal: result.signal })
  }

  if (signals.length === 0) {
    return null
  }
  return { id: String(id), rarity, signals }
}

export function buildFeatCatalog(
  heroFeatDefines: readonly RawFeat[],
): Record<string, FeatEntry[]> {
  const catalog: Record<string, FeatEntry[]> = {}
  for (const feat of heroFeatDefines) {
    if (!feat || typeof feat !== 'object') {
      continue
    }
    const heroId = feat.hero_id
    if (heroId === undefined || heroId === null) {
      continue
    }
    const entry = normalizeFeatEntry(feat as RawFeat)
    if (!entry) {
      continue
    }
    const key = String(heroId)
    ;(catalog[key] ??= []).push(entry)
  }
  return catalog
}

/**
 * build 期速度效果提取：从 champion-details 的 effect_keys 提取 7 类静态可计算速度效果，
 * 输出 HeroSpeedProfile（嵌入 hero-abilities.json）。
 *
 * 速度效果多为 hero-specific handler（不在 hero-abilities 信号管线），需要独立提取。
 * 详见 docs/research/gameplay/speed-mechanics.md。
 */
import type { HeroSpeedProfile, SpeedCategory, SpeedEffectEntry } from '../../src/domain/planner/speedScoring'
import { computeHeroSpeedGain } from '../../src/domain/planner/speedScoring'
import { collectEffectEntries } from './effect-helpers'
import { asRecord, asArray } from './io-utils'

/** 速度效果 effect_string kind 集合（用于 shouldIgnoreUnsupportedEffectEntry 抑制 unsupported 噪声）。 */
export const SPEED_EFFECT_KINDS = new Set([
  'increase_monster_spawn_time_mult',
  'time_scale_when_not_attacked',
  'area_transition_time_scale',
  'spawn_additional_monsters',
  'minsc_boastful',
  'chance_multiply_tagged_monster_quest_rewards',
  'chance_multiply_monster_quest_rewards',
  'chance_multiply_monster_quest_rewards_new',
  'chance_multiply_favored_foe_quest_rewards',
  'chance_reduce_quest_requirement',
  'buff_resolution_chance',
  'buff_resolution_amount',
  'hewmaan_fellow_humans',
  'simultaneous_monster_spawn_chance_mult',
  'uggie_handler',
  'uggie_attack_handler',
])

/** extractSpeedProfile 的纯函数入口（无 IO）。 */
export function extractSpeedProfile(heroId: string, detail: unknown): HeroSpeedProfile | undefined {
  const effects: SpeedEffectEntry[] = []

  // 阶段 1：扫描 collectEffectEntries 中的已知速度 effect_string
  const { entries } = collectEffectEntries(detail)
  // Sentry 配对：buff_resolution_chance + buff_resolution_amount
  let sentryChance: number | null = null
  let sentryAmount: number | null = null

  for (const entry of entries) {
    const parsed = parseSpeedEffect(entry.effectString)
    if (!parsed) continue
    for (const e of parsed) {
      if (entry.sourceBucket === 'loot' || entry.sourceBucket === 'legendary' || entry.sourceBucket === 'feat') {
        continue // 装备/feat 源不进 base profile（防双重计数，同 DPS 信号管线）
      }
      effects.push({ ...e, upgradeId: entry.upgradeId })
    }
    // Sentry 配对提取
    if (entry.effectString.startsWith('buff_resolution_chance,')) {
      const v = Number(entry.effectString.split(',')[1])
      if (Number.isFinite(v)) sentryChance = v
    }
    if (entry.effectString.startsWith('buff_resolution_amount,')) {
      const v = Number(entry.effectString.split(',')[1])
      if (Number.isFinite(v)) sentryAmount = v
    }
  }

  // Sentry 配对合成
  if (sentryChance != null && sentryAmount != null) {
    effects.push({
      category: 'questProgress',
      value: sentryChance,
      reductionAmount: sentryAmount,
      rawEffect: `buff_resolution,${sentryChance},${sentryAmount}`,
    })
  }

  // 阶段 2：Hew Maan 嵌套效果（hewmaan_teamwork → zrang.effects → chance_multiply_monster_quest_rewards）
  const hewMaanNested = extractHewMaanNestedQuest(detail)
  if (hewMaanNested) {
    effects.push(hewMaanNested)
  }

  if (effects.length === 0) return undefined

  return {
    heroId,
    effects,
    speedGain: computeHeroSpeedGain(effects),
  }
}

/**
 * 解析单条速度 effect_string → SpeedEffectEntry[]（可能产出多条，如 minsc_boastful）。
 * 返回 null = 非速度效果。导出供 specialization-catalog 复用（专精源速度效果）。
 * 返回 null = 非速度效果。
 */
export function parseSpeedEffect(effectString: string): SpeedEffectEntry[] | null {
  const parts = effectString.split(',')
  const kind = parts[0]
  if (!kind || !SPEED_EFFECT_KINDS.has(kind)) return null

  const args = parts.slice(1)
  const num = (i: number): number => {
    const v = Number(args[i])
    return Number.isFinite(v) ? v : 0
  }

  switch (kind) {
    case 'increase_monster_spawn_time_mult':
      return [{ category: 'spawnSpeed', value: num(0), rawEffect: effectString }]

    case 'time_scale_when_not_attacked':
      return [{ category: 'timeScale', value: num(0), rawEffect: effectString }]

    case 'area_transition_time_scale':
      return [{ category: 'transitionSpeedup', value: num(0), rawEffect: effectString }]

    case 'spawn_additional_monsters':
      // chance% × 1 extra enemy
      return [{ category: 'extraEnemies', value: num(0), rawEffect: effectString }]

    case 'minsc_boastful':
      // chance1% ×1 + chance2% ×2 → two entries
      return [
        { category: 'extraEnemies', value: num(0), rawEffect: `${effectString} (×1)` },
        { category: 'extraEnemies', value: num(1) * 2, rawEffect: `${effectString} (×2)` },
      ]

    case 'chance_multiply_tagged_monster_quest_rewards':
    case 'chance_multiply_monster_quest_rewards':
    case 'chance_multiply_monster_quest_rewards_new':
    case 'chance_multiply_favored_foe_quest_rewards':
      // <chance>,<mult>[,<extra>]
      return [{ category: 'questProgress', value: num(0), multiplier: num(1) || 1, rawEffect: effectString }]

    case 'chance_reduce_quest_requirement':
      // <chance>,<reductionAmount>
      return [{ category: 'questProgress', value: num(0), reductionAmount: num(1), rawEffect: effectString }]

    case 'simultaneous_monster_spawn_chance_mult':
      return [{ category: 'simultaneousSpawn', value: 1, rawEffect: effectString }]

    case 'uggie_handler':
    case 'uggie_attack_handler':
      return [{ category: 'preSpawn', value: 1, rawEffect: effectString }]

    // hewmaan_fellow_humans / buff_resolution_* 由特殊路径处理（阶段 1 配对 / 阶段 2 嵌套）
    case 'hewmaan_fellow_humans':
    case 'buff_resolution_chance':
    case 'buff_resolution_amount':
      return null

    default:
      return null
  }
}

/**
 * Hew Maan 嵌套效果提取：hewmaan_teamwork upgrade 的 zrang.effects 含
 * chance_multiply_monster_quest_rewards,<chance>,<mult>。
 * 基础 chance=0（需 hewmaan_fellow_humans buff_upgrade 缩放），保守提取。
 */
function extractHewMaanNestedQuest(detail: unknown): SpeedEffectEntry | null {
  const detailRecord = asRecord(detail)
  if (!detailRecord) return null
  const upgrades = asArray(detailRecord.upgrades)
  for (const upRaw of upgrades) {
    const up = asRecord(upRaw)
    if (!up) continue
    const effDef = asRecord(up.effectDefinition)
    if (!effDef) continue
    const snaps = asRecord(effDef.snapshots)
    const orig = asRecord(snaps?.original)
    const effectKeys = asArray(orig?.effect_keys)
    for (const ekRaw of effectKeys) {
      const ek = asRecord(ekRaw)
      if (!ek) continue
      const es = typeof ek.effect_string === 'string' ? ek.effect_string : ''
      if (!es.startsWith('hewmaan_teamwork')) continue
      // 找到 hewmaan_teamwork effect_key，检查 zrang.effects
      const zrang = asRecord(ek.zrang)
      const zrangEffects = asArray(zrang?.effects)
      for (const zeRaw of zrangEffects) {
        const ze = asRecord(zeRaw)
        const zeStr = typeof ze?.effect_string === 'string' ? ze.effect_string : ''
        if (zeStr.startsWith('chance_multiply_monster_quest_rewards,')) {
          const parts = zeStr.split(',')
          const chance = Number(parts[1]) || 0
          const mult = Number(parts[2]) || 1
          return { category: 'questProgress', value: chance, multiplier: mult, rawEffect: zeStr }
        }
      }
    }
  }
  return null
}

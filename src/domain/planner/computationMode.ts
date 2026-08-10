import type { HeroAbilityDimension, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import type { ScoringMode } from './steadyStateScoring'

/**
 * 计算模式（computationMode）：控制 beam search 候选裁剪粒度，平衡速度与精度。
 * - full：全量候选（精度最高，最慢）。
 * - p90 / p80 / p70 / p60 / p50：每个席位内按复合收益取前 90% / 80% / 70% / 60% / 50%。
 * 可扩展：新增模式只需在 MODE_FRACTION 登记比例 + ComputationMode 联合类型加项。
 */
export type ComputationMode = 'full' | 'p90' | 'p80' | 'p70' | 'p60' | 'p50'

export const MODE_FRACTION: Record<ComputationMode, number> = {
  full: 1.0,
  p90: 0.9,
  p80: 0.8,
  p70: 0.7,
  p60: 0.6,
  p50: 0.5,
}

/**
 * 各优化目标参与复合排序（英雄 gainProfile）的维度。
 * - carry-dps：英雄 ability 驱动的 damage/crit/vulnerability 三维（外部 patron/blessing/装备加成非英雄
 *   gainProfile，由 globalBuffMultiplier/equipmentAdjustmentByHero 入参注入，A1 同 key 加法合并，不在此）。
 * - team-gold：只看 gold。
 */
export const OBJECTIVE_DIMENSIONS: Record<ScoringMode, HeroAbilityDimension[]> = {
  'carry-dps': ['damage', 'crit', 'vulnerability'],
  'team-gold': ['gold'],
  'team-speed': [], // speed ranking uses speedProfile.speedGain, not gainProfile dimensions
}

/**
 * 英雄在指定目标下的复合收益 = max(self 复合, support 复合)。
 * 英雄在阵型里可能当 carry（self 收益）也可能当 support（support 收益），
 * 裁剪要保住「任一角色强」的，故取两侧最大。复合 = 所在层 OBJECTIVE_DIMENSIONS 各维度收益之积（缺省 1.0）。
 */
export function compositeGain(hero: ResolvedHeroAbilityProfile, scoringMode: ScoringMode): number {
  if (scoringMode === 'team-speed') {
    // speed ranking uses pre-computed speedProfile.speedGain (base + spec + equipment buff 缩放)
    return hero.speedProfile?.speedGain ?? 1
  }
  const dims = OBJECTIVE_DIMENSIONS[scoringMode]
  return Math.max(productGain(hero.gainProfile?.self, dims), productGain(hero.gainProfile?.support, dims))
}

function productGain(
  layer: Partial<Record<HeroAbilityDimension, number>> | undefined,
  dims: HeroAbilityDimension[],
): number {
  if (!layer) return 1
  let product = 1
  for (const dim of dims) {
    product *= layer[dim] ?? 1
  }
  return product
}

/**
 * 按计算模式裁剪候选池：按席位分组，每组按复合收益降序取前 mode 比例（每席位至少 1 个），
 * forced 英雄无条件保留。保留原始输入顺序以保证确定性（beam tie-break 稳定）。
 * full 模式不裁剪，原样返回。
 */
export function applyComputationMode(
  heroes: ResolvedHeroAbilityProfile[],
  mode: ComputationMode,
  scoringMode: ScoringMode,
  forcedHeroIds: Set<string>,
): ResolvedHeroAbilityProfile[] {
  if (mode === 'full') {
    return heroes
  }
  const fraction = MODE_FRACTION[mode]
  const bySeat = new Map<number, ResolvedHeroAbilityProfile[]>()
  for (const hero of heroes) {
    if (forcedHeroIds.has(hero.heroId)) continue // forced 必留，不占普通候选名额
    const group = bySeat.get(hero.seat) ?? []
    group.push(hero)
    bySeat.set(hero.seat, group)
  }

  const keptSet = new Set<string>(forcedHeroIds)
  for (const group of bySeat.values()) {
    group.sort((a, b) => {
      const diff = compositeGain(b, scoringMode) - compositeGain(a, scoringMode)
      // 原 || 链视 0 和 NaN 为 falsy 回退 tiebreak；显式判断保持同语义。
      if (diff === 0 || Number.isNaN(diff)) {
        return a.heroId.localeCompare(b.heroId)
      }
      return diff
    })
    const keepCount = Math.max(1, Math.ceil(group.length * fraction))
    for (const hero of group.slice(0, keepCount)) {
      keptSet.add(hero.heroId)
    }
  }

  return heroes.filter((hero) => keptSet.has(hero.heroId))
}

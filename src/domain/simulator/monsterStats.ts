import Decimal from 'break_eternity.js'

import type { GameNumberValue } from './gameNumber'

/**
 * 怪物随层数缩放的全局 stats（阶段 10.1 数据源确认）。
 *
 * 来源：`game_rule_defines.monster_base_stats.rule`（全局 game rule，非 per-monster）。
 * 数据源确认报告：`docs/modules/planner/m3-data-source-confirmations.md` §10.1。
 *
 * ponytail: 这些是稳定的全局游戏常量（base_health=10 / health_growth_rate=2.031 等），
 * 直接内联而非把 game-rules.json 发布到 runtime（与 steadyStateScoring 硬编码 crit 默认值同模式）。
 * 上限：若官方更新曲线，须从 raw `monster_base_stats` 重新确认；当前数据快照 2026-04-13。
 */

export const MAX_AREA = 2501

const BASE_HEALTH = 10
const BASE_DPS = 1

/**
 * health_growth_rate_curve（stepped：area → 该层增长率）。
 * area 1-2000: 2.031；2001-2250: 3.031；2251+: 4.531。
 */
const HEALTH_GROWTH_SEGMENTS: ReadonlyArray<{ fromArea: number; rate: number }> = [
  { fromArea: 1, rate: 2.031 },
  { fromArea: 2001, rate: 3.031 },
  { fromArea: 2251, rate: 4.531 },
]

/**
 * dps_growth_rate_curve 中 value≠1 的 boss spike 层（非 boss 层增长率为 1，不贡献）。
 * area 50..1951 每 50 层 ×1.75（39 处）；2001..2401 ×4（9 处）；2451 ×1e10（max_area 墙，1 处）。
 * 排序后预累积乘积，dps(A) = base_dps × Π_{boss≤A} spike。
 */
const DPS_BOSS_SPIKES: ReadonlyArray<{ area: number; mult: number }> = buildDpsBossSpikes()

function buildDpsBossSpikes(): ReadonlyArray<{ area: number; mult: number }> {
  const spikes: Array<{ area: number; mult: number }> = []
  for (let area = 50; area <= 1951; area += 50) {
    spikes.push({ area, mult: 1.75 })
  }
  for (let area = 2001; area <= 2401; area += 50) {
    spikes.push({ area, mult: 4 })
  }
  spikes.push({ area: 2451, mult: 1e10 })
  return spikes
}

/** stepped curve lookup：返回 area 所在段的增长率。 */
function healthGrowthRateAt(area: number): number {
  let rate = HEALTH_GROWTH_SEGMENTS[0]!.rate
  for (const seg of HEALTH_GROWTH_SEGMENTS) {
    if (area >= seg.fromArea) {
      rate = seg.rate
    }
  }
  return rate
}

/**
 * 怪物生命（按层数缩放）：`base_health × Π_{a=2..area} growth_rate(a)`。
 * 按分段常数增长率解析累积（避免逐层循环 2500 次）。
 *
 * 绝对值未与真实游戏实测对照（阶段 7.5 BUD 校准边界）；相对比较保序。
 */
export function monsterHealthAt(area: number): GameNumberValue {
  const a = Math.max(1, Math.floor(area))
  if (a === 1) {
    return new Decimal(BASE_HEALTH)
  }

  let health = new Decimal(BASE_HEALTH)
  for (let i = 0; i < HEALTH_GROWTH_SEGMENTS.length; i++) {
    const seg = HEALTH_GROWTH_SEGMENTS[i]!
    if (a < seg.fromArea) {
      break
    }
    // 下一段起点；末段取理论上界。
    const nextFrom = HEALTH_GROWTH_SEGMENTS[i + 1]?.fromArea ?? Number.MAX_SAFE_INTEGER
    const segEnd = Math.min(a, nextFrom - 1)
    // 第一段从 area 2 开始累积（area 1 是 base，不乘）。
    const segStart = seg.fromArea === 1 ? 2 : seg.fromArea
    const layers = Math.max(0, segEnd - segStart + 1)
    if (layers > 0) {
      health = health.times(Decimal.pow(seg.rate, layers))
    }
  }
  return health
}

/**
 * 怪物 dps（按层数缩放）：`base_dps × Π_{boss area ≤ area} spike`。
 * 非 boss 层增长率为 1（不贡献），仅 boss 层（每 50 层）累乘 spike。
 */
export function monsterDpsAt(area: number): GameNumberValue {
  const a = Math.max(1, Math.floor(area))
  let dps = new Decimal(BASE_DPS)
  for (const spike of DPS_BOSS_SPIKES) {
    if (a >= spike.area) {
      dps = dps.times(spike.mult)
    } else {
      break
    }
  }
  return dps
}

/** 保留导出供 areaEstimation / 未来消费复用。 */
export { healthGrowthRateAt }

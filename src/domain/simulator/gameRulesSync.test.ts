import { readFileSync } from 'node:fs'

import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'

import { MODRON_AUTO_RESET_CAP } from './modronInfo'
import { MAX_AREA, monsterDpsAt, monsterHealthAt } from './monsterStats'

// 跨边界同步守护（CLAUDE.md「派生统计…必须配 keys 同步守护测试强制一致」）。
// monsterStats.ts / modronInfo.ts 把 game-rules.json 的 max_area / monster_base_stats /
// max_modron_auto_reset_area 内联为硬编码常量（ponytail：稳定值内联，不把 game-rules.json
// 发布到 runtime，与 steadyStateScoring 硬编码 crit 默认值同模式）。数据重生
// （npm run data:official）会刷新 game-rules.json；若上游改了这些规则，硬编码常量必须同步，
// 否则 areaEstimation / modronInfo 用旧值。
//
// 守护策略：
// 不采样，而是逐 area 验证「局部增长率」monsterStat(A)/monsterStat(A-1) 与 raw curve 一致。
// 用 Decimal 比值避免大 area 量级溢出 number（比值是分段 rate，恒为小数）。
// cwd-relative path：vitest 默认从仓库根运行。
const gameRules = JSON.parse(
  readFileSync('public/data/v1/game-rules.json', 'utf8'),
) as { items: Array<{ ruleName: string; rule: Record<string, unknown> }> }

const rule = (name: string): Record<string, unknown> =>
  gameRules.items.find((entry) => entry.ruleName === name)!.rule

/** monsterStat(A)/monsterStat(A-1)，用 Decimal 精确比值再收成 number（比值是小数，不溢出）。 */
function growthRateBetween(
  at: (area: number) => Decimal,
  area: number,
): number {
  return at(area).div(at(area - 1)).toNumber()
}

describe('game-rules.json 与 monsterStats/modronInfo 硬编码常量同步守护', () => {
  it('MAX_AREA / MODRON_AUTO_RESET_CAP 与 game-rules.json 一致', () => {
    expect(MAX_AREA).toBe((rule('max_area') as { area: number }).area)
    expect(MODRON_AUTO_RESET_CAP).toBe(
      (rule('max_modron_auto_reset_area') as { area: number }).area,
    )
  })

  it('health：base_health + 全量分段增长率逐边界一致', () => {
    const stats = rule('monster_base_stats') as {
      base_health: number
      health_growth_rate_curve: Record<string, number>
    }
    // area 1 = base_health。
    expect(Number(monsterHealthAt(1))).toBe(stats.base_health)

    // raw health_growth_rate_curve 是 stepped 分段（{1:2.031, 2001:3.031, 2251:4.531}）。
    // 每个分段 fromArea 的增长率作用于该 area 本身：
    //   curve[1]=2.031 → monsterHealthAt(2)/monsterHealthAt(1)（area 1 是 base 不乘，从 area 2 起乘）；
    //   curve[2001]/[2251] → 该 area 处的局部增长率。
    // 全量遍历 raw curve，断言硬编码分段值与每个边界一致——上游改分段值/边界此处失败。
    for (const [areaStr, rate] of Object.entries(stats.health_growth_rate_curve)) {
      const area = Number(areaStr)
      const probeArea = area <= 1 ? 2 : area
      // toBeCloseTo(6)：Decimal 大数 div 有末位浮点误差，6 位精度足以检测分段值/边界漂移
      // （真实错误如 3.031→3.0 或漏分段差 >= 1e-3，远大于 5e-7 容差）。
      expect(growthRateBetween(monsterHealthAt, probeArea)).toBeCloseTo(rate, 6)
    }
  })

  it('dps：base_dps + 全量 spike 逐层一致（非采样）', () => {
    const stats = rule('monster_base_stats') as {
      base_dps: number
      dps_growth_rate: number
      dps_growth_rate_curve: Record<string, number>
    }
    expect(Number(monsterDpsAt(1))).toBe(stats.base_dps)

    // raw dps_growth_rate_curve 是 per-area 增长率（boss area 非 1，其余 = dps_growth_rate=1）。
    // 全量遍历 99 个 area：每个 monsterDpsAt(A)/monsterDpsAt(A-1) 必须等于 curve[A]。
    // 替代旧「仅验 area 50 首个 spike」——若硬编码漏/多/错位任意 spike（如 151 vs 150），此处失败。
    for (const [areaStr, mult] of Object.entries(stats.dps_growth_rate_curve)) {
      const area = Number(areaStr)
      const probeArea = area <= 1 ? 2 : area
      expect(growthRateBetween(monsterDpsAt, probeArea)).toBeCloseTo(mult, 6)
    }

    // 非 curve 列出的 area 默认增长率 = dps_growth_rate；采样确认无漏 spike。
    for (const area of [49, 52, 99, 150, 2000]) {
      expect(growthRateBetween(monsterDpsAt, area)).toBeCloseTo(stats.dps_growth_rate, 6)
    }
  })
})

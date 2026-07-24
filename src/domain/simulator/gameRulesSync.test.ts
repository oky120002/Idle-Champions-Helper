import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { MODRON_AUTO_RESET_CAP } from './modronInfo'
import { MAX_AREA, monsterDpsAt, monsterHealthAt } from './monsterStats'

// 跨边界同步守护（CLAUDE.md「派生统计…必须配 keys 同步守护测试强制一致」）。
// monsterStats.ts / modronInfo.ts 把 game-rules.json 的 max_area / monster_base_stats /
// max_modron_auto_reset_area 内联为硬编码常量（ponytail：稳定值内联，不把 game-rules.json
// 发布到 runtime，与 steadyStateScoring 硬编码 crit 默认值同模式）。数据重生
// （npm run data:official）会刷新 game-rules.json；若上游改了这些规则，硬编码常量必须同步，
// 否则 areaEstimation / modronInfo 用旧值。此测试通过导出的行为函数间接校验私有常量一致。
// cwd-relative path：vitest 默认从仓库根运行。
const gameRules = JSON.parse(
  readFileSync('public/data/v1/game-rules.json', 'utf8'),
) as { items: Array<{ ruleName: string; rule: Record<string, unknown> }> }

const rule = (name: string): Record<string, unknown> =>
  gameRules.items.find((entry) => entry.ruleName === name)!.rule

describe('game-rules.json 与 monsterStats/modronInfo 硬编码常量同步守护', () => {
  it('MAX_AREA / MODRON_AUTO_RESET_CAP 与 game-rules.json 一致', () => {
    expect(MAX_AREA).toBe((rule('max_area') as { area: number }).area)
    expect(MODRON_AUTO_RESET_CAP).toBe(
      (rule('max_modron_auto_reset_area') as { area: number }).area,
    )
  })

  it('base_health / health_growth_rate 与 game-rules.json 一致', () => {
    const stats = rule('monster_base_stats')
    // area 1 = base_health；area 2 / area 1 = area 1-2000 段增长率（默认 health_growth_rate）
    expect(Number(monsterHealthAt(1))).toBe(stats.base_health)
    const rateAtArea2 = Number(monsterHealthAt(2)) / Number(monsterHealthAt(1))
    expect(rateAtArea2).toBe(stats.health_growth_rate)
  })

  it('dps boss spike 位置/倍率与 game-rules.json 一致（area 50 = 首个 1.75× spike）', () => {
    const stats = rule('monster_base_stats') as { dps_growth_rate_curve: Record<string, number> }
    // area 49 无 boss spike → base_dps(1)；area 50 第一个 boss spike。
    expect(Number(monsterDpsAt(50)) / Number(monsterDpsAt(49))).toBe(stats.dps_growth_rate_curve['50'])
  })
})

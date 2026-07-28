// 伤害快照参照对照测试（统一口径，与 championReferenceVerification 同族）。
// 详见 docs/specs/modules/planner/champion-reference-verification.md 与 docs/runbooks/add-champion-reference.md。
//
// 自动发现 ./*ReferenceData.ts（蔚 95 + 明斯克 7 + 瓦罗 159 + 未来新增），加载真实 built
// hero-abilities.json，跑计算器两模式对照：
// - formation-buff（约束②）：断言阵型内 signal 聚合的结构正确性（交叉位置 buff 命中、跨英雄加成生效）。
// - absolute-dps：记录与实测的偏差（baseDamage/BUD 未校准，仅作 BUD 校准回归基线，不门控）。
//
// 数据来自用户游戏观察，是计算器的 oracle：偏差大 = 计算器有缺口（外部加成未建模/技能无等级门控等），
// 登记在 architecture.md「后续目标」逐项修复，本测试持续度量偏差驱动收敛。
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'
import Decimal from 'break_eternity.js'

import type { ChampionReference, ChampionReferenceSnapshot } from './championReferenceTypes'
import type { HeroAbilityProfile } from '../../abilities/abilityModel'
import { resolvePlannerModel, type OfficialPlannerScenarioModel } from '../plannerModel'
import { scoreFormation } from '../steadyStateScoring'
import { evaluatePlacementFit } from '../placementFit'

// 真自动发现：新 *ReferenceData.ts 文件零注册进流。
const modules = import.meta.glob('./*ReferenceData.ts', { eager: true }) as Record<
  string,
  Record<string, ChampionReference>
>
const allReferences: ChampionReference[] = Object.values(modules).flatMap((mod) => Object.values(mod))
const referencesByHeroId = new Map(allReferences.map((ref) => [ref.heroId, ref]))

// 加载真实 built hero-abilities.json（归一化产物），计算器本身不读文件——此处仅测试构造入参。
const dataDir = path.resolve(__dirname, '../../../../public/data/v1')
const heroesRaw = JSON.parse(readFileSync(path.join(dataDir, 'hero-abilities.json'), 'utf8')) as {
  items: HeroAbilityProfile[]
}
const scenariosRaw = JSON.parse(readFileSync(path.join(dataDir, 'scenarios.json'), 'utf8')) as {
  items: OfficialPlannerScenarioModel[]
}
const resolved = resolvePlannerModel(heroesRaw.items, scenariosRaw.items, [], [])

function loadBuiltHero(heroId: string): HeroAbilityProfile {
  const hero = resolved.heroes.find((h) => h.heroId === heroId)
  if (!hero) throw new Error(`hero ${heroId} not found in built hero-abilities.json`)
  return hero
}

// 单槽场景（单英雄快照用）。
function singleSlotScenario(): OfficialPlannerScenarioModel {
  return {
    variantId: 'damage-ref',
    scenarioRef: { kind: 'variant', id: 'damage-ref' },
    name: { original: 'damage-ref', display: 'damage-ref' },
    formationLayoutId: 'damage-ref',
    objectiveArea: 1,
    slotTopology: [{ slotId: 's1', row: 1, column: 1, x: 50, y: 10, adjacentSlotIds: [] }],
    forcedHeroes: [],
    bannedHeroes: [],
    lockedSlots: [],
    enemyTypes: [],
    allowedHeroes: [],
    allowedTags: [],
    occupiedSlotCount: 0,
    scenarioWarnings: [],
  }
}

// cursed-farmer 阵型场景：明斯克(7) + 瓦罗(159)，瓦罗在明斯克后方列（瓦罗战斗指南作用于其前列）。
function cursedFarmerScenario(): OfficialPlannerScenarioModel {
  return {
    variantId: 'cursed-farmer',
    scenarioRef: { kind: 'variant', id: 'cursed-farmer' },
    name: { original: 'cursed-farmer', display: 'cursed-farmer' },
    formationLayoutId: 'cursed-farmer',
    objectiveArea: 1,
    // 明斯克 column 2（更靠前/右），瓦罗 column 4（更靠后/左）：瓦罗「前面两列」覆盖明斯克所在列。
    slotTopology: [
      { slotId: 'minsc', row: 1, column: 2, x: 40, y: 10, adjacentSlotIds: ['varo'] },
      { slotId: 'varo', row: 1, column: 4, x: 20, y: 10, adjacentSlotIds: ['minsc'] },
    ],
    forcedHeroes: [],
    bannedHeroes: [],
    lockedSlots: [],
    enemyTypes: [],
    allowedHeroes: [],
    allowedTags: [],
    occupiedSlotCount: 0,
    scenarioWarnings: [],
  }
}

// 单英雄快照：formation-buff 模式 objectiveValue = 阵型内聚合（确定性结构正确性）。
function scoreSingleSnapshot(heroId: string, snapshot: ChampionReferenceSnapshot) {
  const hero = loadBuiltHero(heroId)
  return scoreFormation({
    placements: { s1: heroId },
    heroesById: new Map([[heroId, hero]]),
    scenario: singleSlotScenario(),
    heroLevels: new Map([[heroId, snapshot.context.level ?? 1]]),
    aggregateProjection: 'formation-buff',
  })
}

describe('伤害参照自动发现与数据完整性', () => {
  it('自动发现蔚/明斯克/瓦罗三份参照（glob 真自动，零注册）', () => {
    expect(referencesByHeroId.get('95')).toBeDefined()
    expect(referencesByHeroId.get('7')).toBeDefined()
    expect(referencesByHeroId.get('159')).toBeDefined()
  })

  it('每份快照有 id/capturedAt/context.formationSize（入库时间 + 阵型规模齐备）', () => {
    const issues: string[] = []
    for (const ref of allReferences) {
      for (const snap of ref.snapshots) {
        if (!snap.id) issues.push(`${ref.heroId}: 缺 id`)
        if (!snap.capturedAt) issues.push(`${ref.heroId}/${snap.id}: 缺 capturedAt`)
        if (typeof snap.context.formationSize !== 'number') issues.push(`${ref.heroId}/${snap.id}: 缺 formationSize`)
      }
    }
    expect(issues, issues.join('\n')).toEqual([])
  })
})

describe('formation-buff 模式（结构正确性，CI 门控）', () => {
  it('明斯克/瓦罗单英雄快照产出正阵型聚合（真实 signal 不崩、聚合>0）', () => {
    for (const snap of referencesByHeroId.get('7')!.snapshots) {
      const result = scoreSingleSnapshot('7', snap)
      expect(result.objectiveValue.toNumber(), `明斯克 ${snap.id}`).toBeGreaterThan(0)
    }
    for (const snap of referencesByHeroId.get('159')!.snapshots) {
      const result = scoreSingleSnapshot('159', snap)
      expect(result.objectiveValue.toNumber(), `瓦罗 ${snap.id}`).toBeGreaterThan(0)
    }
  })

  it('cursed-farmer 阵型：瓦罗入阵提升明斯克阵型聚合（交叉/全局加成生效）', () => {
    const minsc = loadBuiltHero('7')
    const varo = loadBuiltHero('159')
    const scenario = cursedFarmerScenario()

    // 仅明斯克：明斯克自身 signal 聚合。
    const soloMinsc = scoreFormation({
      placements: { minsc: '7' },
      heroesById: new Map([['7', minsc]]),
      scenario,
      aggregateProjection: 'formation-buff',
    })
    // 明斯克 + 瓦罗：瓦罗 support signal（战斗指南/全局 buff）并入 damage pool。
    const withVaro = scoreFormation({
      placements: { minsc: '7', varo: '159' },
      heroesById: new Map([
        ['7', minsc],
        ['159', varo],
      ]),
      scenario,
      aggregateProjection: 'formation-buff',
    })

    // 瓦罗入阵 → 明斯克 damage pool 上升（瓦罗至少有 globalDpsMultiplier 类全位置 buff 生效）。
    expect(withVaro.objectiveValue.toNumber()).toBeGreaterThan(soloMinsc.objectiveValue.toNumber())
    expect(withVaro.carryHeroId).toBe('7')
  })

  it('瓦罗战斗指南按列位置对明斯克 active（拓扑命中）', () => {
    const minsc = loadBuiltHero('7')
    const varo = loadBuiltHero('159')
    const scenario = cursedFarmerScenario()
    // 明斯克作 carry，瓦罗作 support：瓦罗的 support signal 对明斯克的命中状态。
    const fit = evaluatePlacementFit({
      carryHero: minsc,
      carrySlotId: 'minsc',
      supportHero: varo,
      supportSlotId: 'varo',
      scenario,
      placements: { minsc: '7', varo: '159' },
      heroesById: new Map([
        ['7', minsc],
        ['159', varo],
      ]),
      dimension: 'damage',
    })
    // 瓦罗是 support，至少有一条 damage signal 对明斯克 active（全局或位置 buff）。
    const activeForMinsc = fit.scoreBreakdown.filter((p) => p.active)
    expect(activeForMinsc.length, '瓦罗应对明斯克有 active 的 damage support signal').toBeGreaterThan(0)
  })
})

describe('absolute-dps 模式（校准基线，记录不门控）', () => {
  // baseDamage/BUD 未校准 → 计算器绝对量与实测差几十个数量级（见 architecture.md「投影模式」）。
  // 这里度量偏差作 BUD 校准回归基线，驱动收敛；不门控 CI。
  it('明斯克 level 1/722 绝对伤害偏差被度量（驱动未来 BUD 校准）', () => {
    const minsc = loadBuiltHero('7')
    const scenario = singleSlotScenario()
    const observed: Record<string, string> = {
      'minsc-l1': '1.25e45',
      'minsc-l722': '5.02e62',
    }
    const levels: Record<string, number> = { 'minsc-l1': 1, 'minsc-l722': 722 }

    for (const [snapId, obsStr] of Object.entries(observed)) {
      const result = scoreFormation({
        placements: { s1: '7' },
        heroesById: new Map([['7', minsc]]),
        scenario,
        heroLevels: new Map([['7', levels[snapId]!]]),
        aggregateProjection: 'absolute-dps',
      })
      const calc = result.objectiveValue
      const obs = new Decimal(obsStr)
      // log10 偏差（数量级差距）；当前预期巨大（外部加成未建模）。
      const logDeviation = calc.dividedBy(obs).abs().log10().toNumber()
      // 用 process.stdout 绕过 vitest console 拦截，让偏差基线在正常跑测时可见。
      process.stdout.write(
        `\n[BUD-gap] 明斯克 ${snapId}: calc=${calc.toString()} observed=${obsStr} log10偏差=${logDeviation.toFixed(1)}\n`,
      )
      expect(Number.isFinite(logDeviation)).toBe(true)
    }
  })
})

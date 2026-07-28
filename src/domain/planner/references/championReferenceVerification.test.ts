// 英雄 DPS 机制参照对照测试。
// 详见 docs/specs/modules/planner/champion-reference-verification.md。
// 四组：真实数据端到端对照 + expected 值自洽 + 抽象阈值守护 + 关联一致性。
//
// 关键：蔚（Neutral Good，伦理 good）**无 geneutral 标签**，不是自己「善良榜样」的目标。
// 蔚是 support（提供善良榜样给出言不逊增强），carry 须是 geneutral 英雄（Neutral / Lawful Neutral /
// Chaotic Neutral 阵营）才被 buff。手搓 signal 曾给蔚塞 geneutral 掩盖此事实——真实数据端到端暴露并修正。
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { HeroAbilityProfile } from '../../abilities/abilityModel'
import { resolvePlannerModel, type OfficialPlannerScenarioModel } from '../plannerModel'
import { evaluatePlacementFit } from '../placementFit'
import { vi95ReferenceData } from './vi95ReferenceData'

// 蔚只有一份快照（area=193 机制参照）；统一 snapshots 口径下读 [0]。
const viSnapshot = vi95ReferenceData.snapshots[0]!

function createHero(heroId: string, tags: string[]): HeroAbilityProfile {
  return {
    heroId,
    name: { original: heroId, display: heroId },
    seat: 1,
    roles: [],
    tags,
    baseAttackDamageTypes: [],
    baseAttackCooldown: null,
    age: null,
    abilityScores: {},
    baseDamage: 1,
    baseHealth: 1,
    carrySignals: [],
    supportSignals: [],
    unsupportedSignals: [],
    sourceBreakdown: { carrySignals: [], supportSignals: [], unsupportedSignals: [] },
  }
}

const scenario: OfficialPlannerScenarioModel = {
  variantId: 'vi-test',
  scenarioRef: { kind: 'variant', id: 'vi-test' },
  name: { original: 'test', display: 'test' },
  formationLayoutId: 'layout-vi',
  objectiveArea: 193,
  slotTopology: [
    { slotId: 's1', row: 1, column: 1, x: 60, y: 10, adjacentSlotIds: ['s2'] },
    { slotId: 's2', row: 1, column: 2, x: 50, y: 10, adjacentSlotIds: ['s1', 's3'] },
    { slotId: 's3', row: 1, column: 3, x: 40, y: 10, adjacentSlotIds: ['s2', 's4'] },
    { slotId: 's4', row: 1, column: 4, x: 30, y: 10, adjacentSlotIds: ['s3', 's5'] },
    { slotId: 's5', row: 2, column: 2, x: 50, y: 30, adjacentSlotIds: ['s4', 's6'] },
    { slotId: 's6', row: 2, column: 3, x: 40, y: 30, adjacentSlotIds: ['s5', 's7'] },
    { slotId: 's7', row: 2, column: 4, x: 30, y: 30, adjacentSlotIds: ['s6'] },
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

// count 限定 = good|acqinc|cteam（蔚善良榜样 stack_func_data.tag），测试用 good 代表。
const COUNT_TAG = 'good'
// 善良榜样 target = geneutral（伦理中立阵营）；蔚自身 Neutral Good 无此标签，故蔚作 support 非 carry。
const GENEUTRAL_TAG = 'geneutral'
// carry 占 1 槽，蔚（support）占 1 槽，剩 5 名善良 mock凑 7 英雄计数（均 good → count=7 → 4^7）。
const MOCK_GOOD_IDS = ['mock-good-1', 'mock-good-2', 'mock-good-3', 'mock-good-4', 'mock-good-5']
const GENEUTRAL_CARRY_ID = 'geneutral-carry'

// 机制对照容差：游戏显示值（如 0.33%/层）为取整近似，逐项对照用 30% 相对偏差（与校准口径一致）。
const TOLERANCE = 0.30
function expectWithinTolerance(actual: number, expected: number, tolerance: number): void {
  const deviation = Math.abs(actual - expected) / expected
  expect(deviation).toBeLessThanOrEqual(tolerance)
}

// 加载 built hero-abilities.json 的真实蔚 profile（归一化产物）。真实数据端到端验证 归一化→评分 全链路，
// 防 amountFunc/stackFunc/targetQualifier/bonusScaleOfSignal 等字段回归（smoke.test.ts 只验形状不验 multiplier）。
function loadRealVi(): HeroAbilityProfile {
  const dataDir = path.resolve(__dirname, '../../../../public/data/v1')
  const heroesRaw = JSON.parse(readFileSync(path.join(dataDir, 'hero-abilities.json'), 'utf8')) as { items: HeroAbilityProfile[] }
  const scenariosRaw = JSON.parse(readFileSync(path.join(dataDir, 'scenarios.json'), 'utf8')) as { items: OfficialPlannerScenarioModel[] }
  const resolved = resolvePlannerModel(heroesRaw.items, scenariosRaw.items, [], [])
  const vi = resolved.heroes.find(h => h.heroId === '95')
  if (!vi) throw new Error('hero 95 (蔚) not found in built hero-abilities.json')
  return vi
}

// 蔚作 support（提供善良榜样 signal）+ geneutral mock carry（善良榜样目标）+ 5 名善良 mock，凑 7 good 英雄。
// 蔚（good|acqinc）计入 count；geneutral carry 吃 buff。蔚自身无 geneutral → 不能作自己的 carry。
function buildViSupportFormation() {
  const realVi = loadRealVi()
  const carry = createHero(GENEUTRAL_CARRY_ID, [GENEUTRAL_TAG, COUNT_TAG])
  const heroes = [carry, realVi, ...MOCK_GOOD_IDS.map(id => createHero(id, [COUNT_TAG]))]
  const heroesById = new Map(heroes.map(h => [h.heroId, h]))
  const placements: Record<string, string> = {}
  scenario.slotTopology.forEach((slot, i) => {
    placements[slot.slotId] = heroes[i]!.heroId
  })
  return { carry, realVi, heroesById, placements }
}

describe('真实数据端到端（built hero-abilities.json → evaluatePlacementFit）', () => {
  // 真实蔚 signal（归一化产物）+ geneutral carry + 7 good 英雄 → 善良榜样 4^7=16384、出言不逊 1.0033^1930≈576。
  // 蔚是 support（提供 buff）；carry 须 geneutral（善良榜样 target）。蔚自身 Neutral Good 无 geneutral，
  // 若误把蔚当 carry，善良榜样对蔚不生效（target 不匹配）——这是真实数据端到端守护的核心点。
  it('善良榜样 formation-count-mult-stack: 4^7 = 16384（蔚作 support，geneutral carry，7 good 计数）', () => {
    const { carry, realVi, heroesById, placements } = buildViSupportFormation()
    const fit = evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's1',
      supportHero: realVi,
      supportSlotId: 's2',
      scenario,
      placements,
      heroesById,
      manualStackCount: viSnapshot.expected.manualStackCount,
    })

    const entry = fit.scoreBreakdown.find(r => r.rawEffect === 'hero_dps_multiplier_mult,300' && r.active)
    expect(entry, '善良榜样未 active——carry 须 geneutral，蔚作 support').toBeDefined()
    expect(entry?.multiplier ?? 0).toBeCloseTo(16384, 0)
  })

  it('出言不逊 dynamic-stack-multiply: 1.0033^1930 ≈ 576（真实 signal + bonusScaleOfSignal 联动）', () => {
    const { carry, realVi, heroesById, placements } = buildViSupportFormation()
    const fit = evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's1',
      supportHero: realVi,
      supportSlotId: 's2',
      scenario,
      placements,
      heroesById,
      manualStackCount: viSnapshot.expected.manualStackCount,
    })

    const entry = fit.scoreBreakdown.find(r => r.rawEffect === 'buff_upgrade,0.33,12312' && r.active)
    expect(entry, '出言不逊未 active——bonusScaleOfSignal 依赖善良榜样生效').toBeDefined()
    expectWithinTolerance(entry?.multiplier ?? 0, 576, TOLERANCE)
  })

  it('善良榜样 × 出言不逊 同 damage:hero pool multFactor 累乘（非 addPercent 相加）', () => {
    // 两条 signal 均 heroDpsMultiplier（damage:hero 同 pool），amountFunc=mult / stacksMultiply=true → 进 multFactor。
    // 蔚 damage:hero pool 恰好这两条 mult 类（其余 hero_dps,100/200 与 buff_upgrade 修饰 amountFunc=null 进 addPercent）。
    const { carry, realVi, heroesById, placements } = buildViSupportFormation()
    const fit = evaluatePlacementFit({
      carryHero: carry,
      carrySlotId: 's1',
      supportHero: realVi,
      supportSlotId: 's2',
      scenario,
      placements,
      heroesById,
      manualStackCount: viSnapshot.expected.manualStackCount,
    })
    const heroDpsPool = fit.pools.find(p => p.dimension === 'damage' && p.scope === 'hero')
    expect(heroDpsPool, 'damage:hero pool 须存在').toBeDefined()
    // multFactor = 16384 × ~576 ≈ 9.44e6（两条 mult 类 signal 累乘；addPercent 不影响 multFactor）
    expectWithinTolerance(heroDpsPool!.multFactor, 16384 * 576, TOLERANCE)
  })
})

describe('参照校准 expected 值真实性（非凑数）', () => {
  it('蔚 expectedMultiplier 由机制字段算术推导（perStackPercent / formationSize / manualStackCount）', () => {
    // 反向验证：expectedMultiplier 不是任意值，而是 mechanics 字段经公式推导。
    // 与游戏显示交叉（095-vi.md）：善良榜样叠层加成 1.64e06%≈16384；出言不逊 57,639%≈576。
    const ref = viSnapshot

    // 善良榜样：perStackPercent=300 + amountFunc=mult + formationSize=7 → (1+300/100)^7 = 4^7 = 16384
    const goodExample = ref.abilities.find((a) => a.rawEffect === 'hero_dps_multiplier_mult,300')!
    const goodCheck = ref.expected.multiplierChecks.find((c) => c.rawEffect === goodExample.rawEffect)!
    expect(goodExample.mechanics.perStackPercent).toBe(300)
    expect(goodExample.mechanics.amountFunc).toBe('mult')
    expect(goodCheck.expectedMultiplier).toBeCloseTo(
      (1 + (goodExample.mechanics.perStackPercent ?? 0) / 100) ** ref.context.formationSize,
      0,
    )

    // 出言不逊：perStackPercent=0.33 + stacksMultiply + manualStackCount=1930 → 1.0033^1930
    const sass = ref.abilities.find((a) => a.rawEffect === 'buff_upgrade,0.33,12312')!
    const sassCheck = ref.expected.multiplierChecks.find((c) => c.rawEffect === sass.rawEffect)!
    expect(sass.mechanics.perStackPercent).toBe(0.33)
    expect(sass.mechanics.stacksMultiply).toBe(true)
    expectWithinTolerance(
      sassCheck.expectedMultiplier,
      (1 + (sass.mechanics.perStackPercent ?? 0) / 100) ** ref.expected.manualStackCount,
      TOLERANCE,
    )
  })
})

describe('抽象阈值守护（dps-mechanic-abstraction.md）', () => {
  // 注册表 id：解析 dps-mechanics.md 注册表首列。
  const registryPath = path.resolve(__dirname, '../../../../docs/specs/modules/planner/dps-mechanics.md')
  const registry = readFileSync(registryPath, 'utf8')
  const registryIds = new Set(
    [...registry.matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]!),
  )

  it('注册表机制数 ≤ 10（>10 触发策略注册表升级，见 dps-mechanic-abstraction.md）', () => {
    expect(registryIds.size).toBeLessThanOrEqual(10)
  })
})

describe('关联一致性（mechanicId 三处一致）', () => {
  const registryPath = path.resolve(__dirname, '../../../../docs/specs/modules/planner/dps-mechanics.md')
  const registryIds = new Set(
    [...readFileSync(registryPath, 'utf8').matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]!),
  )

  it('reference 的 mechanicIds 必须在注册表', () => {
    const refs = [vi95ReferenceData]
    const unknown: string[] = []
    for (const ref of refs) {
      for (const snapshot of ref.snapshots) {
        for (const ability of snapshot.abilities ?? []) {
          for (const id of ability.mechanicIds) {
            if (!registryIds.has(id)) unknown.push(`${ref.heroId}/${ability.nameZh}: ${id}`)
          }
        }
      }
    }
    expect(unknown, `reference 出现未注册的 mechanicId：${unknown.join(', ')}`).toEqual([])
  })

  it('注册表每个机制 id 在代码中以 `// 机制: <id>` 注释存在（三处一致·代码注释 leg）', () => {
    // 三处一致第三 leg：注册表 id 必须在 placementFit.ts / effect-helpers.ts 的机制注释中出现。
    // 补齐 reference→注册表（上一测试）之外的代码注释 leg；新增机制漏注释即 fail。
    const codeSource = [
      readFileSync(path.resolve(__dirname, '../placementFit.ts'), 'utf8'),
      readFileSync(path.resolve(__dirname, '../../../../scripts/data/effect-helpers.ts'), 'utf8'),
    ].join('\n')
    const mechanismCommentLines = codeSource
      .split('\n')
      .filter((line) => line.includes('机制:'))
    const missing = [...registryIds].filter(
      (id) => !mechanismCommentLines.some((line) => line.includes(id)),
    )
    expect(missing, `注册表机制 id 在代码中缺少 // 机制: 注释：${missing.join(', ')}`).toEqual([])
  })
})

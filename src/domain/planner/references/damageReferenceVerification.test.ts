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
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { Decimal } from 'decimal.js'

import { unwrap } from '../../../../tests/utils/dom-assertions'
import type { HeroAbilityProfile } from '../../abilities/abilityModel'
import { resolvePlannerModel, type OfficialPlannerScenarioModel } from '../plannerModel'
import { scoreFormation } from '../steadyStateScoring'
import { computeEquipmentAdjustmentByHero, type LootCatalogEntry } from '../../buffs/equipmentMult'
import { evaluatePlacementFit } from '../placementFit'
import type { ChampionReference, ChampionReferenceSnapshot } from './championReferenceTypes'

// 真自动发现：新 *ReferenceData.ts 文件零注册进流。
const modules = import.meta.glob('./*ReferenceData.ts', { eager: true })
const allReferences: ChampionReference[] = Object.values(modules).flatMap((mod) =>
  Object.values(mod as Record<string, ChampionReference>),
)
const referencesByHeroId = new Map(allReferences.map((ref) => [ref.heroId, ref]))

// 加载真实 built hero-abilities.json（归一化产物），计算器本身不读文件——此处仅测试构造入参。
const __dirname = path.dirname(fileURLToPath(import.meta.url))
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

// 聚合快照的「外部加成」为全局伤害乘数（约束③：计算器只看 globalBuffMultiplier 入参，不读祝福/赞助者源）。
// 只取 source:blessing|patron 的 damageBonusPercent（hero/self 是阵型内 buff，由 signal 建模，不进 globalBuff）。
// 乘数 = Π(1 + damageBonusPercent/100)；非伤害类 buff（冷却缩减等）无 damageBonusPercent，自动跳过。
// 把 oracle 的实测外部加成转成计算器入参，用于度量「外部加成建模」对绝对偏差的收敛贡献。
function aggregateGlobalBuffMultiplier(snapshot: ChampionReferenceSnapshot): number {
  let mult = 1
  for (const b of snapshot.incomingBuffs ?? []) {
    if ((b.source === 'blessing' || b.source === 'patron') && typeof b.damageBonusPercent === 'number') {
      mult *= 1 + b.damageBonusPercent / 100
    }
  }
  return mult
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
        if (snap.id === '') issues.push(`${ref.heroId}: 缺 id`)
        if (snap.capturedAt === '') issues.push(`${ref.heroId}/${snap.id}: 缺 capturedAt`)
        if (typeof snap.context.formationSize !== 'number') issues.push(`${ref.heroId}/${snap.id}: 缺 formationSize`)
      }
    }
    expect(issues).toEqual([])
  })
})

describe('formation-buff 模式（结构正确性，CI 门控）', () => {
  it('明斯克/瓦罗单英雄快照产出正阵型聚合（真实 signal 不崩、聚合>0）', () => {
    const minscRef = unwrap(referencesByHeroId.get('7'), '参照 hero 7 未找到')
    for (const snap of minscRef.snapshots) {
      const result = scoreSingleSnapshot('7', snap)
      expect(result.objectiveValue.toNumber(), `明斯克 ${snap.id}`).toBeGreaterThan(0)
    }
    const varoRef = unwrap(referencesByHeroId.get('159'), '参照 hero 159 未找到')
    for (const snap of varoRef.snapshots) {
      const result = scoreSingleSnapshot('159', snap)
      expect(result.objectiveValue.toNumber(), `瓦罗 ${snap.id}`).toBeGreaterThan(0)
    }
  })

  it('cursed-farmer 阵型：瓦罗入阵提升明斯克阵型聚合（交叉/全局加成生效）', () => {
    const minsc = loadBuiltHero('7')
    const varo = loadBuiltHero('159')
    const scenario = cursedFarmerScenario()

    // 仅明斯克：明斯克自身 signal 聚合。
    // heroLevels 全解锁：测瓦罗真实 ability 加成。装备源已移出 base profile（加成源唯一性不变式，
    // 见 modeling-pitfalls.md），不再有 requiredLevel=null 的 baked loot 常驻信号；supportLevel=1
    // 会门控瓦罗 requiredLevel=40+ 的 ability signals，故须传 level 解锁才能验证交叉/全局加成结构。
    const heroLevels = new Map([['7', 9999], ['159', 9999]])
    const soloMinsc = scoreFormation({
      placements: { minsc: '7' },
      heroesById: new Map([['7', minsc]]),
      aggregateProjection: 'formation-buff',
      scenario,
      heroLevels,
    })
    // 明斯克 + 瓦罗：瓦罗 support signal（战斗指南/全局 buff）并入 damage pool。
    const withVaro = scoreFormation({
      placements: { minsc: '7', varo: '159' },
      heroesById: new Map([
        ['7', minsc],
        ['159', varo],
      ]),
      aggregateProjection: 'formation-buff',
      scenario,
      heroLevels,
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
      placements: { minsc: '7', varo: '159' },
      heroesById: new Map([
        ['7', minsc],
        ['159', varo],
      ]),
      dimension: 'damage',
      scenario,
    })
    // 瓦罗是 support，至少有一条 damage signal 对明斯克 active（全局或位置 buff）。
    const activeForMinsc = fit.scoreBreakdown.filter((p) => p.active)
    expect(activeForMinsc.length, '瓦罗应对明斯克有 active 的 damage support signal').toBeGreaterThan(0)
  })
})

describe('absolute-dps 模式（校准基线，记录不门控）', () => {
  // baseDamage/BUD 未校准 → 计算器绝对量与实测差几十个数量级（见 architecture.md「投影模式」）。
  // 这里度量偏差作 BUD 校准回归基线，驱动收敛；不门控 CI。
  it('明斯克外部加成聚合为全局乘数（恩赐祝福+赞助者，约束③入参）', () => {
    const minscRef = unwrap(referencesByHeroId.get('7'), '参照 hero 7 未找到')
    // 关注核心×5(+400%) · 普通种族×16(+1500%) · 以身作则×2.5(+150%) · 铁胃×2.5(+150%) = 500
    for (const snap of minscRef.snapshots) {
      const mult = aggregateGlobalBuffMultiplier(snap)
      expect(mult).toBeGreaterThan(400)
      expect(mult).toBeLessThan(600)
    }
  })

  it('明斯克 level 1/722 绝对伤害偏差被度量（对比无/含外部加成，驱动 BUD 校准）', () => {
    const minsc = loadBuiltHero('7')
    const scenario = singleSlotScenario()
    const minscRef = unwrap(referencesByHeroId.get('7'), '参照 hero 7 未找到')
    const snapById = new Map(minscRef.snapshots.map((s) => [s.id, s]))
    const observed: Record<string, string> = {
      'minsc-l1': '1.25e45',
      'minsc-l722': '5.02e62',
    }
    const levels: Record<string, number> = { 'minsc-l1': 1, 'minsc-l722': 722 }

    for (const [snapId, obsStr] of Object.entries(observed)) {
      const snap = unwrap(snapById.get(snapId), `快照 ${snapId} 未找到`)
      const globalBuff = aggregateGlobalBuffMultiplier(snap)
      const level = unwrap(levels[snapId], `level for ${snapId} 未定义`)
      const baseInput = {
        placements: { s1: '7' },
        heroesById: new Map([['7', minsc]]),
        heroLevels: new Map([['7', level]]),
        aggregateProjection: 'absolute-dps' as const,
        scenario,
      }
      const calcNoBuff = scoreFormation(baseInput).objectiveValue
      const calcWithBuff = scoreFormation({ ...baseInput, globalBuffMultiplier: globalBuff }).objectiveValue
      const obs = new Decimal(obsStr)
      // log10(calc/obs)：calc<obs 为负，绝对值 = 数量级差距。含外部加成 calc 变大 → 值往 0 靠（收敛）。
      const devNoBuff = calcNoBuff.div(obs).abs().log(10).toNumber()
      const devWithBuff = calcWithBuff.div(obs).abs().log(10).toNumber()
      // 用 process.stdout 绕过 vitest console 拦截，让偏差基线在正常跑测时可见。
      process.stdout.write(
        `\n[BUD-gap] 明斯克 ${snapId}: 外部加成×${globalBuff.toFixed(0)} | 无加成 log10=${devNoBuff.toFixed(1)} → 含加成 log10=${devWithBuff.toFixed(1)}\n`,
      )
      // 含外部加成后偏差必收敛（calc 乘 globalBuff → calc/obs 升 → log10 升）。
      expect(devWithBuff, `${snapId} 含外部加成应收敛`).toBeGreaterThan(devNoBuff)
      expect(Number.isFinite(devWithBuff)).toBe(true)
    }
  })

  it('明斯克 base attack 装备（slot1/2 hero_dps enchant 缩放）收敛 absolute-dps 偏差', () => {
    const lootCatalog = (JSON.parse(readFileSync(path.join(dataDir, 'loot-catalog.json'), 'utf8')) as { items: LootCatalogEntry[] }).items
    // 明斯克 owned loot（userdetails 实测 slot1/2 r4 enchant 734/709，对应参照 +1378%/+1343%）
    const ownedHeroes = [{
      heroId: '7',
      lootBySlot: { '1': { rarity: 4, enchant: 734 }, '2': { rarity: 4, enchant: 709 } },
    }]
    const equipmentAdjustmentByHero = computeEquipmentAdjustmentByHero(ownedHeroes, lootCatalog)
    const eqMult = equipmentAdjustmentByHero.get('7') ?? 1

    const minsc = loadBuiltHero('7')
    const scenario = singleSlotScenario()
    const minscRef = unwrap(referencesByHeroId.get('7'), '参照 hero 7 未找到')
    const snap = unwrap(minscRef.snapshots.find((s) => s.id === 'minsc-l1'), '快照 minsc-l1 未找到')
    const globalBuff = aggregateGlobalBuffMultiplier(snap)
    const baseInput = {
      placements: { s1: '7' },
      heroesById: new Map([['7', minsc]]),
      heroLevels: new Map([['7', 1]]),
      aggregateProjection: 'absolute-dps' as const,
      scenario,
    }
    const calcWithBuff = scoreFormation({ ...baseInput, globalBuffMultiplier: globalBuff }).objectiveValue
    const calcWithEq = scoreFormation({ ...baseInput, globalBuffMultiplier: globalBuff, equipmentAdjustmentByHero }).objectiveValue
    const obs = new Decimal('1.25e45')
    const devBuff = calcWithBuff.div(obs).abs().log(10).toNumber()
    const devEq = calcWithEq.div(obs).abs().log(10).toNumber()
    process.stdout.write(
      `\n[BUD-gap] 明斯克装备: equipmentMult=${eqMult.toFixed(1)} (slot1+2 hero_dps enchant 缩放) | 含外部加成 log10=${devBuff.toFixed(1)} → +装备 log10=${devEq.toFixed(1)}\n`,
    )
    // slot1+2 hero_dps base350 enchant 缩放 → ×28.2；装备使 calc 变大 → 偏差往 0 收敛。
    expect(eqMult).toBeGreaterThan(20)
    expect(devEq).toBeGreaterThan(devBuff)
  })
})

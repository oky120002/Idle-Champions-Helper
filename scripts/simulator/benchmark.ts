/**
 * 阵型模拟器性能基准
 * 用法：npm run tsx scripts/simulator/benchmark.ts [样本数]
 *
 * 测量：
 *   ① 全量推荐 (buildPlannerRecommendation) 单次耗时——用户在 UI 点一次"推荐"的体感
 *   ② 单次评分 (evaluateFormation ≈ scoreFormation + 轻量收口) 耗时
 *   ③ 据此估算「换人表」(对 top1 每槽位逐个换人重算) 的额外开销
 *
 * 合成"全英雄已拥有 level 1"快照，候选池=全英雄，是 worst case。
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

import type { HeroAbilityProfile } from '../../src/domain/abilities/abilityModel.ts'
import type { OfficialPlannerScenarioModel } from '../../src/domain/planner/plannerModel.ts'
import { resolvePlannerModel } from '../../src/domain/planner/plannerModel.ts'
import {
  buildPlannerRecommendation,
  evaluateFormation,
} from '../../src/domain/planner/recommendationEngine.ts'
import type { PlannerCollections } from '../../src/domain/planner/recommendationTypes.ts'
import type { Variant } from '../../src/domain/types/formation.ts'
import { createOwnedHero, createUserProfileSnapshot } from '../../src/domain/user-profile/fixtures.ts'
import type { UserProfileSnapshot } from '../../src/domain/user-profile/types.ts'

const DATA_DIR = path.resolve('public/data/v1')

async function loadJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(path.join(DATA_DIR, `${name}.json`), 'utf8')) as T
}

async function loadCollections(): Promise<PlannerCollections> {
  const [variantsRaw, heroesRaw, scenariosRaw] = await Promise.all([
    loadJson<{ items: Variant[] }>('variants'),
    loadJson<{ items: HeroAbilityProfile[] }>('hero-abilities'),
    loadJson<{ items: OfficialPlannerScenarioModel[] }>('scenarios'),
  ])
  const resolved = resolvePlannerModel(heroesRaw.items, scenariosRaw.items, [], [])
  return { variants: variantsRaw.items, plannerHeroes: resolved.heroes, plannerScenarios: resolved.scenarios }
}

function synthesizeAllOwnedProfile(collections: PlannerCollections): UserProfileSnapshot {
  const ownedCount = process.env.OWNED ? Number(process.env.OWNED) : collections.plannerHeroes.length
  // 跨 seat 均匀采样，避免 slice(0,N) 聚集个别 seat 导致 variant 命中 blocker 快路径（测不到搜索）
  const bySeat = [...collections.plannerHeroes].sort((a, b) => a.seat - b.seat)
  const heroes: typeof bySeat = []
  const step = Math.max(1, Math.floor(bySeat.length / ownedCount))
  for (let i = 0; i < bySeat.length && heroes.length < ownedCount; i += step) heroes.push(bySeat[i])
  return createUserProfileSnapshot({
    ownedHeroes: heroes.map((hero) => createOwnedHero({ heroId: hero.heroId, level: 1 })),
    warnings: [],
  })
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

function fmt(ms: number): string {
  return ms < 100 ? `${ms.toFixed(1)}ms` : `${(ms / 1000).toFixed(2)}s`
}

async function main() {
  const sampleCount = Number(process.argv[2] ?? '10')
  const collections = await loadCollections()
  const profile = synthesizeAllOwnedProfile(collections)
  const variants = collections.variants
  const step = Math.max(1, Math.floor(variants.length / sampleCount))
  const picked: Variant[] = []
  for (let i = 0; i < variants.length && picked.length < sampleCount; i += step) picked.push(variants[i])

  process.stdout.write(
    `[benchmark] variants=${variants.length} sampled=${picked.length} heroes=${collections.plannerHeroes.length}\n`,
  )

  // 预热（JIT / cache），不计入
  buildPlannerRecommendation(picked[0], collections, profile, {})

  const recommendTimes: number[] = []
  let blocked = 0
  for (const variant of picked) {
    const t0 = performance.now()
    const rec = buildPlannerRecommendation(variant, collections, profile, {})
    const dt = performance.now() - t0
    if (rec.result) recommendTimes.push(dt)
    else blocked += 1
  }

  // 单次评分耗时（evaluateFormation ≈ 一次 scoreFormation + 合法性/解释收口，是 swap 代价的上界）
  const sampleVariant = picked[0]
  const sampleRec = buildPlannerRecommendation(sampleVariant, collections, profile, {})
  const evalTimes: number[] = []
  let swapCallEstimate = 0
  let top1Slots = 0
  if (sampleRec.result) {
    const placements = sampleRec.result.placements
    top1Slots = Object.keys(placements).length
    for (let i = 0; i < 30; i++) {
      const t0 = performance.now()
      evaluateFormation(sampleVariant, collections, profile, placements, {})
      evalTimes.push(performance.now() - t0)
    }
    // 估算「换人表」需要多少次评分：每槽位换人时，可换候选 = seat 未被其它槽位占用的英雄
    const heroById = new Map(collections.plannerHeroes.map((h) => [h.heroId, h]))
    const placedSeats = new Set<number>()
    for (const heroId of Object.values(placements)) {
      const h = heroById.get(heroId)
      if (h) placedSeats.add(h.seat)
    }
    const placedHeroIds = new Set(Object.values(placements))
    for (const slotId of Object.keys(placements)) {
      const currentHero = heroById.get(placements[slotId])
      // 换掉本槽位后，本槽位英雄的 seat 也释放
      const freedSeats = new Set(placedSeats)
      if (currentHero) freedSeats.delete(currentHero.seat)
      for (const h of collections.plannerHeroes) {
        if (placedHeroIds.has(h.heroId)) continue
        if (freedSeats.has(h.seat)) swapCallEstimate += 1
      }
    }
  }

  process.stdout.write(`\n=== ① 全量推荐 (buildPlannerRecommendation) 单次耗时 ===\n`)
  process.stdout.write(
    `  样本 ${recommendTimes.length} 个 variant（全英雄已拥有，worst case）；blocked=${blocked}\n`,
  )
  process.stdout.write(
    `  min=${fmt(Math.min(...recommendTimes))}  median=${fmt(median(recommendTimes))}  max=${fmt(Math.max(...recommendTimes))}\n`,
  )
  process.stdout.write(`  逐个：${recommendTimes.map((t, i) => `#${i + 1}=${fmt(t)}`).join('  ')}\n`)

  if (evalTimes.length) {
    const perCall = median(evalTimes)
    process.stdout.write(`\n=== ② 单次评分 (evaluateFormation) ===\n`)
    process.stdout.write(`  median=${fmt(perCall)}（30 次）\n`)
    process.stdout.write(`\n=== ③ 「换人表」估算开销 ===\n`)
    process.stdout.write(`  top1 槽位数=${top1Slots}，需评分次数≈${swapCallEstimate}（每槽位所有合法换人）\n`)
    process.stdout.write(`  估算 ≈ ${swapCallEstimate} × ${fmt(perCall)} = ${fmt(swapCallEstimate * perCall)}\n`)
    process.stdout.write(`  注：显示 top 3 也必须全评分才能排序；上界估算（含合法性/解释收口）\n`)
  }
}

main().catch((error) => {
  process.stderr.write(`[benchmark] ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})

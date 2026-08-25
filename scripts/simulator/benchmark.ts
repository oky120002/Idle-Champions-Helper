/**
 * 阵型模拟器性能基准
 * 用法：pnpm run simulate:benchmark [样本数]    # OWNED=N 控制持有英雄数（跨 seat 均匀采样）
 *
 * 测量三档计算模式（full / p90 / p50）下 buildPlannerRecommendation 单次耗时，
 * 以及单次评估（evaluateFormation）耗时。合成快照默认全英雄已拥有（worst case）。
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import process from 'node:process'

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
  const ownedEnv = process.env.OWNED
  const ownedCount = ownedEnv != null && ownedEnv !== '' ? Number(ownedEnv) : collections.plannerHeroes.length
  // 跨 seat 均匀采样，避免 slice(0,N) 聚集个别 seat 导致 variant 命中 blocker 快路径（测不到搜索）
  const bySeat = [...collections.plannerHeroes].sort((a, b) => a.seat - b.seat)
  const heroes: typeof bySeat = []
  const step = Math.max(1, Math.floor(bySeat.length / ownedCount))
  for (let i = 0; i < bySeat.length && heroes.length < ownedCount; i += step) {
    const hero = bySeat[i]
    if (hero === undefined) throw new Error('采样索引越界：bySeat[i] 应在范围内')
    heroes.push(hero)
  }
  return createUserProfileSnapshot({
    ownedHeroes: heroes.map((hero) => createOwnedHero({ heroId: hero.heroId, level: 1 })),
    warnings: [],
  })
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
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
  for (let i = 0; i < variants.length && picked.length < sampleCount; i += step) {
    const variant = variants[i]
    if (variant === undefined) throw new Error('采样索引越界：variants[i] 应在范围内')
    picked.push(variant)
  }

  process.stdout.write(
    `[benchmark] variants=${String(variants.length)} sampled=${String(picked.length)} heroes=${String(collections.plannerHeroes.length)}\n`,
  )

  // 预热（JIT / cache），不计入
  const warmupVariant = picked[0]
  if (warmupVariant === undefined) throw new Error('预热需要至少一个 variant')
  buildPlannerRecommendation({ collections, variant: warmupVariant, profileSnapshot: profile, options: {} })

  // 三档计算模式对比：full（全量）/ p90 / p50（每席位按收益取前比例）
  const MODES = ['full', 'p90', 'p50'] as const
  type Mode = (typeof MODES)[number]
  const byMode: Record<Mode, number[]> = { full: [], p90: [], p50: [] }
  let blocked = 0
  for (const variant of picked) {
    for (const mode of MODES) {
      const t0 = performance.now()
      const rec = buildPlannerRecommendation({ variant, collections, profileSnapshot: profile, options: { computationMode: mode } })
      const dt = performance.now() - t0
      if (rec.result) byMode[mode].push(dt)
      else if (mode === 'full') blocked += 1
    }
  }

  process.stdout.write(`\n=== 计算模式对比（buildPlannerRecommendation 单次耗时）===\n`)
  process.stdout.write(`  样本 ${String(picked.length)} 个 variant（全英雄已拥有 worst case）；blocked=${String(blocked)}\n`)
  for (const mode of MODES) {
    const times = byMode[mode]
    if (times.length === 0) {
      process.stdout.write(`  ${mode}: (无合法结果)\n`)
      continue
    }
    process.stdout.write(
      `  ${mode.padEnd(5)} median=${fmt(median(times))}  min=${fmt(Math.min(...times))}  max=${fmt(Math.max(...times))}\n`,
    )
  }

  // 单次评估耗时（evaluateFormation ≈ 一次 scoreFormation + 合法性/解释收口）
  const sampleVariant = picked[0]
  if (sampleVariant === undefined) throw new Error('需要至少一个 variant 进行评估基准')
  const sampleRec = buildPlannerRecommendation({ collections, variant: sampleVariant, profileSnapshot: profile, options: {} })
  const evalTimes: number[] = []
  if (sampleRec.result) {
    const placements = sampleRec.result.placements
    for (let i = 0; i < 30; i++) {
      const t0 = performance.now()
      evaluateFormation({ collections, placements, variant: sampleVariant, profileSnapshot: profile, options: {} })
      evalTimes.push(performance.now() - t0)
    }
    process.stdout.write(`\n=== 单次评估 (evaluateFormation) median=${fmt(median(evalTimes))}（30 次）===\n`)
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`[benchmark] ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})

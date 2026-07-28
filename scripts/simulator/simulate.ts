/**
 * 阵型模拟器 CLI —— 证明"丢掉 webUI，直接调用引擎输出 JSON"。
 *
 * 用法：
 *   npm run simulate -- recommend [variantId]                     # 搜索最佳阵型，输出 Top K JSON
 *   npm run simulate -- evaluate <variantId> --placements '<json>' # 评估指定阵型
 *   npm run simulate -- recommend --profile tmp/.../snapshot.json  # 用真实账号快照
 *
 * 无 --profile 时合成"全英雄已拥有（level 1）"快照以演示完整链路；真实使用请传账号快照。
 * 数据来源：public/data/v1/*.json（resolvePlannerModel 纯函数解析，无浏览器依赖）。
 *
 * 输出：JSON 打印到 stdout（含 formation / carry / dps / pools / contributions 拆解）。
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { HeroAbilityProfile } from '../../src/domain/abilities/abilityModel.ts'
import type { OfficialPlannerScenarioModel } from '../../src/domain/planner/plannerModel.ts'
import { resolvePlannerModel } from '../../src/domain/planner/plannerModel.ts'
import {
  buildPlannerRecommendation,
  evaluateFormation,
  type PlannerRecommendationOptions,
} from '../../src/domain/planner/recommendationEngine.ts'
import type { PlannerCollections } from '../../src/domain/planner/recommendationTypes.ts'
import type { Variant } from '../../src/domain/types/formation.ts'
import { createOwnedHero, createUserProfileSnapshot } from '../../src/domain/user-profile/fixtures.ts'
import type { UserProfileSnapshot } from '../../src/domain/user-profile/types.ts'

const DATA_DIR = path.resolve('public/data/v1')

interface DataCollection<T> {
  items: T[]
  updatedAt: string
}

async function loadJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(path.join(DATA_DIR, `${name}.json`), 'utf8')) as T
}

async function loadCollections(): Promise<PlannerCollections> {
  const [variantsRaw, heroesRaw, scenariosRaw] = await Promise.all([
    loadJson<DataCollection<Variant>>('variants'),
    loadJson<DataCollection<HeroAbilityProfile>>('hero-abilities'),
    loadJson<DataCollection<OfficialPlannerScenarioModel>>('scenarios'),
  ])
  // CLI 无浏览器 IndexedDB 本地 override；repo override（semantic-overrides.json）目前为空。
  const resolved = resolvePlannerModel(heroesRaw.items, scenariosRaw.items, [], [])
  return {
    variants: variantsRaw.items,
    plannerHeroes: resolved.heroes,
    plannerScenarios: resolved.scenarios,
  }
}

/** 演示用合成快照：全英雄视为已拥有（level 1），让 owned-only 候选池覆盖所有人。 */
function synthesizeAllOwnedProfile(collections: PlannerCollections): UserProfileSnapshot {
  return createUserProfileSnapshot({
    ownedHeroes: collections.plannerHeroes.map((hero) =>
      createOwnedHero({ heroId: hero.heroId, level: 1 }),
    ),
    warnings: ['CLI 合成快照：全英雄 level 1 演示；真实使用请传 --profile 账号快照。'],
  })
}

interface CliArgs {
  mode: 'recommend' | 'evaluate'
  variantId: string | null
  placements: Record<string, string> | null
  profilePath: string | null
  options: PlannerRecommendationOptions
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2)
  let mode: 'recommend' | 'evaluate' = 'recommend'
  let variantId: string | null = null
  let placements: Record<string, string> | null = null
  let profilePath: string | null = null

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === 'recommend' || arg === 'evaluate') {
      mode = arg
    } else if (arg === '--profile') {
      profilePath = args[++i] ?? null
    } else if (arg === '--placements') {
      placements = JSON.parse(args[++i] ?? '{}') as Record<string, string>
    } else if (arg?.startsWith('--')) {
      throw new Error(`未知参数：${arg}`)
    } else {
      variantId = arg ?? null
    }
  }

  return { mode, variantId, placements, profilePath, options: {} }
}

async function main() {
  const { mode, variantId, placements, profilePath, options } = parseArgs(process.argv)

  if (mode === 'evaluate' && !placements) {
    throw new Error('evaluate 模式需要 --placements \'{"slotId":"heroId",...}\'')
  }

  const collections = await loadCollections()
  const variant =
    (variantId && collections.variants.find((item) => item.id === variantId)) ?? collections.variants[0] ?? null
  if (!variant) {
    throw new Error('未找到任何 variant（public/data/v1/variants.json 为空）')
  }
  if (variantId && variant.id !== variantId) {
    process.stderr.write(`[simulate] 未找到 variant ${variantId}，回退首个 variant：${variant.id}\n`)
  }

  const profile = profilePath
    ? (JSON.parse(await readFile(profilePath, 'utf8')) as UserProfileSnapshot)
    : synthesizeAllOwnedProfile(collections)

  const output =
    mode === 'evaluate'
      ? evaluateFormation({ variant, collections, profileSnapshot: profile, placements: placements ?? {}, options })
      : buildPlannerRecommendation({ variant, collections, profileSnapshot: profile, options })

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
}

main().catch((error) => {
  process.stderr.write(`[simulate] ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})

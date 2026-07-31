import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { asArray, asRecord, readJson, readJsonIfExists, writeJson } from './io-utils.ts'
import { computePipelineHash, isForceDataRebuild, shouldSkipDataPipeline } from './resource-sync-policy.ts'
import { parsePatronPerkSignals } from './patron-perk-signals.ts'
import { buildOfficialHeroModel } from './buildHeroModels.ts'
import { buildOfficialScenarioModel } from './buildScenarioModels.ts'
import { normalizeSemanticOverrides } from './buildSemanticOverrides.ts'
import { buildSpecializationEntries, type SpecializationEntry } from './specialization-catalog.ts'
import type { HeroAbilityProfile, HeroAbilitySignal } from '../../src/domain/abilities/abilityModel'

const DEFAULT_VERSION_DIR = 'public/data/v1'
const DEFAULT_SEMANTIC_OVERRIDES = 'scripts/data/semantic-overrides.json'

interface BuildModelsOptions {
  versionDir?: string
  semanticOverridesFile?: string
}

interface BuildModelsResult {
  versionDir: string
  updatedAt: string
  heroCount: number
  scenarioCount: number
  /** 数据管线源码指纹（data-normalization.md §12）。 */
  pipelineHash: string
  /** 增量跳过时为 true。 */
  skipped?: boolean
}

export async function buildModels(options: BuildModelsOptions = {}): Promise<BuildModelsResult> {
  const versionDir = path.resolve(options.versionDir ?? DEFAULT_VERSION_DIR)
  const semanticOverridesFile = path.resolve(
    options.semanticOverridesFile ?? DEFAULT_SEMANTIC_OVERRIDES,
  )
  const champions = await readJson(path.join(versionDir, 'champions.json'))
  const variants = await readJson(path.join(versionDir, 'variants.json'))
  const formations = await readJson(path.join(versionDir, 'formations.json'))
  const semanticOverrides = await readJson(semanticOverridesFile).catch(() => ({ heroOverrides: {} }))
  const championsRecord = asRecord(champions) ?? {}
  const variantsRecord = asRecord(variants) ?? {}
  const formationsRecord = asRecord(formations) ?? {}
  const updatedAtRaw = championsRecord.updatedAt ?? variantsRecord.updatedAt ?? formationsRecord.updatedAt
  const updatedAt = typeof updatedAtRaw === 'string' ? updatedAtRaw : ''

  // 数据管线增量跳过（data-normalization.md §12）：输入（champion-details 等，由 normalize 产）未变 +
  // build 逻辑指纹未变 → skip。normalize skip 时输入不变，build 也 skip；FORCE_DATA_REBUILD=1 强制。
  const nextPipelineHash = await computePipelineHash()
  if (!isForceDataRebuild()) {
    const existingHeroAbilities = await readJsonIfExists(path.join(versionDir, 'hero-abilities.json')) as
      | { updatedAt?: unknown; pipelineHash?: unknown; items?: unknown[] }
      | null
    if (
      shouldSkipDataPipeline({
        existingUpdatedAt: existingHeroAbilities?.updatedAt,
        existingHash: existingHeroAbilities?.pipelineHash,
        nextUpdatedAt: updatedAt,
        nextHash: nextPipelineHash,
      })
    ) {
      const existingScenarios = await readJsonIfExists(path.join(versionDir, 'scenarios.json')) as
        | { items?: unknown[] }
        | null
      console.log(`build-models skipped: pipelineHash=${nextPipelineHash}（FORCE_DATA_REBUILD=1 可强制重跑）`)
      return {
        versionDir,
        updatedAt,
        pipelineHash: nextPipelineHash,
        heroCount: Array.isArray(existingHeroAbilities?.items) ? existingHeroAbilities.items.length : 0,
        scenarioCount: Array.isArray(existingScenarios?.items) ? existingScenarios.items.length : 0,
        skipped: true,
      }
    }
  }

  const heroAbilities: HeroAbilityProfile[] = []
  const specializationCatalog: Record<string, SpecializationEntry[]> = {}
  for (const championRaw of asArray(championsRecord.items)) {
    const champion = asRecord(championRaw)
    if (!champion) continue
    const championId = typeof champion.id === 'string' || typeof champion.id === 'number'
      ? String(champion.id)
      : ''
    const detail = await readJson(path.join(versionDir, 'champion-details', `${championId}.json`))
    const detailRecord = asRecord(detail) ?? {}
    heroAbilities.push(buildOfficialHeroModel(champion, detailRecord))
    // 专精 upgrade → 按 heroId 索引的可选 signal catalog（ADR 0017）；无专精的英雄不进 catalog。
    const specializationEntries = buildSpecializationEntries(detailRecord)
    if (specializationEntries.length > 0) {
      specializationCatalog[championId] = specializationEntries
    }
  }

  const scenarioModels = asArray(variantsRecord.items)
    .map((variantRaw) => {
      const variant = asRecord(variantRaw) ?? {}
      return buildOfficialScenarioModel(variant, asArray(formationsRecord.items))
    })

  await writeJson(path.join(versionDir, 'hero-abilities.json'), {
    items: heroAbilities,
    updatedAt,
    pipelineHash: nextPipelineHash,
  })
  await writeJson(path.join(versionDir, 'specialization-catalog.json'), {
    catalog: specializationCatalog,
    updatedAt,
  })
  await writeJson(path.join(versionDir, 'scenarios.json'), {
    items: scenarioModels,
    updatedAt,
  })

  // patron-perk 全局加成 → global-buffs.json（per-patron patronPerkMult signals）
  const patronPerksRaw = await readJson(path.join(versionDir, 'patron-perks.json')).catch(() => ({ perks: [] }))
  const patronPerksRecord = asRecord(patronPerksRaw) ?? {}
  const patronPerkItems = asArray(patronPerksRecord.perks) as Array<Record<string, unknown>>
  const patronPerkSignals = parsePatronPerkSignals(patronPerkItems)
  const globalBuffsByPatron: Record<string, HeroAbilitySignal[]> = {}
  for (const entry of patronPerkSignals) {
    const list = globalBuffsByPatron[entry.patronId]
    if (list) {
      list.push(entry.signal)
    } else {
      globalBuffsByPatron[entry.patronId] = [entry.signal]
    }
  }
  await writeJson(path.join(versionDir, 'global-buffs.json'), {
    buffsByPatron: globalBuffsByPatron,
    updatedAt,
  })
  await writeJson(
    path.join(versionDir, 'semantic-overrides.json'),
    normalizeSemanticOverrides(semanticOverrides, updatedAt),
  )

  return {
    versionDir,
    updatedAt,
    heroCount: heroAbilities.length,
    scenarioCount: scenarioModels.length,
    pipelineHash: nextPipelineHash,
  }
}

async function main(): Promise<void> {
  const result = await buildModels()

  console.log('hero ability model 构建完成：')
  console.log(`- version dir: ${result.versionDir}`)
  console.log(`- updatedAt: ${result.updatedAt}`)
  console.log(`- heroes: ${result.heroCount}`)
  console.log(`- scenarios: ${result.scenarioCount}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`构建 hero ability model 失败：${message}`)
    process.exitCode = 1
  })
}

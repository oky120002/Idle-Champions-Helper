import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { fetchDefinitionsSnapshot } from './fetch-idle-champions-definitions.mjs'
import { normalizeDefinitionsSnapshot } from './normalize-idle-champions-definitions.mjs'
import { auditChampionAnimations } from './audit-idle-champions-animations.mjs'
import { syncChampionAnimations } from './sync-idle-champions-animations.mjs'
import { syncChampionIllustrations } from './sync-idle-champions-illustrations.mjs'
import { syncPetsCatalog } from './sync-idle-champions-pets.mjs'
import { syncChampionConsolePortraits } from './sync-idle-champions-console-portraits.mjs'
import { syncChampionPortraits } from './sync-idle-champions-portraits.mjs'
import { syncChampionEquipmentIcons } from './sync-idle-champions-equipment-icons.mjs'
import { syncChampionSpecializationGraphics } from './sync-idle-champions-specialization-graphics.mjs'
import { buildModels } from './data/build-models.mjs'
import { buildSearchIndex } from './data/build-search-index.mjs'
import {
  readUpdatedAtFromJsonFile,
  shouldSkipResourceSync,
  writeUpdatedAtJsonFile,
} from './data/resource-sync-policy.mjs'

const DEFAULT_VERSION_FILE = 'public/data/version.json'
const DEFAULT_RESOURCE_SYNC_STATE_FILE = 'public/data/resource-sync-state.json'

async function main() {
  const { values } = parseArgs({
    options: {
      outDir: { type: 'string' },
      outputDir: { type: 'string' },
      versionFile: { type: 'string' },
      resourceSyncStateFile: { type: 'string' },
      currentVersion: { type: 'string' },
      manualOverrides: { type: 'string' },
      idleOverridesFile: { type: 'string' },
      masterApiUrl: { type: 'string' },
      playserverClientVersion: { type: 'string' },
      definitionsClientVersion: { type: 'string' },
      sourceLanguageId: { type: 'string' },
      displayLanguageId: { type: 'string' },
      animationChampionIds: { type: 'string' },
      animationSkinIds: { type: 'string' },
      help: { type: 'boolean' },
    },
  })

  if (values.help) {
    console.log(`用法：
  node scripts/build-idle-champions-data.mjs [--outDir <raw-dir>] [--outputDir <data-dir>]

说明：
  一次拉取当前所有可公开获取的官方基座数据：
  1. 官方原文 definitions（每次都会重新拉取最新）
  2. language_id=7 中文 definitions（每次都会重新拉取最新）
  3. champions / adventures / variants / patrons / game-rules / effect-reference / patron-perks / trials / formations / enums 归一化数据
  4. 官方英雄头像资源
  5. 详情页正面图资源
  6. 详情页升级区本地专精图资源
  7. 英雄装备 icon 资源
  8. 详情页动态 hero-base / skin 动画原始资源
  9. 基于动画默认帧生成本地静态立绘（缺动画直接报错）
  10. 宠物目录、静态图与可播放的本地动图清单

推荐入口：
  npm run data:official

可选参数：
  --animationChampionIds <ids>       仅重建这些 championId 的 hero-base / skin 动画与关联静态图（默认全量）
  --animationSkinIds <ids>           仅重建这些 skinId 的 skin 动画与关联静态图（默认全量）
  --idleOverridesFile <file>         idle 动画人工覆写 JSON，默认 scripts/data/champion-animation-idle-overrides.json
  --resourceSyncStateFile <file>     全局资源同步状态文件，默认 ${DEFAULT_RESOURCE_SYNC_STATE_FILE}`)
    return
  }

  const sourceLanguageId = values.sourceLanguageId ?? '1'
  const displayLanguageId = values.displayLanguageId ?? '7'
  const versionFile = values.versionFile ?? DEFAULT_VERSION_FILE
  const resourceSyncStateFile = values.resourceSyncStateFile ?? DEFAULT_RESOURCE_SYNC_STATE_FILE
  const previousResourceUpdatedAt = await readUpdatedAtFromJsonFile(resourceSyncStateFile)
  const fetched = await fetchDefinitionsSnapshot({
    ...values,
    languageId: sourceLanguageId,
    fileLabel: `lang-${sourceLanguageId}-source`,
  })
  const localizedFetched = await fetchDefinitionsSnapshot({
    ...values,
    languageId: displayLanguageId,
    fileLabel: `lang-${displayLanguageId}-display`,
  })
  const normalized = await normalizeDefinitionsSnapshot({
    input: fetched.rawFile,
    localizedInput: localizedFetched.rawFile,
    outputDir: values.outputDir,
    versionFile,
    currentVersion: values.currentVersion,
    manualOverrides: values.manualOverrides,
  })
  const plannerModels = await buildModels({
    versionDir: normalized.outputDir,
  })
  const searchIndex = await buildSearchIndex({
    versionDir: normalized.outputDir,
  })
  const shouldSkipAllResourceDownloads = shouldSkipResourceSync({
    existingUpdatedAt: previousResourceUpdatedAt,
    nextUpdatedAt: normalized.updatedAt,
  })

  if (shouldSkipAllResourceDownloads) {
    console.log('官方基座数据流水线完成：')
    console.log(
      `- resources skipped: resource-sync-state.updatedAt=${previousResourceUpdatedAt}, next=${normalized.updatedAt}`,
    )
    console.log(`- source raw: ${fetched.rawFile}`)
    console.log(`- display raw: ${localizedFetched.rawFile}`)
    console.log(`- normalized dir: ${normalized.outputDir}`)
    console.log(`- planner models: heroes ${plannerModels.heroCount}, scenarios ${plannerModels.scenarioCount}`)
    console.log(`- search index: heroes ${searchIndex.heroCount}, chars ${searchIndex.totalChars}`)
    console.log(`- version file: ${normalized.versionFile}`)
    console.log(`- resource sync state: ${resourceSyncStateFile}`)
    return
  }

  const portraits = await syncChampionPortraits({
    input: fetched.rawFile,
    outputDir: values.outputDir,
    currentVersion: values.currentVersion,
    masterApiUrl: values.masterApiUrl,
  })
  const consolePortraits = await syncChampionConsolePortraits({
    input: fetched.rawFile,
    outputDir: values.outputDir,
    currentVersion: values.currentVersion,
    masterApiUrl: values.masterApiUrl,
  })
  const specializationGraphics = await syncChampionSpecializationGraphics({
    input: fetched.rawFile,
    outputDir: values.outputDir,
    currentVersion: values.currentVersion,
    masterApiUrl: values.masterApiUrl,
  })
  const equipmentIcons = await syncChampionEquipmentIcons({
    input: fetched.rawFile,
    outputDir: values.outputDir,
    currentVersion: values.currentVersion,
    masterApiUrl: values.masterApiUrl,
  })
  const animations = await syncChampionAnimations({
    input: fetched.rawFile,
    outputDir: values.outputDir,
    currentVersion: values.currentVersion,
    championIds: values.animationChampionIds,
    skinIds: values.animationSkinIds,
  })
  const animationAudit = await auditChampionAnimations({
    outputDir: values.outputDir,
    currentVersion: values.currentVersion,
    championIds: values.animationChampionIds,
    skinIds: values.animationSkinIds,
  })
  const illustrations = await syncChampionIllustrations({
    outputDir: values.outputDir,
    currentVersion: values.currentVersion,
    championIds: values.animationChampionIds,
    skinIds: values.animationSkinIds,
  })
  const pets = await syncPetsCatalog({
    input: fetched.rawFile,
    localizedInput: localizedFetched.rawFile,
    outputDir: values.outputDir,
    currentVersion: values.currentVersion,
    masterApiUrl: values.masterApiUrl,
  })
  await writeUpdatedAtJsonFile(resourceSyncStateFile, {
    updatedAt: normalized.updatedAt,
    resources: [
      'champion-portraits',
      'champion-console-portraits',
      'champion-specialization-graphics',
      'champion-equipment-icons',
      'champion-animations',
      'champion-animation-audit',
      'champion-illustrations',
      'pets',
    ],
  })

  console.log(`官方基座数据流水线完成：`)
  console.log(`- included: definitions(source + zh) + normalized collections + champion portraits + champion console portraits + champion specialization graphics + champion equipment icons + champion illustrations + champion animations + pet catalog + pet animations`)
  console.log(`- source raw: ${fetched.rawFile}`)
  console.log(`- display raw: ${localizedFetched.rawFile}`)
  console.log(`- normalized dir: ${normalized.outputDir}`)
  console.log(`- planner models: heroes ${plannerModels.heroCount}, scenarios ${plannerModels.scenarioCount}`)
  console.log(`- search index: heroes ${searchIndex.heroCount}, chars ${searchIndex.totalChars}`)
  console.log(`- portraits dir: ${portraits.outputDir}`)
  console.log(`- console portraits dir: ${consolePortraits.outputDir}`)
  console.log(`- specialization graphics dir: ${specializationGraphics.outputDir}`)
  console.log(`- equipment icons dir: ${equipmentIcons.outputDir} (${equipmentIcons.count} items)`)
  console.log(`- illustrations dir: ${illustrations.outputDir}`)
  console.log(`- animations dir: ${animations.outputDir} (${animations.count} items)`)
  console.log(`- animation audit: ${animationAudit.auditFile} (${animationAudit.reviewedCount} flagged)`)
  console.log(`- pets: ${pets.count} (assets ${pets.assetCount}, animations ${pets.counts.animations})`)
  console.log(`- version file: ${normalized.versionFile}`)
  console.log(`- resource sync state: ${resourceSyncStateFile}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`构建公共数据失败：${error.message}`)
    process.exitCode = 1
  })
}

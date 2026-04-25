import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { fetchDefinitionsSnapshot } from './fetch-idle-champions-definitions.mjs'
import { normalizeDefinitionsSnapshot } from './normalize-idle-champions-definitions.mjs'
import { auditChampionAnimations } from './audit-idle-champions-animations.mjs'
import { syncChampionAnimations } from './sync-idle-champions-animations.mjs'
import { syncChampionIllustrations } from './sync-idle-champions-illustrations.mjs'
import { syncPetsCatalog } from './sync-idle-champions-pets.mjs'
import { syncChampionPortraits } from './sync-idle-champions-portraits.mjs'
import { syncChampionSpecializationGraphics } from './sync-idle-champions-specialization-graphics.mjs'

async function main() {
  const { values } = parseArgs({
    options: {
      outDir: { type: 'string' },
      outputDir: { type: 'string' },
      versionFile: { type: 'string' },
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
  3. champions / variants / formations / enums 归一化数据
  4. 官方英雄头像资源
  5. 详情页升级区本地专精图资源
  6. 详情页动态 hero-base / skin 动画原始资源
  7. 基于动画默认帧生成本地静态立绘（无动画包时再回退）
  8. 宠物目录、静态图与可播放的本地动图清单

推荐入口：
  npm run data:official

可选参数：
  --animationChampionIds <ids>       仅重建这些 championId 的 hero-base / skin 动画与关联静态图（默认全量）
  --animationSkinIds <ids>           仅重建这些 skinId 的 skin 动画与关联静态图（默认全量）
  --idleOverridesFile <file>         idle 动画人工覆写 JSON，默认 scripts/data/champion-animation-idle-overrides.json`)
    return
  }

  const sourceLanguageId = values.sourceLanguageId ?? '1'
  const displayLanguageId = values.displayLanguageId ?? '7'
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
    versionFile: values.versionFile,
    currentVersion: values.currentVersion,
    manualOverrides: values.manualOverrides,
  })
  const portraits = await syncChampionPortraits({
    input: fetched.rawFile,
    outputDir: values.outputDir,
    masterApiUrl: values.masterApiUrl,
  })
  const specializationGraphics = await syncChampionSpecializationGraphics({
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
    input: fetched.rawFile,
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

  console.log(`官方基座数据流水线完成：`)
  console.log(`- included: definitions(source + zh) + normalized collections + champion portraits + champion illustrations + champion animations + pet catalog + pet animations`)
  console.log(`- source raw: ${fetched.rawFile}`)
  console.log(`- display raw: ${localizedFetched.rawFile}`)
  console.log(`- normalized dir: ${normalized.outputDir}`)
  console.log(`- portraits dir: ${portraits.outputDir}`)
  console.log(`- specialization graphics dir: ${specializationGraphics.outputDir}`)
  console.log(`- illustrations dir: ${illustrations.outputDir}`)
  console.log(`- animations dir: ${animations.outputDir} (${animations.count} items)`)
  console.log(`- animation audit: ${animationAudit.auditFile} (${animationAudit.reviewedCount} flagged)`)
  console.log(`- pets: ${pets.count} (assets ${pets.assetCount}, animations ${pets.counts.animations})`)
  console.log(`- version file: ${normalized.versionFile}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`构建公共数据失败：${error.message}`)
    process.exitCode = 1
  })
}

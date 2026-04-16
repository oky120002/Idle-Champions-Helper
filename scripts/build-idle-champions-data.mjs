import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { fetchDefinitionsSnapshot } from './fetch-idle-champions-definitions.mjs'
import { normalizeDefinitionsSnapshot } from './normalize-idle-champions-definitions.mjs'
import { syncChampionIllustrations } from './sync-idle-champions-illustrations.mjs'
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
      illustrationOverrides: { type: 'string' },
      masterApiUrl: { type: 'string' },
      playserverClientVersion: { type: 'string' },
      definitionsClientVersion: { type: 'string' },
      sourceLanguageId: { type: 'string' },
      displayLanguageId: { type: 'string' },
      help: { type: 'boolean' },
    },
  })

  if (values.help) {
    console.log(`用法：
  node scripts/build-idle-champions-data.mjs [--outDir <raw-dir>] [--outputDir <data-dir>]

说明：
  一次拉取当前所有可公开获取的官方基座数据：
  1. 官方原文 definitions
  2. language_id=7 中文 definitions
  3. champions / variants / formations / enums 归一化数据
  4. 官方英雄头像资源
  5. 详情页升级区本地专精图资源
  6. 立绘页所需的本地静态立绘资源

推荐入口：
  npm run data:official`)
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
  const illustrations = await syncChampionIllustrations({
    input: fetched.rawFile,
    outputDir: values.outputDir,
    currentVersion: values.currentVersion,
    illustrationOverrides: values.illustrationOverrides,
  })

  console.log(`官方基座数据流水线完成：`)
  console.log(`- included: definitions(source + zh) + normalized collections + champion portraits + champion illustrations`)
  console.log(`- source raw: ${fetched.rawFile}`)
  console.log(`- display raw: ${localizedFetched.rawFile}`)
  console.log(`- normalized dir: ${normalized.outputDir}`)
  console.log(`- portraits dir: ${portraits.outputDir}`)
  console.log(`- specialization graphics dir: ${specializationGraphics.outputDir}`)
  console.log(`- illustrations dir: ${illustrations.outputDir}`)
  console.log(`- version file: ${normalized.versionFile}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`构建公共数据失败：${error.message}`)
    process.exitCode = 1
  })
}

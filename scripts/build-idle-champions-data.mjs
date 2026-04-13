import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { fetchDefinitionsSnapshot } from './fetch-idle-champions-definitions.mjs'
import { normalizeDefinitionsSnapshot } from './normalize-idle-champions-definitions.mjs'

async function main() {
  const { values } = parseArgs({
    options: {
      outDir: { type: 'string' },
      outputDir: { type: 'string' },
      versionFile: { type: 'string' },
      currentVersion: { type: 'string' },
      manualOverrides: { type: 'string' },
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
  同时抓取官方原文 definitions 与 language_id=7 中文 definitions，再归一化写入 public/data。`)
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

  console.log(`数据流水线完成：`)
  console.log(`- source raw: ${fetched.rawFile}`)
  console.log(`- display raw: ${localizedFetched.rawFile}`)
  console.log(`- normalized dir: ${normalized.outputDir}`)
  console.log(`- version file: ${normalized.versionFile}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`构建公共数据失败：${error.message}`)
    process.exitCode = 1
  })
}

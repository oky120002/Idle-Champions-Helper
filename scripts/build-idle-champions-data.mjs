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
      help: { type: 'boolean' },
    },
  })

  if (values.help) {
    console.log(`用法：
  node scripts/build-idle-champions-data.mjs [--outDir <raw-dir>] [--outputDir <data-dir>]

说明：
  先抓官方 definitions 原始快照，再归一化写入 public/data。`)
    return
  }

  const fetched = await fetchDefinitionsSnapshot(values)
  const normalized = await normalizeDefinitionsSnapshot({
    input: fetched.rawFile,
    outputDir: values.outputDir,
    versionFile: values.versionFile,
    currentVersion: values.currentVersion,
    manualOverrides: values.manualOverrides,
  })

  console.log(`数据流水线完成：`)
  console.log(`- raw: ${fetched.rawFile}`)
  console.log(`- normalized dir: ${normalized.outputDir}`)
  console.log(`- version file: ${normalized.versionFile}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`构建公共数据失败：${error.message}`)
    process.exitCode = 1
  })
}

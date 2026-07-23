import { readdir } from 'node:fs/promises'
import path from 'node:path'

import { readJson } from './data/io-utils.ts'
import { championDetailsSchema } from './data/champion-details-schema.mjs'
import {
  adventuresCollectionSchema,
  championsCollectionSchema,
  patronsCollectionSchema,
  variantsCollectionSchema,
} from './data/collection-schemas.mjs'

const DEFAULT_DATA_DIR = 'public/data/v1'

const collectionChecks = [
  { name: 'champions.json', schema: championsCollectionSchema },
  { name: 'adventures.json', schema: adventuresCollectionSchema },
  { name: 'variants.json', schema: variantsCollectionSchema },
  { name: 'patrons.json', schema: patronsCollectionSchema },
]

function formatIssues(result) {
  return result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
}

/**
 * CI 校验：所有 normalize 输出契约必须通过对应 zod schema。
 * - champion-details/*.json → championDetailsSchema（planner/simulator 核心字段）
 * - champions/adventures/variants/patrons.json → collection schema（与 src/domain/types 对齐）
 * 防止 normalize 层或上游 definitions 字段漂移破坏消费方依赖的核心字段。
 * 失败时非零退出，列出每个目标的字段错误。
 */
async function main() {
  const dataDir = process.argv[2] ?? DEFAULT_DATA_DIR
  const failures = []
  let checked = 0

  const detailsDir = path.join(dataDir, 'champion-details')
  let detailFiles = []
  try {
    detailFiles = (await readdir(detailsDir)).filter((file) => file.endsWith('.json'))
  } catch (error) {
    failures.push({ target: 'champion-details/', error: `目录读取失败: ${error.message}` })
  }

  for (const file of detailFiles) {
    checked += 1
    const filePath = path.join(detailsDir, file)
    let data
    try {
      data = await readJson(filePath)
    } catch (error) {
      failures.push({ target: `champion-details/${file}`, error: `JSON 解析失败: ${error.message}` })
      continue
    }

    const result = championDetailsSchema.safeParse(data)
    if (!result.success) {
      failures.push({ target: `champion-details/${file}`, error: formatIssues(result) })
    }
  }

  for (const { name, schema } of collectionChecks) {
    checked += 1
    const filePath = path.join(dataDir, name)
    let data
    try {
      data = await readJson(filePath)
    } catch (error) {
      failures.push({ target: name, error: `JSON 解析失败: ${error.message}` })
      continue
    }

    const result = schema.safeParse(data)
    if (!result.success) {
      failures.push({ target: name, error: formatIssues(result) })
    }
  }

  console.log(`data schema 校验：${checked} 目标，${failures.length} 失败`)

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`✖ ${failure.target}: ${failure.error}`)
    }
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(`data schema 校验失败：${error.message}`)
  process.exitCode = 1
})

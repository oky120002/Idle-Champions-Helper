import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { championDetailsSchema } from './data/champion-details-schema.mjs'

const DEFAULT_DETAILS_DIR = 'public/data/v1/champion-details'

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

/**
 * CI 校验：所有 champion-details/*.json 必须通过 championDetailsSchema（阶段 9.3）。
 * 防止 normalize 层或上游 definitions 字段漂移破坏 planner/simulator 依赖的核心字段。
 * 失败时非零退出，列出每文件的字段错误。
 */
async function main() {
  const detailsDir = process.argv[2] ?? DEFAULT_DETAILS_DIR
  const files = (await readdir(detailsDir)).filter((file) => file.endsWith('.json'))

  const failures = []
  let checked = 0

  for (const file of files) {
    checked += 1
    const filePath = path.join(detailsDir, file)
    let data
    try {
      data = await readJson(filePath)
    } catch (error) {
      failures.push({ file, error: `JSON 解析失败: ${error.message}` })
      continue
    }

    const result = championDetailsSchema.safeParse(data)
    if (!result.success) {
      failures.push({
        file,
        error: result.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; '),
      })
    }
  }

  console.log(`champion-details schema 校验：${checked} 文件，${failures.length} 失败`)

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`✖ ${failure.file}: ${failure.error}`)
    }
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(`champion-details schema 校验失败：${error.message}`)
  process.exitCode = 1
})

// Hermetic 边界守护：planner + simulator + abilities 域永不向外层依赖、永不主动获取数据。
// 详见 docs/specs/modules/planner/architecture.md「Hermetic 边界」。
// 计算器是 hermetic 模块——所有数据经适配层（usePlannerCollections）→ PlannerCollections 喂入。
// 本测试防回归：谁在域里加 `import { loadCollection }` 或读文件，CI 即 fail。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const PLANNER_DIR = path.dirname(fileURLToPath(import.meta.url))
const DOMAIN_ROOT = path.resolve(PLANNER_DIR, '..') // src/domain
const SCANNED_DIRS = [
  PLANNER_DIR, // src/domain/planner
  path.resolve(DOMAIN_ROOT, 'simulator'),
  path.resolve(DOMAIN_ROOT, 'abilities'),
  path.resolve(DOMAIN_ROOT, 'buffs'),
]

// 非测试代码不得直接获取数据。token 取调用形避免误伤注释里的单词。
const FORBIDDEN_DATA_ACCESS = ['readFileSync', 'fetch(', 'indexedDB', 'loadCollection', 'loadVersion']

function listDomainTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...listDomainTsFiles(full))
    } else if (full.endsWith('.ts') && !full.endsWith('.test.ts')) {
      out.push(full)
    }
  }
  return out
}

const files = SCANNED_DIRS.flatMap(listDomainTsFiles)

describe('planner/simulator/abilities/buffs 域 Hermetic 边界', () => {
  it('相对 import 必须解析到 src/domain 内（不依赖 src/data|app|components|pages）', () => {
    const violations: string[] = []
    const importRe = /\bfrom\s+['"](\.[^'"]+)['"]/g
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      let m: RegExpExecArray | null
      while ((m = importRe.exec(src)) !== null) {
        const importPath = m[1]
        if (importPath === undefined) continue
        const resolved = path.resolve(path.dirname(file), importPath)
        // 相对 src/domain 的路径若以 '..' 起始 = 逃出域 → 破坏 hermetic。
        if (path.relative(DOMAIN_ROOT, resolved).startsWith('..')) {
          violations.push(`${path.relative(process.cwd(), file)} → ${importPath}`)
        }
      }
    }
    expect(
      violations,
      `域文件 import 了 src/domain 外的模块（破坏 hermetic）：\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('非测试代码不直接获取数据（readFileSync/fetch/indexedDB/loadCollection/loadVersion）', () => {
    const violations: string[] = []
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      for (const token of FORBIDDEN_DATA_ACCESS) {
        if (src.includes(token)) {
          violations.push(`${path.relative(process.cwd(), file)} 含 ${token}`)
        }
      }
    }
    expect(
      violations,
      `域文件出现直接数据获取（破坏 hermetic）：\n${violations.join('\n')}`,
    ).toEqual([])
  })

  // simulator 是纯公式层；effect_string 解析（effects/）与 qualifier 解析（abilities/signalSemantics）
  // 是 provider 职责（属 buffs/）。公式文件不得 import 它们——防 simulator→{effects,abilities} 跨层耦合回归。
  it('simulator 纯公式层不得 import effects/ 或 abilities/signalSemantics（provider 职责，属 buffs/）', () => {
    const simulatorFiles = listDomainTsFiles(path.resolve(DOMAIN_ROOT, 'simulator'))
    const forbiddenImport = /\bfrom\s+['"]\.\.\/(?:effects\/|abilities\/signalSemantics)/
    const violations: string[] = []
    for (const file of simulatorFiles) {
      const src = readFileSync(file, 'utf8')
      if (forbiddenImport.test(src)) {
        violations.push(path.relative(process.cwd(), file))
      }
    }
    expect(
      violations,
      `simulator 公式文件 import 了 effects/ 或 abilities/signalSemantics（应迁 buffs/）：\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

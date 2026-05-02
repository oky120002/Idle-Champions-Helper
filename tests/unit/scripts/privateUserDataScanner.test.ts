import { describe, expect, it } from 'vitest'
import {
  type SensitiveFinding,
  scanContent,
} from '../../../scripts/private-user-data/sensitive-output-scanner.mjs'

describe('sensitive output scanner', () => {
  it('检测假的数字 user id 和 32 位 hash', () => {
    const fixture = [
      'user_id: 12345678',
      'hash: abc123def456789abc123def456789ab',
    ].join('\n')

    const result = scanContent(fixture, 'test-fixture.json')

    expect(result.findings.length).toBeGreaterThanOrEqual(2)
    expect(result.hasFindings).toBe(true)

    const findingTypes = result.findings.map((f: SensitiveFinding) => f.kind)
    expect(findingTypes).toContain('numeric-user-id')
    expect(findingTypes).toContain('hex-hash')
  })

  it('只含占位符的文档不被当成 secret', () => {
    const doc = [
      '# API 文档',
      '使用 `user_id` 字段来标识用户。',
      '`hash` 参数用于验证请求。',
      '将 `IC_PRIVATE_USER_ID` 设置为你的用户 ID。',
    ].join('\n')

    const result = scanContent(doc, 'docs/api.md')

    expect(result.hasFindings).toBe(false)
  })

  it('检测已提交源码中的 tmp/private-user-data 路径引用', () => {
    const source = [
      'import { loadSnapshot } from "./loader"',
      '',
      'const snapshotPath = "tmp/private-user-data/2026-05-02/profile.json"',
      'const data = loadSnapshot(snapshotPath)',
    ].join('\n')

    const result = scanContent(source, 'src/data/loader.ts')

    expect(result.hasFindings).toBe(true)
    const pathFindings = result.findings.filter(
      (f: SensitiveFinding) => f.kind === 'private-path-reference',
    )
    expect(pathFindings.length).toBeGreaterThanOrEqual(1)
  })

  it('对纯净文件返回空结果', () => {
    const clean = [
      'export function add(a: number, b: number): number {',
      '  return a + b',
      '}',
    ].join('\n')

    const result = scanContent(clean, 'src/utils/add.ts')

    expect(result.hasFindings).toBe(false)
    expect(result.findings).toEqual([])
  })

  it('检测结果包含文件名、行号和描述', () => {
    const fixture = 'user_id: 12345678\n'

    const result = scanContent(fixture, 'config.json')

    expect(result.findings.length).toBeGreaterThanOrEqual(1)
    const finding = result.findings[0] as SensitiveFinding
    expect(finding.filePath).toBe('config.json')
    expect(finding.line).toBe(1)
    expect(finding.kind).toBeTruthy()
    expect(finding.description).toBeTruthy()
  })

  it('区分环境变量引用和实际 secret 值', () => {
    const source = [
      'const userId = process.env.IC_PRIVATE_USER_ID',
      'const hash = process.env.IC_PRIVATE_HASH',
    ].join('\n')

    const result = scanContent(source, 'src/env.ts')

    expect(result.hasFindings).toBe(false)
  })
})

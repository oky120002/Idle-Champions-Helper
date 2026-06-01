import { describe, expect, it } from 'vitest'
import {
  scanBuildContent,
  scanBuildFiles,
} from '../../../scripts/private-user-data/production-boundary-scanner.mjs'

describe('production boundary scanner', () => {
  it('检测 dev-only endpoint 泄露到生产产物', () => {
    const result = scanBuildContent(
      'const endpoint = "/__dev/private-user-data/user-profile-payloads"',
      'dist/assets/app.js',
    )

    expect(result.hasFindings).toBe(true)
    expect(result.findings.some((finding) => finding.kind === 'dev-endpoint-reference')).toBe(true)
  })

  it('检测 dev-only refresh endpoint 泄露到生产产物', () => {
    const result = scanBuildContent(
      'const endpoint = "/__dev/private-user-data/refresh"',
      'dist/assets/app.js',
    )

    expect(result.hasFindings).toBe(true)
    expect(result.findings.some((finding) => finding.kind === 'dev-endpoint-reference')).toBe(true)
  })

  it('检测 dev-only source 和 UI 文案泄露到生产产物', () => {
    const result = scanBuildContent(
      'const source = "local-dev-snapshot"; const copy = "当前开发数据源";',
      'dist/assets/user-data.js',
    )

    expect(result.hasFindings).toBe(true)
    expect(result.findings.some((finding) => finding.match.includes('local-dev-snapshot'))).toBe(true)
    expect(result.findings.some((finding) => finding.match.includes('当前开发数据源'))).toBe(true)
  })

  it('对干净的生产产物返回空结果', () => {
    const result = scanBuildContent(
      'const title = "个人数据"; const source = "browser-sync";',
      'dist/assets/safe.js',
    )

    expect(result.hasFindings).toBe(false)
    expect(result.findings).toEqual([])
  })

  it('支持批量扫描文件', () => {
    const results = scanBuildFiles([
      { filePath: 'dist/assets/a.js', content: 'const copy = "本地开发快照"' },
      { filePath: 'dist/assets/b.js', content: 'const copy = "安全内容"' },
    ])

    expect(results).toHaveLength(2)
    expect(results[0]?.hasFindings).toBe(true)
    expect(results[1]?.hasFindings).toBe(false)
  })
})

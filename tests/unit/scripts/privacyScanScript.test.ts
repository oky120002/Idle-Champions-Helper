import { describe, expect, it } from 'vitest'
import { scanContent } from '../../../scripts/private-user-data/sensitive-output-scanner.mjs'

describe('privacy scan script', () => {
  it('对 fixture secrets 抱怨', () => {
    const result = scanContent('user_id: 12345678\nhash: abc123def456789abc123def456789ab', 'test-fixture.json')

    expect(result.hasFindings).toBe(true)
  })

  it('对普通 placeholders 通过', () => {
    const result = scanContent('Use `user_id` and `hash` placeholders for testing.', 'docs/api.md')

    expect(result.hasFindings).toBe(false)
  })

  it('检测 tmp/private-user-data 路径引用', () => {
    const result = scanContent('const path = "tmp/private-user-data/snap"', 'src/loader.ts')

    expect(result.hasFindings).toBe(true)
  })
})

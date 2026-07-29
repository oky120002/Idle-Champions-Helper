import { describe, expect, it } from 'vitest'
import { findHardcodedColors } from './check-colors'

describe('check-colors', () => {
  it('src/styles 业务 CSS 无硬编码颜色（tokens.css 基色定义除外）', () => {
    const violations = findHardcodedColors('src/styles', 'src/styles/foundations/tokens.css')
    expect(violations).toEqual([])
  })
})

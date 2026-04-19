import { describe, expect, it } from 'vitest'
import { formatTimestamp } from '../../../src/pages/champion-detail/detail-value-formatters'

describe('formatTimestamp', () => {
  it('只按 UTC 日历日格式化时间戳', () => {
    const value = Date.UTC(2025, 0, 1, 18, 30) / 1000
    const expected = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(2025, 0, 1, 18, 30)))

    expect(formatTimestamp(value, 'en-US')).toBe(expected)
  })
})

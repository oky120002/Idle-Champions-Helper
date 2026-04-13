import { describe, expect, it } from 'vitest'
import { findSeatConflicts } from '../../../src/rules/seat'

describe('findSeatConflicts', () => {
  it('返回排序后的重复 seat 列表', () => {
    expect(findSeatConflicts([4, 2, 4, 1, 2, 9])).toEqual([2, 4])
  })

  it('没有冲突时返回空数组', () => {
    expect(findSeatConflicts([1, 2, 3, 4])).toEqual([])
  })
})

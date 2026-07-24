import { describe, expect, it } from 'vitest'

import { parseRestrictions } from './restrictions-parser'

const r = (original: string, display = ''): { original: string; display: string } => ({ original, display })

describe('parseRestrictions — slot-occupying 模板匹配', () => {
  it('EN: "Four slots ... occupied" → lockedSlotCount 4', () => {
    const result = parseRestrictions([r('Four slots in your formation are occupied by chickens.')])
    expect(result.lockedSlotCount).toBe(4)
    expect(result.warnings).toHaveLength(0)
  })

  it('EN: "Two random slots ... cursed" → lockedSlotCount 2', () => {
    const result = parseRestrictions([r('Two random slots in your formation are cursed The curses change slots every 15 seconds.')])
    expect(result.lockedSlotCount).toBe(2)
  })

  it('EN: "Three friendly imps take up slots" → 回退取首个数词 = 3', () => {
    // "take up slots"（复数 occupy，无数字邻接 slots）→ 回退取首个数词（实体数=格数）。
    const result = parseRestrictions([r('Three friendly imps take up slots in your formation.')])
    expect(result.lockedSlotCount).toBe(3)
  })

  it('EN: "take up two slots" → lockedSlotCount 2', () => {
    const result = parseRestrictions([r('The Farmer\'s Daughter and Son take up two slots in the formation.')])
    expect(result.lockedSlotCount).toBe(2)
  })

  it('ZH: "四格会被小鸡占据" → lockedSlotCount 4', () => {
    const result = parseRestrictions([r('Four slots occupied.', '你的阵型中有四格会被小鸡占据')])
    expect(result.lockedSlotCount).toBe(4)
  })

  it('数字形式 "4 slots ... occupied" 也匹配', () => {
    const result = parseRestrictions([r('4 slots in your formation are occupied by chickens.')])
    expect(result.lockedSlotCount).toBe(4)
  })

  it('多条 slot-occupying restriction 取最大值（不累加，保守取最严约束）', () => {
    // 同一 variant 多条 restriction 通常只一条 slot-occupying；若多条取 max（最严）
    const result = parseRestrictions([
      r('Four slots occupied.'),
      r('Two slots cursed.'),
    ])
    expect(result.lockedSlotCount).toBe(4)
  })
})

describe('parseRestrictions — 非模板匹配进 warning', () => {
  it('完成前置条件不产生 lockedSlotCount', () => {
    const result = parseRestrictions([r('Must have completed "The Cursed Farmer"')])
    expect(result.lockedSlotCount).toBe(0)
  })

  it('flavor 文本（疯牛/暗影等）不匹配 → warning 提示手工评估', () => {
    const result = parseRestrictions([r('Mad cows spawn randomly during the adventure Every few seconds they spit at a random hero.')])
    expect(result.lockedSlotCount).toBe(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('变量版 slot-occupying（friendly animals 递增）不匹配 → warning 待手工补', () => {
    const result = parseRestrictions([r('Friendly animals take up slots in your formation. You start out with one slot taken up by a friendly animal, then every 10 areas another friendly animal appears.')])
    expect(result.warnings.length).toBeGreaterThan(0)
    // 变量版不产生确定 lockedSlotCount（保守 0，待 semantic-overrides 手工补）
    expect(result.lockedSlotCount).toBe(0)
  })

  it('手工补 override：具名列表 "Nat, Squiddly, and Jenks take up slots" → 3', () => {
    const result = parseRestrictions([r('Nat, Squiddly, and Jenks take up slots in your formation.')])
    expect(result.lockedSlotCount).toBe(3)
  })

  it('手工补 override："Two of the slots ... cursed" → 2', () => {
    const result = parseRestrictions([r('Two of the slots in your formation are cursed due to an unseen force!')])
    expect(result.lockedSlotCount).toBe(2)
  })

  // 回归（第九轮审计）：variant 430 "A Monodrone and a Duodrone take up slots ... CHA of 14"
  // 回退路径曾抓取后文无关数字 14（魅力要求），把占格数误判为 14（> 阵型总槽位 → 该 variant 永不可推荐）。
  it('回退不抓取 "take up slots" 后文的无关数字（variant 430 CHA of 14）→ 走 override = 2', () => {
    const result = parseRestrictions([r('A Monodrone and a Duodrone take up slots in the formation. They\'re interesting, but they don\'t do much else. Only Champions with CHA of 14 or lower can be used.')])
    expect(result.lockedSlotCount).toBe(2)
  })
})

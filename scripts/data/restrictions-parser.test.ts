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

// 第十轮审计：模板漏匹配的非英雄占格 variant（EN/ZH 双侧均漏）手工补 override。
// 这些 variant 的占格数在文本中可定（龙 3 格 / 宾客 2 / 粉丝 2 / 猫 3 / NPC 2 / 向导 1），
// 但措辞超出模板（动词变位 takes/taking up、number 与 slots 间插 formation、
// "take up space" 无 slots、ZH 数字在实体/量词上不在格上）→ 进 override。
describe('parseRestrictions — 漏匹配 variant 手工补 override（第十轮审计）', () => {
  it('v1124 Young Bronze Dragon 占三格 → 3', () => {
    const result = parseRestrictions([r('A Young Bronze Dragon takes up three formation slots at the back of the formation.')])
    expect(result.lockedSlotCount).toBe(3)
  })

  it('v1629 Bronze Dragon 占两格 → 2', () => {
    const result = parseRestrictions([r('A Bronze Dragon joins the formation. It takes up two spots in the formation, but doesn\'t do much else.')])
    expect(result.lockedSlotCount).toBe(2)
  })

  it('v1261 Bronze Dragon escort 占三格 → 3（区分 v1629 两格）', () => {
    const result = parseRestrictions([r('A Bronze Dragon joins the formation as an escort. It takes up three spots in the formation, but doesn\'t do much else.')])
    expect(result.lockedSlotCount).toBe(3)
  })

  it('v414 两名婚礼宾客占格 → 2', () => {
    const result = parseRestrictions([r('Barovian wedding "guests" have filled the castle. Two of them take up space in the formation.')])
    expect(result.lockedSlotCount).toBe(2)
  })

  it('v444 两名粉丝占格 → 2', () => {
    const result = parseRestrictions([r('Two costumed fans join the formation! Unfortunately they\'re not Champions, so they just take up space.')])
    expect(result.lockedSlotCount).toBe(2)
  })

  it('v1589 三只黑猫占格 → 3', () => {
    const result = parseRestrictions([r('Three black cats join the formation. They adorably just take up space.')])
    expect(result.lockedSlotCount).toBe(3)
  })

  it('v682 Rudolph + Ireena 两名 NPC 占格 → 2', () => {
    const result = parseRestrictions([r('Rudolph van Richten and his ally Ireena Kolyana accompany the Champions taking up slots in the formation.')])
    expect(result.lockedSlotCount).toBe(2)
  })

  it('v96 无知向导占中央一格 → 1', () => {
    const result = parseRestrictions([r('An ill-informed guide takes up the formation\'s central slot.')])
    expect(result.lockedSlotCount).toBe(1)
  })
})

// 第十轮审计：ZH 变量递增占格（"每经过 N 区域额外一格"）原被 "一格" 直配 regex 误判为固定 1。
// EN 侧有 VARIABLE_PATTERNS 排除，ZH 侧缺失——补齐对称的变量排除。
describe('parseRestrictions — ZH 变量递增占格排除（第十轮审计）', () => {
  it('ZH "每经过 50 区域额外一格" 不产生固定格数 → 0 + warning', () => {
    // v70：起始 1 格，每 50 区域 +1，最多 6 格——计数随区域递增，非固定值。
    const result = parseRestrictions([r('Starting in area 11, and every 50 areas one more slot is taken up by a wagon.', '从区域 11 开始，每经过 50 个区域，就会有额外一格被大篷车占据。')])
    expect(result.lockedSlotCount).toBe(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('ZH "每经过 50 区域一格" 不产生固定格数 → 0 + warning', () => {
    // v116：每 50 区域 +1 格（猎人），计数随区域递增。
    const result = parseRestrictions([r('Every 50 areas a slot is taken up by a hunter.', '每经过 50 个区域，阵型中的一格会被一位猎人占据。')])
    expect(result.lockedSlotCount).toBe(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('ZH "每 15 秒换格"（固定 N 格轮换位置）不算变量 → 仍取 N', () => {
    // v6：两个随机格子被诅咒，每 15 秒换位置——计数固定 2，只是位置轮换。
    const result = parseRestrictions([r('Two random slots are cursed.', '你阵型中的两个随机格子被诅咒，诅咒每 15 秒改变位置。')])
    expect(result.lockedSlotCount).toBe(2)
  })

  it('ZH 固定 N 格 + 位置轮换（每经过 N 区域改变位置）不被误判为变量 → 仍取 N', () => {
    // 回归（第十轮审计）：v241「占用两格，每经过 25 区域后改变位置」——2 只夸塞魔固定占 2 格，
    // 仅位置随区域轮换。初版「每经过」无差别排除致固定计数被清零（occupied 2→0 回归）。
    const result = parseRestrictions([r('Two Quasits join your formation taking up two slots. Every 25 areas, they move to different slots.', '两只夸塞魔加入你的阵型，占用你阵型中的两格，每经过 25 个区域后会改变位置。')])
    expect(result.lockedSlotCount).toBe(2)
  })

  // 回归（第十一轮审计）：v296「守望者...无法被移动或移除」是 forcedHeroes 英雄锁定，
  // 不是 NPC 换位置。孤立「移动」曾把变量递增（每 50 区域 +1 格）误判为位置轮换，
  // 跳过排除、误产 occ=1。修复后 ZH_POSITION_ROTATION_RE 只收明确位置变化短语。
  it('ZH 英雄锁定「无法被移动」不误判位置轮换 → 变量递增正确排除（v296）', () => {
    const result = parseRestrictions([r(
      'Warden starts in the formation. He can\'t be moved or removed. Every 50 areas a creeping Eldritch Horror takes over a slot in the formation.',
      '守望者初始位于阵型中。他无法被移动或移除。每经过 50 个区域，一个诡异的奥法恐怖会占据阵型中的一格。',
    )])
    expect(result.lockedSlotCount).toBe(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})

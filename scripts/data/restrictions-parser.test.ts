import { describe, expect, it } from 'vitest'

import { parseDamageSourcePattern, parseRestrictions } from './restrictions-parser'

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

  // 回归：variant 430 "A Monodrone and a Duodrone take up slots ... CHA of 14"
  // 回退路径曾抓取后文无关数字 14（魅力要求），把占格数误判为 14（> 阵型总槽位 → 该 variant 永不可推荐）。
  it('回退不抓取 "take up slots" 后文的无关数字（variant 430 CHA of 14）→ 走 override = 2', () => {
    const result = parseRestrictions([r('A Monodrone and a Duodrone take up slots in the formation. They\'re interesting, but they don\'t do much else. Only Champions with CHA of 14 or lower can be used.')])
    expect(result.lockedSlotCount).toBe(2)
  })
})

// 模板漏匹配的非英雄占格 variant（EN/ZH 双侧均漏）手工补 override。
// 这些 variant 的占格数在文本中可定（龙 3 格 / 宾客 2 / 粉丝 2 / 猫 3 / NPC 2 / 向导 1），
// 但措辞超出模板（动词变位 takes/taking up、number 与 slots 间插 formation、
// "take up space" 无 slots、ZH 数字在实体/量词上不在格上）→ 进 override。
describe('parseRestrictions — 漏匹配 variant 手工补 override', () => {
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

// 复合 restriction（占格 + 额外机制）原 if-elseif 链在 count>0 时跳过残余检测，
// 致额外机制（debuff/buff/swap 等）warning 丢失。修复后残余机制独立于 count 检测。
describe('parseRestrictions — 复合 restriction 残余机制 warning', () => {
  it('占格 + debuff/buff 机制 → count 提取 + 残余 warning', () => {
    const result = parseRestrictions([r('Two useless minions take up slots in your formation. They massively debuff adjacent Champions except for Binwin, whom they massively buff.')])
    expect(result.lockedSlotCount).toBe(2)
    expect(result.warnings.length).toBe(1)
    expect(result.warnings[0]).toContain('特殊机制')
  })

  it('占格 + 属性门槛（无残余）→ 无 warning', () => {
    const result = parseRestrictions([r('A Monodrone and a Duodrone take up slots in the formation. Only Champions with CHA of 14 or lower can be used.')])
    expect(result.lockedSlotCount).toBe(2)
    expect(result.warnings).toEqual([])
  })
})

// ZH 变量递增占格（"每经过 N 区域额外一格"）原被 "一格" 直配 regex 误判为固定 1。
// EN 侧有 VARIABLE_PATTERNS 排除，ZH 侧缺失——补齐对称的变量排除。
describe('parseRestrictions — ZH 变量递增占格排除', () => {
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
    // 回归：v241「占用两格，每经过 25 区域后改变位置」——2 只夸塞魔固定占 2 格，
    // 仅位置随区域轮换。初版「每经过」无差别排除致固定计数被清零（occupied 2→0 回归）。
    const result = parseRestrictions([r('Two Quasits join your formation taking up two slots. Every 25 areas, they move to different slots.', '两只夸塞魔加入你的阵型，占用你阵型中的两格，每经过 25 个区域后会改变位置。')])
    expect(result.lockedSlotCount).toBe(2)
  })

  // 回归：v296「守望者...无法被移动或移除」是 forcedHeroes 英雄锁定，
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

  // 回归：v384「Dragonbait 占一格，每经过 10 区域气味变化」——「每经过」不涉及占格，
  // 不应误判为变量递增。原 ZH_AREA_INCREMENT_RE 的裸「每经过」匹配项不区分上下文，
  // 致固定 1 格被清零。修复后「每经过」须同句含占格语言才触发。
  it('ZH「每经过 N 区域」非占格语境不误判变量递增（v384 Dragonbait 固定 1 格）', () => {
    const result = parseRestrictions([r(
      'Dragonbait takes up a slot in the formation.',
      '龙饵占据阵型中的一格，缅怀他失去的朋友阿图斯。每经过 10 个区域，龙饵的气味会发生改变',
    )])
    expect(result.lockedSlotCount).toBe(1)
  })
})

describe('parseRestrictions — 属性门槛提取', () => {
  it('CON score of 13 or higher → { stat: con, operator: >=, value: 13 }', () => {
    const result = parseRestrictions([r('Only Champions with a CON score of 13 or higher may be used.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'con', operator: '>=', value: 13 },
    ])
  })

  it('DEX score of 14 or lower → { stat: dex, operator: <=, value: 14 }', () => {
    const result = parseRestrictions([r('Only Champions with a DEX score of 14 or lower can be used.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'dex', operator: '<=', value: 14 },
    ])
  })

  it('CHA score of 12 or higher (variant 171)', () => {
    const result = parseRestrictions([r('Only Champions with an INT score of 12 or higher can partake in this adventure.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'int', operator: '>=', value: 12 },
    ])
  })

  it('v430 复合 restriction：CHA of 14 or lower + slot-occupy → 同时提取两者', () => {
    const result = parseRestrictions([r('A Monodrone and a Duodrone take up slots in the formation. Only Champions with CHA of 14 or lower can be used.')])
    expect(result.lockedSlotCount).toBe(2)
    expect(result.attributeRequirements).toEqual([
      { stat: 'cha', operator: '<=', value: 14 },
    ])
  })

  it('无属性门槛的 restriction → attributeRequirements 为空', () => {
    const result = parseRestrictions([r('Four slots occupied by chickens.')])
    expect(result.attributeRequirements).toEqual([])
  })

  it('同一 restriction 不重复提取相同门槛', () => {
    const result = parseRestrictions([
      r('Only Champions with a STR score of 13 or higher may be used.'),
      r('Only Champions with a STR score of 13 or higher may be used.'),
    ])
    expect(result.attributeRequirements).toEqual([
      { stat: 'str', operator: '>=', value: 13 },
    ])
  })

  it('v187 多属性门槛：STR 13+ AND DEX 14+ AND CON 15+ → 全部提取', () => {
    const result = parseRestrictions([r('Only Champions with STR of 13 or higher, a DEX of 14 or higher, AND a CON of 15 or higher can be used.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'str', operator: '>=', value: 13 },
      { stat: 'dex', operator: '>=', value: 14 },
      { stat: 'con', operator: '>=', value: 15 },
    ])
  })

  // 复合共享值门槛："STAT and STAT of N+"——多 STAT 共享单一 of N direction。
  // 修复前正则要求 STAT of N 紧邻，复合型首个 STAT 无 of N 后缀 → 只捕获最后一个 STAT。
  it('复合共享值：STR and CON of 14+ → 两者都提取（atd_5010068521）', () => {
    const result = parseRestrictions([r('You may only use Champions with a STR and CON of 14+.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'str', operator: '>=', value: 14 },
      { stat: 'con', operator: '>=', value: 14 },
    ])
  })

  it('复合共享值：DEX and STR of 13 or higher → 两者都提取', () => {
    const result = parseRestrictions([r('Only Champions with DEX and STR of 13 or higher can be used.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'dex', operator: '>=', value: 13 },
      { stat: 'str', operator: '>=', value: 13 },
    ])
  })

  it('复合共享值全词：Strength and Charisma of 14 or higher → 两者都提取', () => {
    const result = parseRestrictions([r('You may only use Champions with a Strength and Charisma of 14 or higher.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'str', operator: '>=', value: 14 },
      { stat: 'cha', operator: '>=', value: 14 },
    ])
  })

  it('复合共享值 + 独立值混合：INT and WIS of 12+, CHA of 15+ → 三者都提取', () => {
    const result = parseRestrictions([r('Only Champions with INT and WIS of 12 or higher and CHA of 15 or higher can be used.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'int', operator: '>=', value: 12 },
      { stat: 'wis', operator: '>=', value: 12 },
      { stat: 'cha', operator: '>=', value: 15 },
    ])
  })

  it('v319 伤害修饰句的属性不提取（INT 14+ 是 damage modifier，不含使用门槛标记）', () => {
    const result = parseRestrictions([r('Only Champions with STR of 14 or lower can be used. Rosie and Champions with INT of 14 or higher deal 400% additional damage.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'str', operator: '<=', value: 14 },
    ])
  })

  it('v865 伤害免疫句的属性不提取（INT 15+ 是条件免疫「take no damage」非使用门槛）', () => {
    const result = parseRestrictions([r('When a Mind Flayer spawns it Mind Blasts a random Champion, dealing 25% of their max health and stunning them for 60 seconds. Champions with an INT score of 15 or higher take no damage and are not stunned.')])
    expect(result.attributeRequirements).toEqual([])
  })

  it('v1984 邻接位限制句的属性不提取（INT 12- 是 adjacency 约束「placed adjacent」非全局使用门槛）', () => {
    const result = parseRestrictions([r('The two Treasure Hunters from the third variant join the formation again. They refuse to travel with anyone smarter than them, so only Champions with an INT score of 12 or lower are allowed to be placed adjacent to them.')])
    expect(result.attributeRequirements).toEqual([])
  })

  it('属性门槛 restriction 不产生"未解析"警告', () => {
    const result = parseRestrictions([r('Only Champions with a CON score of 13 or higher may be used.')])
    expect(result.attributeRequirements).toHaveLength(1)
    expect(result.warnings).toEqual([])
  })

  it('重复属性门槛不产生"未解析"警告（addedAttr 抑制修复）', () => {
    const result = parseRestrictions([
      r('Only Champions with a STR score of 13 or higher may be used.'),
      r('Only Champions with a STR score of 13 or higher may be used.'),
    ])
    expect(result.attributeRequirements).toEqual([
      { stat: 'str', operator: '>=', value: 13 },
    ])
    expect(result.warnings).toEqual([])
  })

  it('v319 属性门槛+伤害修饰 → 属性提取成功但仍 warning（残余特殊机制）', () => {
    const result = parseRestrictions([r('Only Champions with STR of 14 or lower can be used. Rosie and Champions with INT of 14 or higher deal 400% additional damage.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'str', operator: '<=', value: 14 },
    ])
    expect(result.warnings.length).toBe(1)
  })

  it('v391 属性门槛+Boss机制 → 属性提取成功但仍 warning', () => {
    const result = parseRestrictions([r('In each boss area Strahd on Horseback appears. You must defeat this additional boss to advance. When defeated, he runs off the screen. Only champions with INT of 13 or higher can be used.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'int', operator: '>=', value: 13 },
    ])
    expect(result.warnings.length).toBe(1)
  })

  it('属性门槛+forced hero flavor → 仍 warning（flavor 句未被解析）', () => {
    const result = parseRestrictions([r('Only Bards or Champions with a CHA score of 15 or higher can be used. Paultin starts the adventure unlocked and in the formation.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'cha', operator: '>=', value: 15 },
    ])
    expect(result.warnings.length).toBe(1)
  })

  it('属性门槛+占格 → 两者提取且无 warning（占格已覆盖占格句）', () => {
    const result = parseRestrictions([r('A Monodrone and a Duodrone take up slots in the formation. Only Champions with CHA of 14 or lower can be used.')])
    expect(result.lockedSlotCount).toBe(2)
    expect(result.attributeRequirements).toEqual([
      { stat: 'cha', operator: '<=', value: 14 },
    ])
    expect(result.warnings).toEqual([])
  })

  it('全词属性名：Constitution of 14 or higher → { stat: con, >=, 14 }', () => {
    const result = parseRestrictions([r('Only Champions with a Constitution of 14 or higher may be used.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'con', operator: '>=', value: 14 },
    ])
  })

  it('全词属性名：Strength of 12 or higher → { stat: str, >=, 12 }', () => {
    const result = parseRestrictions([r('Only Champions with Strength of 12 or higher may be used.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'str', operator: '>=', value: 12 },
    ])
  })

  it('全词属性名：Charisma of 18 or higher → { stat: cha, >=, 18 }', () => {
    const result = parseRestrictions([r('Only Champions with Charisma of 18 or higher may be used.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'cha', operator: '>=', value: 18 },
    ])
  })

  it('"+ 记法：CON of 15+ → { stat: con, >=, 15 }', () => {
    const result = parseRestrictions([r('Only Champions with CON of 15+ may be used.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'con', operator: '>=', value: 15 },
    ])
  })

  it('全词属性名 + "+" 记法：Intelligence of 13+ → { stat: int, >=, 13 }', () => {
    const result = parseRestrictions([r('Only Champions with Intelligence of 13+ may be used.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'int', operator: '>=', value: 13 },
    ])
  })

  it('"or more" 写法：wisdom score of 13 or more → { stat: wis, >=, 13 }', () => {
    const result = parseRestrictions([r('Only Champions with a wisdom score of 13 or more may be used.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'wis', operator: '>=', value: 13 },
    ])
  })

  it('"or less" 写法：INT of 11 or less → { stat: int, <=, 11 }', () => {
    const result = parseRestrictions([r('Only Champions with INT of 11 or less may be used.')])
    expect(result.attributeRequirements).toEqual([
      { stat: 'int', operator: '<=', value: 11 },
    ])
  })
})

describe('parseRestrictions — 可行性上下文', () => {
  it('护甲段数：200 armored HP → armor.segments=200', () => {
    const result = parseRestrictions([r('After area 10, a giant Intellect Devourer appears. It has 200 armored hit points.')])
    expect(result.viabilityContext.armor).toEqual({ segments: 200 })
  })

  it('护甲段数：4 armored health（非 hit points）→ armor.segments=4', () => {
    const result = parseRestrictions([r('Enemies have 4 armored health.')])
    expect(result.viabilityContext.armor).toEqual({ segments: 4 })
  })

  it('命中型段数：20 hits-based HP → hitsBased.segments=20', () => {
    const result = parseRestrictions([r('Each wave spawns 1-3 shadar-kai warriors with 20 hits-based HP.')])
    expect(result.viabilityContext.hitsBased).toEqual({ segments: 20 })
  })

  it('段数递增：4 hits-based +4 every 25 areas → scaling', () => {
    const result = parseRestrictions([r('Additional Frost Giants start with 4 hits-based hit points. Every 25 areas they gain 4 additional hits-based hit points.')])
    expect(result.viabilityContext.hitsBased).toEqual({
      segments: 4,
      scaling: { additional: 4, everyAreas: 25 },
    })
  })

  it('伤害削减 99%：damageModifier=0.01', () => {
    const result = parseRestrictions([r('Champion damage is reduced by 99% in rain areas.')])
    expect(result.viabilityContext.damageModifier).toBeCloseTo(0.01, 10)
  })

  it('敌人伤害倍率：deal 3x damage → enemyDamageMult=3', () => {
    const result = parseRestrictions([r('Beasts deal 3x damage and have 2 additional armored hit points.')])
    expect(result.viabilityContext.enemyDamageMult).toBe(3)
    expect(result.viabilityContext.armor).toEqual({ segments: 2 })
  })

  it('普通变体：无护甲/命中型/伤害修正/持续掉血', () => {
    const result = parseRestrictions([r('Only Champions with a CON score of 13 or higher can be used.')])
    expect(result.viabilityContext.armor).toBeNull()
    expect(result.viabilityContext.hitsBased).toBeNull()
    expect(result.viabilityContext.damageModifier).toBeNull()
    expect(result.viabilityContext.enemyDamageMult).toBeNull()
    expect(result.viabilityContext.healthDrainRate).toBeNull()
  })

  it('持续掉血：2.5% of max health every second → healthDrainRate=0.025', () => {
    const result = parseRestrictions([r('All the Champions are poisoned. Every second, Champions take damage equal to 2.5% of their max health.')])
    expect(result.viabilityContext.healthDrainRate).toBeCloseTo(0.025, 10)
  })

  it('持续掉血：4% unavoidable damage every second → healthDrainRate=0.04', () => {
    const result = parseRestrictions([r('Your Champions take 4% unavoidable damage every second.')])
    expect(result.viabilityContext.healthDrainRate).toBeCloseTo(0.04, 10)
  })

  it('持续掉血排除 random 目标（单目标爆发非全队 DoT，S2 不含随机）', () => {
    const result = parseRestrictions([r('Every second, a random Champion takes damage equal to 10% of their max health.')])
    // S2 excludes random, but S4 burst captures it (every 1s = continuous, handled by S2 path → null)
    expect(result.viabilityContext.healthDrainRate).toBeNull()
  })

  it('S4 burst：40% damage every 8 seconds → healthDrainRate=0.05', () => {
    const result = parseRestrictions([r('Bits of crumbling temple fall on your Champions every 8 seconds, dealing 40% damage to a random Champion.')])
    expect(result.viabilityContext.healthDrainRate).toBeCloseTo(0.05, 5)
  })

  it('S4 burst：90% of max health every 5 seconds → healthDrainRate=0.18', () => {
    const result = parseRestrictions([r('In outdoor areas, lightning strikes your formation every 5 seconds, dealing 90% of max health to a random Champion.')])
    expect(result.viabilityContext.healthDrainRate).toBeCloseTo(0.18, 5)
  })

  it('S4 burst：10% of max health every 3 seconds → healthDrainRate≈0.033', () => {
    const result = parseRestrictions([r('Every 3 seconds, each Champion takes 10% of their max health as damage.')])
    expect(result.viabilityContext.healthDrainRate).toBeCloseTo(10 / 100 / 3, 5)
  })
})

describe('parseDamageSourcePattern — 伤害来源位置限制', () => {
  // 模拟 champion 名表（name → id）
  const names = new Map<string, string>([
    ['ezmerelda', '70'],
    ['lae\'zel', '128'],
    ['presto', '144'],
    ['volo', '159'],
    ['vlithryn', '162'],
    ['thellora', '139'],
    ['umberto', '151'],
    ['virgil', '115'],
    ['dob', '105'],
    ['kalix', '158'],
    ['raistlin', '173'],
    ['k\'thriss', '38'],
    ['rudolph van richten', '177'],
    ['flint', '178'],
  ])

  it('same-column："Only Champions in Ezmerelda\'s column can deal damage"', () => {
    const result = parseDamageSourcePattern([r('Only Champions in Ezmerelda\'s column can deal damage.')], names)
    expect(result).toEqual({ kind: 'same-column', referenceHeroId: '70' })
  })

  it('same-column：Lae\'zel 名含撇号', () => {
    const result = parseDamageSourcePattern([r('Only Champions in Lae\'zel\'s column can deal damage.')], names)
    expect(result).toEqual({ kind: 'same-column', referenceHeroId: '128' })
  })

  it('adjacent："Only Champions next to Virgil can deal damage"', () => {
    const result = parseDamageSourcePattern([r('Only Champions next to Virgil can deal damage.')], names)
    expect(result).toEqual({ kind: 'adjacent', referenceHeroId: '115' })
  })

  it('adjacent + 代词："Only Imoen and Champions next to her can deal damage"', () => {
    const namesWithImoen = new Map(names).set('imoen', '117')
    const result = parseDamageSourcePattern([r('Only Imoen and Champions next to her can deal damage.')], namesWithImoen)
    expect(result).toEqual({ kind: 'adjacent', referenceHeroId: '117' })
  })

  it('not-adjacent："Champions next to Dob deal no damage"', () => {
    const result = parseDamageSourcePattern([r('Champions next to Dob deal no damage.')], names)
    expect(result).toEqual({ kind: 'not-adjacent', referenceHeroId: '105' })
  })

  it('not-adjacent + 代词："Only Kalix and Champions not adjacent to him can deal damage"', () => {
    const result = parseDamageSourcePattern([r('Only Kalix and Champions not adjacent to him can deal damage.')], names)
    expect(result).toEqual({ kind: 'not-adjacent', referenceHeroId: '158' })
  })

  it('front-columns："two columns in front of Presto"', () => {
    const result = parseDamageSourcePattern([r('Only Champions in the two columns in front of Presto can deal damage.')], names)
    expect(result).toEqual({ kind: 'front-columns', referenceHeroId: '144', columnSpan: 2 })
  })

  it('front-columns + 代词 + "and the Champions"', () => {
    const result = parseDamageSourcePattern([r('Only Volo and the Champions in the two columns in front of him can deal damage.')], names)
    expect(result).toEqual({ kind: 'front-columns', referenceHeroId: '159', columnSpan: 2 })
  })

  it('front-columns 无数词 = 全部前方列（span=100）', () => {
    const result = parseDamageSourcePattern([r('Only Vlithryn and Champions in the columns in front of her can deal damage.')], names)
    expect(result).toEqual({ kind: 'front-columns', referenceHeroId: '162', columnSpan: 100 })
  })

  it('behind-columns："column behind her"', () => {
    const result = parseDamageSourcePattern([r('Only Thellora and Champions in the column behind her can deal damage.')], names)
    expect(result).toEqual({ kind: 'behind-columns', referenceHeroId: '139', columnSpan: 1 })
  })

  it('NPC 引用（Mirt 不在名表）→ null', () => {
    const result = parseDamageSourcePattern([r('Only Champions in Mirt\'s column can deal damage.')], names)
    expect(result).toBeNull()
  })

  it('NPC 引用（skunk 不在名表）→ null', () => {
    const result = parseDamageSourcePattern([r('Champions adjacent to a skunk deal no damage, but their formation abilities are active.')], names)
    expect(result).toBeNull()
  })

  it('非位置型 damage 约束 → null', () => {
    const result = parseDamageSourcePattern([r('Every 15 seconds a random Champion gets distracted and has their DPS disabled for 30 seconds.')], names)
    expect(result).toBeNull()
  })

  it('无 deal damage 句 → null', () => {
    const result = parseDamageSourcePattern([r('Must have completed "The Trickster\'s Delight".')], names)
    expect(result).toBeNull()
  })

  it('多句 restriction 只取 damage-dealing 句', () => {
    const result = parseDamageSourcePattern([r('Presto joins the formation. He can\'t be moved or removed. Only Champions in the two columns in front of Presto can deal damage. Getting to know Presto.')], names)
    expect(result).toEqual({ kind: 'front-columns', referenceHeroId: '144', columnSpan: 2 })
  })

  it('后缀匹配："Van Richten" → "rudolph van richten"', () => {
    const result = parseDamageSourcePattern([r('Only Van Richten and the Champions in the column in front of him can deal damage.')], names)
    expect(result).toEqual({ kind: 'front-columns', referenceHeroId: '177', columnSpan: 100 })
  })
})

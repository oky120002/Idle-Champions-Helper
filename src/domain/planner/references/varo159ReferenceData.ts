// 瓦罗（hero_id=159）伤害快照参照基准。
// 完整游戏实测调研见 docs/research/gameplay/champion-mechanics/159-varo.md（researchDoc 字段关联）。
// 数据来源：用户 2026-07-28 游戏内观察（被诅咒的农夫 - 自由游玩 第1层，赞助者跋折罗-萨法尔）。
// 三份快照：level 1 / level 558（单人）+ cursed-farmer（明斯克+瓦罗阵型，瓦罗位，origin 见 damageReferenceVerification）。
//
// 角色定位：support（支援）。「战斗指南」给前面两列勇士 +2.03e15%，是阵型内交叉位置 buff 的典型——
// 阵型拓扑校验的核心用例（明斯克在瓦罗前列 → 吃到战斗指南）。
import type { ChampionReference } from './championReferenceTypes'

export const varo159ReferenceData = {
  heroId: '159',
  name: { zh: '瓦罗', en: 'Varo' },
  source: 'game-observation',
  researchDoc: 'docs/research/gameplay/champion-mechanics/159-varo.md',
  rawDescription: {
    naturalLanguage:
      '瓦罗（人类法师，混乱善良）是 support（支援）。基础攻击「恶意嘲笑指南」写措辞严厉字条给最近敌人魔法创伤；'
      + '杀招「错误写作指南」使增益型盟友造成额外基础杀招伤害（持续 15 秒，buff 型杀招无直接伤害值）。'
      + '核心提供效果「战斗指南」使他前面两列所有勇士伤害 +2.03e15%；「任务指南/怪物指南/魔法百科指南」分别按完成指南数、'
      + '遭遇怪物种类、魔法基本攻击勇士数对战斗指南做乘算堆叠增量（详见 research doc 推导）。'
      + '即将生效的外部加成（在后方领导/普通种族/出类拔萃/以身作则/天神的引导）来自恩赐祝福与赞助者，随等级稳定。',
    optimizedAt: '2026-07-28',
  },
  snapshots: [
    {
      id: 'varo-l1',
      capturedAt: '2026-07-28',
      context: {
        level: 1,
        map: '被诅咒的农夫 - 自由游玩 第1层',
        patron: '跋折罗-萨法尔',
        formationSize: 1,
        formationHeroIds: ['159'],
      },
      attacks: {
        base: {
          nameZh: '瓦罗的恶意嘲笑指南',
          damage: '1.96e44',
          cooldownSeconds: 6.25,
          description: '瓦罗写了一个用词严厉的字条,给最近的敌人造成了深深的魔法创伤',
        },
      },
      incomingBuffs: [
        { nameZh: '在后方领导', fromZh: '托姆的恩赐祝福', source: 'blessing', effect: '使瓦罗的基本攻击冷却时间缩短0.5秒' },
        { nameZh: '普通种族', fromZh: '托姆的恩赐祝福', source: 'blessing', effect: '使瓦罗的伤害提升1,500%' },
        { nameZh: '出类拔萃', fromZh: '斯特拉德·冯·扎罗维奇', source: 'blessing', effect: '使瓦罗的伤害提升150%' },
        { nameZh: '以身作则', fromZh: '扎瑞尔', source: 'blessing', effect: '使瓦罗的伤害提升150%', note: '怀疑也是赐福' },
        { nameZh: '天神的引导', fromZh: '扎瑞尔', source: 'blessing', effect: '使瓦罗的生命值提升100%', note: '怀疑也是赐福' },
      ],
      providedBuffs: [
        { nameZh: '瓦罗的剑湾指南', fromZh: '瓦罗', source: 'self', effect: '瓦罗可用于任何剑湾之旅战役冒险或支线任务（可用性，非伤害 buff）' },
      ],
    },
    {
      id: 'varo-l558',
      capturedAt: '2026-07-28',
      context: {
        level: 558,
        map: '被诅咒的农夫 - 自由游玩 第1层',
        patron: '跋折罗-萨法尔',
        formationSize: 1,
        formationHeroIds: ['159'],
      },
      attacks: {
        base: {
          nameZh: '瓦罗的恶意嘲笑指南',
          damage: '9.12e58',
          cooldownSeconds: 6.25,
          description: '瓦罗写了一个用词严厉的字条,给最近的敌人造成了深深的魔法创伤',
        },
        ultimate: {
          nameZh: '瓦罗的错误写作指南',
          cooldownSeconds: 224.1,
          description: '瓦罗使他的增益型盟友造成额外的基础杀招伤害,持续15秒（buff 型杀招，无直接伤害值）',
        },
      },
      incomingBuffs: [
        { nameZh: '在后方领导', fromZh: '托姆的恩赐祝福', source: 'blessing', effect: '使瓦罗的基本攻击冷却时间缩短0.5秒' },
        { nameZh: '普通种族', fromZh: '托姆的恩赐祝福', source: 'blessing', effect: '使瓦罗的伤害提升1,500%' },
        { nameZh: '出类拔萃', fromZh: '斯特拉德·冯·扎罗维奇', source: 'blessing', effect: '使瓦罗的伤害提升150%' },
        { nameZh: '以身作则', fromZh: '扎瑞尔', source: 'blessing', effect: '使瓦罗的伤害提升150%', note: '怀疑也是赐福' },
        { nameZh: '天神的引导', fromZh: '扎瑞尔', source: 'blessing', effect: '使瓦罗的生命值提升100%', note: '怀疑也是赐福' },
      ],
      providedBuffs: [
        { nameZh: '瓦罗的战斗指南', fromZh: '瓦罗', source: 'self', effect: '瓦罗会使他前面两列所有勇士的伤害提高2.03e15%' },
        { nameZh: '瓦罗的任务指南', fromZh: '瓦罗', source: 'self', effect: '每完成一次指南/收集任务,战斗指南效果 +10% 乘算堆叠（当前 193 层，总奖金 2.98e10%）', note: '堆叠层数 193 疑为全局统计，mock 时全阵型需统一' },
        { nameZh: '瓦罗的怪物指南', fromZh: '瓦罗', source: 'self', effect: '每遇到一种敌人,战斗指南效果 +310.1% 乘算堆叠（当前 1 种野兽，总奖金 310.1%）' },
        { nameZh: '瓦罗的魔法百科指南', fromZh: '瓦罗', source: 'self', effect: '阵型中每有一位魔法基本攻击的勇士,战斗指南效果 +386% 乘算堆叠（当前 1，总奖金 386%）' },
        { nameZh: '瓦罗的快速撤退指南', fromZh: '瓦罗', source: 'self', effect: '前列勇士被击败时撤退到上一区域；回到近乎失败的区域时战斗指南 +1,400%（条件性，激活区域无）' },
      ],
      // hero-static（同等级段稳定）：基础属性 + 装备。
      abilityScores: { str: 9, dex: 13, con: 10, int: 17, wis: 11, cha: 19 },
      equipment: [
        { nameZh: '瓦罗华丽的女帽', itemLevel: 14, effect: '所有勇士提升242.0%伤害' },
        { nameZh: '瓦罗的典型羽毛笔', itemLevel: 15, effect: '使瓦罗的战斗指南技能效果提升290.4%' },
        { nameZh: '瓦罗的英勇事迹', itemLevel: 10, effect: '使瓦罗的任务指南技能效果提升155.4%' },
        { nameZh: '瓦罗的众多手册', itemLevel: 15, effect: '使瓦罗的怪物指南技能效果提升158.4%' },
        { nameZh: '瓦罗的鬼魂与幽灵指南', itemLevel: 11, effect: '使瓦罗的专精的基本效果提升286%' },
        { nameZh: '瓦罗的神奇墨水', itemLevel: 501, effect: '使瓦罗的杀招攻击冷却时间缩短31.08秒' },
      ],
    },
    {
      id: 'varo-cursed-farmer',
      capturedAt: '2026-07-28',
      context: {
        map: '被诅咒的农夫 - 自由游玩 第1层',
        patron: '跋折罗-萨法尔',
        formationSize: 2,
        formationHeroIds: ['7', '159'],
        formationId: 'cursed-farmer-1',
        positions: [{ heroId: '159', columnFromRight: 4, row: '最下', note: '从右往左数第4列最下' }],
        note: '用户忘记记录瓦罗等级；明斯克(7)位置见 minsc7ReferenceData 同 formationId 快照',
      },
      attacks: {
        base: {
          nameZh: '瓦罗的恶意嘲笑指南',
          damage: '4.98e61',
          cooldownSeconds: 6.25,
          description: '瓦罗写了一个用词严厉的字条,给最近的敌人造成了深深的魔法创伤',
        },
        ultimate: {
          nameZh: '瓦罗的错误写作指南',
          cooldownSeconds: 224.1,
          description: '瓦罗使他的增益型盟友造成额外的基础杀招伤害,持续15秒（buff 型杀招，无直接伤害值）',
        },
      },
      incomingBuffs: [
        { nameZh: '在后方领导', fromZh: '托姆的恩赐祝福', source: 'blessing', effect: '使瓦罗的基本攻击冷却时间缩短0.5秒' },
        { nameZh: '普通种族', fromZh: '托姆的恩赐祝福', source: 'blessing', effect: '使瓦罗的伤害提升1,500%' },
        { nameZh: '出类拔萃', fromZh: '斯特拉德·冯·扎罗维奇', source: 'blessing', effect: '使瓦罗的伤害提升150%' },
        { nameZh: '以身作则', fromZh: '扎瑞尔', source: 'blessing', effect: '使瓦罗的伤害提升150%', note: '怀疑也是赐福' },
        { nameZh: '天神的引导', fromZh: '扎瑞尔', source: 'blessing', effect: '使瓦罗的生命值提升100%', note: '怀疑也是赐福' },
      ],
      providedBuffs: [
        { nameZh: '瓦罗的战斗指南', fromZh: '瓦罗', source: 'self', effect: '瓦罗会使他前面两列所有勇士的伤害提高2.03e15%' },
        { nameZh: '瓦罗的任务指南', fromZh: '瓦罗', source: 'self', effect: '每完成一次指南/收集任务,战斗指南效果 +10% 乘算堆叠（当前 193 层）', note: '堆叠层数 193 疑为全局统计，mock 时全阵型需统一' },
        { nameZh: '瓦罗的怪物指南', fromZh: '瓦罗', source: 'self', effect: '每遇到一种敌人,战斗指南效果 +310.1% 乘算堆叠（当前 1 种野兽）' },
        { nameZh: '瓦罗的魔法百科指南', fromZh: '瓦罗', source: 'self', effect: '阵型中每有一位魔法基本攻击的勇士,战斗指南效果 +386% 乘算堆叠（当前 1）' },
      ],
    },
  ],
} as const satisfies ChampionReference

export type Varo159ReferenceData = typeof varo159ReferenceData

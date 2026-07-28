// 明斯克（hero_id=7）伤害快照参照基准。
// 完整游戏实测调研见 docs/research/gameplay/champion-mechanics/007-minsc.md（researchDoc 字段关联）。
// 数据来源：用户 2026-07-28 游戏内观察（被诅咒的农夫 - 自由游玩 第1层，赞助者跋折罗-萨法尔）。
// 三份快照：level 1 / level 722（单人）+ cursed-farmer level 726（明斯克+瓦罗阵型，origin 见 damageReferenceVerification）。
//
// 角色定位：carry（输出/支援/速度/猎手）。偏好敌人+直吹自擂是速度队核心（见根 README「根本目标」）。
import type { ChampionReference } from './championReferenceTypes'

export const minsc7ReferenceData = {
  heroId: '7',
  name: { zh: '明斯克', en: 'Minsc' },
  source: 'game-observation',
  researchDoc: 'docs/research/gameplay/champion-mechanics/007-minsc.md',
  rawDescription: {
    naturalLanguage:
      '明斯克（人类巡林客，混乱善良，博德之门的英雄们）是 carry（输出/支援/速度/猎手）。'
      + '基础攻击「顺势斩」顺劈最近敌人附近全部目标；杀招「直取双眼!」与布布同时高额顺劈。'
      + '「偏好敌人:兽类」使队伍对兽类敌人 +2.43e06%；「直吹自擂」非首领波次 33% 几率 +1 敌人、10% 几率 +2，'
      + '且这些敌人始终是其偏好对手——此技能是速度标签的核心，组建速度阵型的核心数据。'
      + '即将生效的外部加成（关注核心/普通种族/以身作则/铁胃 来自恩赐祝福与赞助者）随等级稳定存在；'
      + '阵型中瓦罗的「战斗指南」额外给前面两列勇士 +2.03e15%。',
    optimizedAt: '2026-07-28',
  },
  snapshots: [
    {
      id: 'minsc-l1',
      capturedAt: '2026-07-28',
      context: {
        level: 1,
        map: '被诅咒的农夫 - 自由游玩 第1层',
        patron: '跋折罗-萨法尔',
        formationSize: 1,
        formationHeroIds: ['7'],
      },
      attacks: {
        base: {
          nameZh: '顺势斩',
          damage: '1.25e45',
          cooldownSeconds: 3.75,
          description: '明斯克顺劈距离最近的敌人附近的所有目标',
        },
      },
      incomingBuffs: [
        { nameZh: '关注核心', fromZh: '克兰沃的恩赐祝福', source: 'blessing', effect: '使明斯克的伤害提升400%', damageBonusPercent: 400 },
        { nameZh: '普通种族', fromZh: '托姆的恩赐祝福', source: 'blessing', effect: '使明斯克的伤害提升1,500%', damageBonusPercent: 1500 },
        { nameZh: '以身作则', fromZh: '扎瑞尔', source: 'blessing', effect: '使明斯克的伤害提升150%', damageBonusPercent: 150, note: '怀疑也是赐福' },
        { nameZh: '铁胃', fromZh: '跋折罗·萨法尔', source: 'patron', effect: '使明斯克的伤害提升150%', damageBonusPercent: 150, note: '怀疑也是赐福' },
        { nameZh: '领导冲锋', fromZh: '托姆的恩赐祝福', source: 'blessing', effect: '使明斯克的基本攻击冷却时间缩短0.5秒' },
      ],
      // 1 级无提供效果（技能未解锁）。
      // hero-static 装备/属性见 level 722 快照。
    },
    {
      id: 'minsc-l722',
      capturedAt: '2026-07-28',
      context: {
        level: 722,
        map: '被诅咒的农夫 - 自由游玩 第1层',
        patron: '跋折罗-萨法尔',
        formationSize: 1,
        formationHeroIds: ['7'],
      },
      attacks: {
        base: {
          nameZh: '顺势斩',
          damage: '5.02e62',
          cooldownSeconds: 3.75,
          description: '明斯克顺劈距离最近的敌人附近的所有目标',
        },
        ultimate: {
          nameZh: '直取双眼!',
          damage: '5.89e66',
          cooldownSeconds: 45,
          description: '明斯克和布布同时攻击,造成高额顺劈伤害',
        },
      },
      incomingBuffs: [
        { nameZh: '关注核心', fromZh: '克兰沃的恩赐祝福', source: 'blessing', effect: '使明斯克的伤害提升400%', damageBonusPercent: 400 },
        { nameZh: '普通种族', fromZh: '托姆的恩赐祝福', source: 'blessing', effect: '使明斯克的伤害提升1,500%', damageBonusPercent: 1500 },
        { nameZh: '以身作则', fromZh: '扎瑞尔', source: 'blessing', effect: '使明斯克的伤害提升150%', damageBonusPercent: 150, note: '怀疑也是赐福' },
        { nameZh: '铁胃', fromZh: '跋折罗·萨法尔', source: 'patron', effect: '使明斯克的伤害提升150%', damageBonusPercent: 150, note: '怀疑也是赐福' },
        { nameZh: '领导冲锋', fromZh: '托姆的恩赐祝福', source: 'blessing', effect: '使明斯克的基本攻击冷却时间缩短0.5秒' },
      ],
      providedBuffs: [
        { nameZh: '偏好敌人:兽类', fromZh: '明斯克', source: 'self', effect: '兽类敌人成为偏好对手,队伍对其造成的伤害提高2.43e06%' },
        {
          nameZh: '直吹自擂',
          fromZh: '明斯克',
          source: 'self',
          effect: '每当非首领敌人波次刷新时,有33%几率额外刷新一名敌人,有10%几率额外刷新2名敌人。这些敌人始终是明斯克的偏好对手',
          note: '速度标签核心技能,组建速度阵型的核心数据',
        },
      ],
      // hero-static（同等级段稳定）：基础属性 + 装备，供核查与未来装备校准。
      abilityScores: { str: 18, dex: 13, con: 20, int: 10, wis: 10, cha: 10 },
      equipment: [
        { nameZh: '狂暴打击之杰出巨剑', itemLevel: 735, effect: '使明斯克的伤害提升1,378%' },
        { nameZh: '仓鼠栖息之软垫皮革背', itemLevel: 710, effect: '使明斯克的伤害提升1,343%' },
        { nameZh: '舒适之软垫铁护腕', itemLevel: 689, effect: '使明斯克的过度杀戮技能效果提升1,032%' },
        { nameZh: "巡林客的丝绸斗篷", itemLevel: 814, effect: '使明斯克的"偏好敌人"类技能的效果提高1,754%' },
        { nameZh: '舒适的毁灭腰带', itemLevel: 864, effect: '使明斯克的杀招攻击伤害提升1,224%' },
        { nameZh: '狂怒之训靴子', itemLevel: 501, effect: '使明斯克的杀招攻击冷却时间缩短135秒' },
      ],
    },
    {
      id: 'minsc-cursed-farmer-l726',
      capturedAt: '2026-07-28',
      context: {
        level: 726,
        map: '被诅咒的农夫 - 自由游玩 第1层',
        patron: '跋折罗-萨法尔',
        formationSize: 2,
        formationHeroIds: ['7', '159'],
        formationId: 'cursed-farmer-1',
        positions: [{ heroId: '7', columnFromRight: 2, row: '最上', note: '从右往左数第2列最上' }],
        note: '明斯克+瓦罗阵型；瓦罗(159)位置见 varo159ReferenceData 同 formationId 快照',
      },
      attacks: {
        base: {
          nameZh: '顺势斩',
          damage: '8.69e78',
          cooldownSeconds: 3.75,
          description: '明斯克顺劈距离最近的敌人附近的所有目标',
        },
        ultimate: {
          nameZh: '直取双眼!',
          damage: '1.39e85',
          cooldownSeconds: 45,
          description: '明斯克和布布同时攻击,造成高额顺劈伤害',
        },
      },
      incomingBuffs: [
        { nameZh: '关注核心', fromZh: '克兰沃的恩赐祝福', source: 'blessing', effect: '使明斯克的伤害提升400%', damageBonusPercent: 400 },
        { nameZh: '领导冲锋', fromZh: '托姆的恩赐祝福', source: 'blessing', effect: '使明斯克的基本攻击冷却时间缩短0.5秒' },
        { nameZh: '铁胃', fromZh: '跋折罗·萨法尔', source: 'patron', effect: '使明斯克的伤害提升150%', damageBonusPercent: 150, note: '怀疑也是赐福' },
        { nameZh: '以身作则', fromZh: '扎瑞尔', source: 'blessing', effect: '使明斯克的伤害提升150%', damageBonusPercent: 150, note: '怀疑也是赐福' },
        { nameZh: '普通种族', fromZh: '托姆的恩赐祝福', source: 'blessing', effect: '使明斯克的伤害提升1,500%', damageBonusPercent: 1500 },
        // 交叉位置 buff：瓦罗的战斗指南（瓦罗在其前面两列 → 明斯克在其作用范围）。
        { nameZh: '瓦罗的战斗指南', fromZh: '瓦罗', source: 'hero', effect: '使明斯克的伤害提升2.03e15%' },
      ],
      providedBuffs: [
        { nameZh: '偏好敌人:兽类', fromZh: '明斯克', source: 'self', effect: '兽类敌人成为偏好对手,队伍对其造成的伤害提高2.43e06%' },
        {
          nameZh: '直吹自擂',
          fromZh: '明斯克',
          source: 'self',
          effect: '每当非首领敌人波次刷新时,有33%几率额外刷新一名敌人,有10%几率额外刷新2名敌人。这些敌人始终是明斯克的偏好对手',
          note: '速度标签核心技能,组建速度阵型的核心数据',
        },
      ],
    },
  ],
} as const satisfies ChampionReference

export type Minsc7ReferenceData = typeof minsc7ReferenceData

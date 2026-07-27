// 蔚（hero_id=95）DPS 机制参照基准。
// 完整游戏实测调研见 docs/research/gameplay/champion-mechanics/vi-95.md（researchDoc 字段关联）。
// 数据来源：用户 2026-07-27 游戏内观察（area=193，7 名善良/中立英雄，出言不逊堆叠 1930）。
import type { ChampionReference } from './championReferenceTypes'

export const vi95ReferenceData = {
  heroId: '95',
  name: { zh: '蔚', en: 'Vi' },
  capturedAt: '2026-07-27',
  source: 'game-observation',
  researchDoc: 'docs/research/gameplay/champion-mechanics/vi-95.md',
  rawDescription: {
    naturalLanguage:
      '蔚的「善良榜样」：阵型中每有一名善良/艾奎兹玄/C小队勇士，善良与中立勇士伤害 +300%，乘算堆叠（当前 7 层）。'
      + '「出言不逊永不够」：每层「出言不逊」使善良榜样 +0.33%（乘算），层数上限=最高区域×10（当前 1930）。'
      + '专长「道德规范」对善良榜样 +20%；装备「时髦披肩」对善良榜样效果 +157.8%（基础 150% + 物品等级 5.2% + 每级 0.4%）。',
    optimizedAt: '2026-07-27',
  },
  scenario: {
    area: 193,
    highestAvailableArea: 193,
    formationSize: 7,
    // mock：用户仅提供「7 名善良/中立」计数，未给完整 heroId。测试用 createHero 构造 mock 英雄。
    formationHeroIds: ['95', 'mock-good-1', 'mock-good-2', 'mock-good-3', 'mock-good-4', 'mock-good-5', 'mock-good-6'],
    note: '蔚(95) 作 carry + 6 名善良阵营 support',
  },
  abilities: [
    {
      nameZh: '善良榜样',
      upgradeId: 12312,
      rawEffect: 'hero_dps_multiplier_mult,300',
      mechanicIds: ['formation-count-mult-stack', 'bonus-scale-linkage'],
      mechanics: {
        perStackPercent: 300,
        amountFunc: 'mult',
        stackFunc: 'per_hero',
        formationCountQualifier: 'good|acqinc|cteam',
      },
      gameDisplay: {
        当前堆叠层数: 7,
        叠层加成: '1.64e06%',
        叠层系数: '2.92e09%',
        去道德规范叠层系数: '2.43e09%',
        总奖金: '4.78e13%',
      },
    },
    {
      nameZh: '出言不逊永不够',
      upgradeId: 12312,
      rawEffect: 'buff_upgrade,0.33,12312',
      mechanicIds: ['dynamic-stack-multiply', 'bonus-scale-linkage'],
      mechanics: {
        perStackPercent: 0.33,
        stacksMultiply: true,
        stackSource: 'vi_im_too_old_for_this_v2',
        stackMaxExpr: 'highest_available_area * 10',
      },
      gameDisplay: {
        出言不逊堆叠: 1930,
        叠层加成: '57,639%',
        叠层系数: '1,600%',
        总奖金: '9.22e05%',
      },
    },
  ],
  modifiers: [
    {
      type: 'specialization',
      nameZh: '道德规范',
      targetAbility: '善良榜样',
      bonus: '+20%',
    },
    {
      type: 'equipment',
      nameZh: '时髦披肩',
      targetAbility: '善良榜样',
      bonus: '+157.8%',
      breakdown: { base: 150, itemLevel: 5.2, perLevel: 0.4 },
    },
  ],
  expected: {
    manualStackCount: 1930,
    multiplierChecks: [
      {
        mechanicId: 'formation-count-mult-stack',
        rawEffect: 'hero_dps_multiplier_mult,300',
        name: '善良榜样 7 层乘算',
        formula: '4^7',
        expectedMultiplier: 16384,
      },
      {
        mechanicId: 'dynamic-stack-multiply',
        rawEffect: 'buff_upgrade,0.33,12312',
        name: '出言不逊 1930 层乘算',
        formula: '1.0033^1930',
        expectedMultiplier: 576,
      },
    ],
    calibrationTarget: {
      gamePoolMultiplier: '2.92e09%',
      tolerance: '< 30%（16384×576×1.2×2.578≈2.92e7 倍）',
    },
  },
  mock: {
    'scenario.formationHeroIds': '用户未提供完整阵型 heroId，测试用 createHero 构造 7 个善良阵营 mock 英雄；用户补实测后替换',
  },
} as const satisfies ChampionReference

export type Vi95ReferenceData = typeof vi95ReferenceData

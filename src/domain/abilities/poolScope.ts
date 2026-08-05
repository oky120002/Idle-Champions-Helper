/**
 * Hero ability pool scope —— 加成归属的独立叶子模块。
 * 从 abilityModel.ts 拆出，使 abilities 内部不再因值导入闭合 abilities↔planner 环（阶段18）。
 * pool 聚合实现见 src/domain/planner/placementFit.ts evaluatePlacementFit；
 * 加成聚合与 DPS 公式见 docs/specs/modules/planner/simulator.md「加成聚合与 DPS 公式」。
 */
import type { HeroAbilityKind } from './abilityModel'

/**
 * 加成归属 pool：global 影响全局池（所有英雄），hero 仅作用于 carry 自身。
 * 加成聚合时同一 pool 内 additive 百分比相加、multiplicative 因子相乘；global 与 hero pool 间相乘。
 */
export type HeroAbilityPoolScope = 'global' | 'hero'

export const POOL_SCOPE_BY_KIND: Record<HeroAbilityKind, HeroAbilityPoolScope> = {
  globalDpsMultiplier: 'global',
  heroDpsMultiplier: 'hero',
  globalGoldMultiplier: 'global',
  globalCritChance: 'global',
  heroCritChance: 'hero',
  globalCritDamage: 'global',
  heroCritDamage: 'hero',
  globalHealthMultiplier: 'global',
  heroHealthMultiplier: 'hero',
  damageReduction: 'global',
  enemyVulnerability: 'global',
  attackSpeedMult: 'hero',
  cooldownReduction: 'global',
}

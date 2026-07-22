import Decimal from 'break_eternity.js'

import type { GameNumberValue } from '../simulator/gameNumber'

/**
 * 金币 objective：全队金币收益（team_gold_find）。
 *
 * team_gold_find = base_gold × gold_pool。
 * - gold_pool 由 placementFit 按 dimension:'gold' 聚合全队 gold signal（global/hero pool）。
 * - base_gold：MVP 取 1（相对比较保序）；绝对值依赖 idle_gold_rate × monster_gold_by_area，
 *   阶段 10 推图预估接入（evolution-plan A3 baseGold 决策）。
 *
 * 金币模式与 C 位模式结构不同：金币是全队聚合 stat（非单一 carry），故 objective 不依赖
 * 单英雄 baseDamage，仅由 gold pool 决定。
 */
const BASE_GOLD = 1

export function computeTeamGoldFind(goldPoolMultiplier: number): GameNumberValue {
  const mult = Number.isFinite(goldPoolMultiplier) && goldPoolMultiplier > 0 ? goldPoolMultiplier : 1
  return new Decimal(BASE_GOLD).times(mult)
}

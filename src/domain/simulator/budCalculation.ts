import Decimal from 'break_eternity.js'

import type { GameNumberValue } from './gameNumber'
import { compareGameNumbers } from './gameNumberArithmetic'

/** profile 缺 baseAttackCooldown 时回退的默认攻击间隔（秒）。 */
const DEFAULT_ATTACK_COOLDOWN = 1

/**
 * 单英雄单次伤害（BUD 贡献）= heroDps × attackCooldown。
 * heroDps 按秒，attackCooldown = 秒/次 → 单次伤害 = 秒伤害 × 秒/次。
 * ponytail：MVP 近似——heroDps 用 carryDps 近似（未含 click/ult 对单次的放大），
 * 绝对值偏差归 bud-verification.md 实测校准；相对比较（谁设 BUD）保序。
 */
export function computeSingleHitDamage(
  heroDps: GameNumberValue,
  attackCooldown: number | null,
): GameNumberValue {
  const cooldown = typeof attackCooldown === 'number' && attackCooldown > 0
    ? attackCooldown
    : DEFAULT_ATTACK_COOLDOWN
  return heroDps.times(cooldown)
}

/**
 * 阵型 BUD（Biggest Unique Damage）= max(各英雄单次伤害)。阶段 7.4。
 * IC 怪物血量按 BUD 缩放：慢攻击（高 cooldown）英雄单次伤害更高，更易设 BUD。
 * 阵型推荐（相对比较）BUD 帮助有限（evolution-plan），MVP 仍用 carryDps 优化；
 * BUD 作为辅助指标与 DPS 并行计算展示（阶段 15）。
 * ult_damage 按 ultimate_damage_params（dps_based:true）从 BUD/DPS 派生，留 stage 14 modron。
 */
export function computeBud(
  entries: Array<{ heroDps: GameNumberValue; attackCooldown: number | null }>,
): GameNumberValue {
  let bud: GameNumberValue = new Decimal(0)
  for (const entry of entries) {
    const singleHit = computeSingleHitDamage(entry.heroDps, entry.attackCooldown)
    if (compareGameNumbers(singleHit, bud) > 0) {
      bud = singleHit
    }
  }
  return bud
}

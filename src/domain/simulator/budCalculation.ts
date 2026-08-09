import type { GameNumberValue } from '../gameNumber'

/** profile 缺 baseAttackCooldown 时回退的默认攻击间隔（秒）。 */
const DEFAULT_ATTACK_COOLDOWN = 1

/**
 * 单英雄对单一目标的单次伤害（BUD 贡献）= heroDps × attackCooldown / numTargets。
 *
 * heroDps 按秒（含 numTargets × damageModifier 的总量），attackCooldown = 秒/次 →
 * 单次总伤害 = heroDps × cooldown。除以 numTargets 得到对单一目标的单次伤害。
 * damageModifier 在推导中约掉（DPS 已含 numTargets × damageModifier 总量），不影响 per-target 值。
 *
 * 多段攻击英雄（如法莉德 numTargets=3）：per-target BUD = carryDps × cooldown / 3，
 * 修正前不除 numTargets 导致 BUD 偏高 3 倍——直接影响护甲门槛判定。
 *
 * ponytail：MVP 近似——heroDps 用 carryDps 近似（未含 click/ult 对单次的放大），
 * 绝对值偏差归 docs/research/data/planner/bud-calibration.md 实测校准；相对比较（谁设 BUD）保序。
 */
export function computeSingleHitDamage(
  heroDps: GameNumberValue,
  attackCooldown: number | null,
  numTargets?: number | null,
): GameNumberValue {
  const cooldown = typeof attackCooldown === 'number' && attackCooldown > 0
    ? attackCooldown
    : DEFAULT_ATTACK_COOLDOWN
  const targets = typeof numTargets === 'number' && numTargets > 0 ? numTargets : 1
  return heroDps.mul(cooldown).div(targets)
}

import type { GameNumberValue } from './gameNumber'

/** profile 缺 baseAttackCooldown 时回退的默认攻击间隔（秒）。 */
const DEFAULT_ATTACK_COOLDOWN = 1

/**
 * 单英雄单次伤害（BUD 贡献）= heroDps × attackCooldown。
 * heroDps 按秒，attackCooldown = 秒/次 → 单次伤害 = 秒伤害 × 秒/次。
 * ponytail：MVP 近似——heroDps 用 carryDps 近似（未含 click/ult 对单次的放大），
 * 绝对值偏差归 bud-verification.md 实测校准；相对比较（谁设 BUD）保序。
 *
 * 阵型级 BUD（max 各英雄单次伤害）未在此计算——steadyStateScoring 直接用 carry 单次伤害
 * 近似阵型 BUD（carry 通常设 BUD）；formation-max 精确化随 evolution-plan 的 BUD 实测校准立项再做。
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

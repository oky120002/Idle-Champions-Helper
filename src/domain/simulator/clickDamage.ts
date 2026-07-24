import type { GameNumberValue } from './gameNumber'

/**
 * Click damage 计算（阶段 14.1）。
 *
 * `click_damage = BUD × click_seconds`（派生自 BUD，MVP 近似）。
 *
 * 数据源缺口：raw `click_damage_settings` 只有 `{base_power:1, base_cost:50, cost_curve:1.7,
 * power_curve:2.031}`（click 按层缩放，与怪物生命同构）；click 与 DPS/BUD 的秒数换算关系
 * （click_seconds）在当前 definitions 快照未找到对应字段，DEFAULT_CLICK_SECONDS=1 是 MVP 占位。
 *
 * 边界（用户明确）：click damage **不参与阵型评分/排序**，仅作辅助参考值展示（阶段 15 UI）。
 * 绝对值依赖 BUD 实测校准（7.5）。
 */

/**
 * 默认 click_seconds（MVP 占位）。
 * ponytail: 精确值待 click 与 DPS/BUD 换算关系确认后校准；当前取 1（click ≈ BUD 量级）。
 */
export const DEFAULT_CLICK_SECONDS = 1

/**
 * 计算 click damage = BUD × clickSeconds。
 * clickSeconds 缺省用 DEFAULT_CLICK_SECONDS。
 */
export function computeClickDamage(
  bud: GameNumberValue,
  clickSeconds: number = DEFAULT_CLICK_SECONDS,
): GameNumberValue {
  const seconds = typeof clickSeconds === 'number' && clickSeconds > 0 ? clickSeconds : DEFAULT_CLICK_SECONDS
  return bud.times(seconds)
}

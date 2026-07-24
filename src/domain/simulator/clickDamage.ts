import type { GameNumberValue } from './gameNumber'

/**
 * Click damage 计算（阶段 14.1）。
 *
 * `click_damage = BUD × click_seconds`（派生自 BUD/DPS）。
 * 来源 effect：`click_damage_seconds_global_dps`（定义 click 与 DPS 的秒数关系）。
 *
 * 边界（用户明确）：click damage **不参与阵型评分/排序**，仅作辅助参考值展示（阶段 15 UI）。
 * 绝对值依赖 BUD 实测校准（7.5）；click_seconds 精确语义待游戏源码确认，MVP 用默认值。
 */

/**
 * 默认 click_seconds（派生自 click_damage_seconds_global_dps）。
 * ponytail: 精确值待 click_damage_seconds_global_dps 语义确认后校准；MVP 取 1（click ≈ BUD 量级）。
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

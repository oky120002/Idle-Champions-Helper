/**
 * Modron 辅助信息（阶段 14.3）。
 *
 * 来源：`game_rule_defines.max_modron_auto_reset_area`（area: 2500）。
 *
 * 边界：modron 信息仅作辅助参考值展示（阶段 15 UI）。
 * `max_modron_auto_reset_area` = modron 自动重置层数上限；建议 reset 设在
 * min(阵型预估最大层数, modron cap)——超过阵型上限会卡层，低于则浪费推图能力。
 */

/** game_rule_defines.max_modron_auto_reset_area.area（数据源 §10.1）。 */
export const MODRON_AUTO_RESET_CAP = 2500

export type ModronCapBoundBy = 'formation' | 'modron-cap'

export interface ModronResetSuggestion {
  /** 建议 modron 重置层数 = min(预估最大层数, cap)。 */
  suggestedResetArea: number
  /** 绑定约束：formation = 阵型推图能力绑定；modron-cap = modron 上限绑定。 */
  capBoundBy: ModronCapBoundBy
  /** modron 自动重置层数上限（数据常量）。 */
  cap: number
}

/**
 * 计算 modron 重置建议。
 * `estimatedMaxArea` 来自 areaEstimation（阶段 10）。
 */
export function computeModronResetSuggestion(estimatedMaxArea: number): ModronResetSuggestion {
  const area = Math.max(1, Math.floor(estimatedMaxArea))
  const suggestedResetArea = Math.min(area, MODRON_AUTO_RESET_CAP)
  const capBoundBy: ModronCapBoundBy = area >= MODRON_AUTO_RESET_CAP ? 'modron-cap' : 'formation'
  return { suggestedResetArea, capBoundBy, cap: MODRON_AUTO_RESET_CAP }
}

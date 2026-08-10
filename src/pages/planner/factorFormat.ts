/** 紧凑格式化因子数值：极大/极小用科学计数，常规保留两位。PlannerBreakdown 和 PlannerSpeedBreakdown 共用。 */
export function formatFactor(value: number): string {
  if (!Number.isFinite(value)) {
    return value > 0 ? '∞' : '0'
  }
  if (value >= 1e4 || (value > 0 && value < 0.01)) {
    return value.toExponential(2)
  }
  return value.toFixed(2)
}

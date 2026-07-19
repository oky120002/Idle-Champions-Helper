import type { GameNumberValue } from '../simulator/gameNumber'

/**
 * 优化目标结果。每种推荐模式（carry-dps / team-gold / ...）产出真实目标量。
 * 不强枚举 ObjectiveKind（Ponytail）；模式由 scoringMode 字符串区分，新增模式不需改枚举。
 */
export interface ObjectiveBreakdownPart {
  label: string
  value: GameNumberValue
}

export interface ObjectiveResult {
  value: GameNumberValue
  breakdown: ObjectiveBreakdownPart[]
}

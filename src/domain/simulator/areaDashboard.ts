import { compareGameNumbers, divideGameNumbers, formatGameNumber, toGameNumber, type GameNumberValue } from '../gameNumber'
import { monsterDpsAt, monsterHealthAt } from './monsterStats'
import type { AreaBound, AreaEstimationResult } from './areaEstimation'

export type AreaWall = 'damage' | 'survival' | 'mechanic' | 'design-limit'
export type AreaGap = 'near' | 'large' | 'none'

export interface AreaDashboardModel {
  wall: AreaWall
  wallBound: AreaBound
  gap: AreaGap
  bud: string
  targetHealth: string
  effectiveHealth: string | null
  targetDamage: string | null
  improvement: 'damage' | 'survival' | 'mechanic' | null
}

function classifyGap(ratio: GameNumberValue): AreaGap {
  if (compareGameNumbers(ratio, toGameNumber(100)) >= 0) return 'large'
  if (compareGameNumbers(ratio, toGameNumber(10)) >= 0) return 'near'
  return 'none'
}

function classifyWall(bound: AreaBound): AreaWall {
  if (bound === 'max-area') return 'design-limit'
  if (bound === 'survival') return 'survival'
  if (bound === 'armor' || bound === 'hits-based') return 'mechanic'
  return 'damage'
}

function improvementForWall(wall: AreaWall): AreaDashboardModel['improvement'] {
  if (wall === 'design-limit') return null
  return wall
}

export function buildAreaDashboardModel(areaEstimate: AreaEstimationResult): AreaDashboardModel {
  const targetHealthValue = monsterHealthAt(areaEstimate.area)
  const targetDamageValue = areaEstimate.effectiveHealth === null ? null : monsterDpsAt(areaEstimate.area)
  const damageGap = classifyGap(divideGameNumbers(targetHealthValue, areaEstimate.bud))
  const wall = classifyWall(areaEstimate.boundBy)

  return {
    wall,
    wallBound: areaEstimate.boundBy,
    gap: wall === 'damage' ? damageGap : 'none',
    bud: formatGameNumber(areaEstimate.bud),
    targetHealth: formatGameNumber(targetHealthValue),
    effectiveHealth: areaEstimate.effectiveHealth === null ? null : formatGameNumber(areaEstimate.effectiveHealth),
    targetDamage: targetDamageValue === null ? null : formatGameNumber(targetDamageValue),
    improvement: improvementForWall(wall),
  }
}

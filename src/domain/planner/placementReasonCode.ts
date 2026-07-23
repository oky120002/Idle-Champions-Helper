import type { HeroAbilitySignal, HeroPositionRelation } from '../abilities/abilityModel'
import { predicateHasNode } from '../abilities/heroPredicate'
import type { PlacementFitScorePart } from './placementFitTypes'

export function resolveActiveReasonCode(signal: HeroAbilitySignal, relation: HeroPositionRelation): PlacementFitScorePart['reasonCode'] {
  if (signal.kind === 'globalDpsMultiplier') {
    return 'global-match'
  }

  switch (relation) {
    case 'self':
      return 'carry-self-match'
    case 'adjacent':
      return 'adjacent-match'
    case 'adjacentOrSelf':
      return 'adjacent-or-self-match'
    case 'nonAdjacent':
      return 'non-adjacent-match'
    case 'withinTwoSlots':
      return 'within-two-slots-match'
    case 'withinTwoSlotsOrSelf':
      return 'within-two-slots-or-self-match'
    case 'withinThreeSlots':
      return 'within-three-slots-match'
    case 'withinThreeSlotsOrSelf':
      return 'within-three-slots-or-self-match'
    case 'sameColumn':
      return 'same-column-match'
    case 'sameOrAheadColumns':
      return 'same-or-ahead-columns-match'
    case 'adjacentColumns':
      return 'adjacent-columns-match'
    case 'aheadColumn':
      return 'ahead-column-match'
    case 'allAheadColumns':
      return 'all-ahead-columns-match'
    case 'behindColumn':
      return 'behind-column-match'
    case 'aheadTwoColumns':
      return 'ahead-two-columns-match'
    case 'behindTwoColumns':
      return 'behind-two-columns-match'
    case 'allBehindColumns':
      return 'all-behind-columns-match'
    case 'sameOrBehindColumn':
      return 'same-or-behind-column-match'
    case 'sameOrBehindColumns':
      return 'same-or-behind-columns-match'
    case 'selfAndBehindTwoColumns':
      return 'self-and-behind-two-columns-match'
    case 'exactlyBehindOneColumn':
      return 'exactly-behind-one-column-match'
    case 'exactlyBehindTwoColumns':
      return 'exactly-behind-two-columns-match'
    case 'exactlyBehindThreeColumns':
      return 'exactly-behind-three-columns-match'
    case 'frontTwoColumns':
      return 'front-two-columns-match'
    case 'backTwoColumns':
      return 'back-two-columns-match'
    case 'rearMostColumn':
      return 'rear-most-column-match'
    case 'secondRearMostColumn':
      return 'second-rear-most-column-match'
    case 'thirdRearMostColumn':
      return 'third-rear-most-column-match'
    case 'any':
      return predicateHasNode(signal.targetQualifier?.predicate, 'stat') ? 'stat-match' : 'tag-match'
    default:
      return predicateHasNode(signal.targetQualifier?.predicate, 'stat') ? 'stat-match' : 'tag-match'
  }
}

export function inferMismatchReason(signal: HeroAbilitySignal): 'tag-mismatch' | 'stat-mismatch' {
  if (predicateHasNode(signal.targetQualifier?.predicate, 'stat')) {
    return 'stat-mismatch'
  }

  return 'tag-mismatch'
}

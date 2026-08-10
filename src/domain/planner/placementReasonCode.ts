import type { HeroAbilitySignal, HeroPositionRelation } from '../abilities/abilityModel'
import { predicateHasNode } from '../abilities/heroPredicate'
import type { PlacementFitScorePart } from './placementFitTypes'

const RELATION_REASON_CODE: Partial<Record<HeroPositionRelation, PlacementFitScorePart['reasonCode']>> = {
  self: 'carry-self-match',
  adjacent: 'adjacent-match',
  adjacentOrSelf: 'adjacent-or-self-match',
  nonAdjacent: 'non-adjacent-match',
  withinTwoSlots: 'within-two-slots-match',
  withinTwoSlotsOrSelf: 'within-two-slots-or-self-match',
  withinThreeSlots: 'within-three-slots-match',
  withinThreeSlotsOrSelf: 'within-three-slots-or-self-match',
  sameColumn: 'same-column-match',
  sameOrAheadColumns: 'same-or-ahead-columns-match',
  adjacentColumns: 'adjacent-columns-match',
  aheadColumn: 'ahead-column-match',
  allAheadColumns: 'all-ahead-columns-match',
  behindColumn: 'behind-column-match',
  aheadTwoColumns: 'ahead-two-columns-match',
  behindTwoColumns: 'behind-two-columns-match',
  allBehindColumns: 'all-behind-columns-match',
  sameOrBehindColumn: 'same-or-behind-column-match',
  sameOrBehindColumns: 'same-or-behind-columns-match',
  selfAndBehindTwoColumns: 'self-and-behind-two-columns-match',
  exactlyBehindOneColumn: 'exactly-behind-one-column-match',
  exactlyBehindTwoColumns: 'exactly-behind-two-columns-match',
  exactlyBehindThreeColumns: 'exactly-behind-three-columns-match',
  frontTwoColumns: 'front-two-columns-match',
  backTwoColumns: 'back-two-columns-match',
  selfAndAheadAndBehindColumns: 'self-and-ahead-and-behind-columns-match',
  rearMostColumn: 'rear-most-column-match',
  secondRearMostColumn: 'second-rear-most-column-match',
  thirdRearMostColumn: 'third-rear-most-column-match',
  tallestColumn: 'tallest-column-match',
  middleColumns: 'middle-columns-match',
  slotsWithMaxTwoAdjacent: 'slots-with-max-two-adjacent-match',
}

function inferTagOrStatMatch(signal: HeroAbilitySignal): 'stat-match' | 'tag-match' {
  return predicateHasNode(signal.targetQualifier?.predicate, 'stat') ? 'stat-match' : 'tag-match'
}

export function resolveActiveReasonCode(signal: HeroAbilitySignal, relation: HeroPositionRelation): PlacementFitScorePart['reasonCode'] {
  if (signal.kind === 'globalDpsMultiplier') {
    return 'global-match'
  }

  return RELATION_REASON_CODE[relation] ?? inferTagOrStatMatch(signal)
}

export function inferMismatchReason(signal: HeroAbilitySignal): 'tag-mismatch' | 'stat-mismatch' {
  if (predicateHasNode(signal.targetQualifier?.predicate, 'stat')) {
    return 'stat-mismatch'
  }

  return 'tag-mismatch'
}

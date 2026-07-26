import type { HeroPositionRelation } from './abilityModel'

export interface HeroExplicitTargetingNone {
  status: 'none'
  relation: 'any'
}

export interface HeroExplicitTargetingSupported {
  status: 'supported'
  relation: HeroPositionRelation
}

export interface HeroExplicitTargetingUnsupported {
  status: 'unsupported'
  note: string
}

export type HeroExplicitTargeting =
  | HeroExplicitTargetingNone
  | HeroExplicitTargetingSupported
  | HeroExplicitTargetingUnsupported

export function isFilterLikeTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') {
    return false
  }

  const type = (target as Record<string, unknown>).type
  return type === 'by_tags'
    || type === 'tags'
    || type === 'attack_type'
    || type === 'stat'
    || type === 'stat_score'
}

// Array.isArray 对 unknown narrow 成 any[]（触发 no-unsafe-assignment），统一用谓词收窄到 unknown[]。
export function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

// 字符串 target → 位置关系（IC effect_defines.targets 的字符串简写）
const STRING_RELATION_MAP: Record<string, HeroPositionRelation> = {
  self: 'self',
  adj: 'adjacent',
  non_adj: 'nonAdjacent',
  col: 'sameColumn',
  ahead: 'allAheadColumns',
  next_col: 'aheadColumn',
  prev_col: 'behindColumn',
  next_two_col: 'aheadTwoColumns',
  prev_two_col: 'behindTwoColumns',
  behind: 'allBehindColumns',
  col_and_prev_col: 'sameOrBehindColumn',
  col_and_behind: 'sameOrBehindColumns',
  col_and_ahead: 'sameOrAheadColumns',
  prev_and_next_col: 'adjacentColumns',
  self_and_prev_two_col: 'selfAndBehindTwoColumns',
  self_and_adj: 'adjacentOrSelf',
  self_and_ahead: 'sameOrAheadColumns',
  // Jim 自身列 + 前一列 + 后一列（3 列宽带）。语义判读：IC "columns in front of and behind"，
  // 按立即相邻列解释（|delta|<=1）；若按"全阵型"算 per-champion mult 会得 3^N 失真。待 IC 源码确认。
  self_and_behind_and_ahead: 'selfAndAheadAndBehindColumns',
  front_2_columns: 'frontTwoColumns',
  back_2_columns: 'backTwoColumns',
}

const EXACTLY_BEHIND_COLUMNS: Record<number, HeroPositionRelation> = {
  1: 'exactlyBehindOneColumn',
  2: 'exactlyBehindTwoColumns',
  3: 'exactlyBehindThreeColumns',
}

const COL_FROM_BACK_INDEX: Record<number, HeroPositionRelation> = {
  0: 'rearMostColumn',
  1: 'secondRearMostColumn',
  2: 'thirdRearMostColumn',
}

// distance target：comparison + distance + self 组合 → 位置关系
function resolveDistanceRelation(target: Record<string, unknown>): HeroPositionRelation | null {
  const distance = Number(target.distance)
  const includeSelf = target.self === true
  const comparison = typeof target.comparison === 'string' ? target.comparison : '<='
  const exact = comparison === '=' || comparison === '=='

  // distance=1：exact 或 <= 都映射 adjacent（含 self 变体）
  if (distance === 1 && (exact || comparison === '<=')) {
    return includeSelf ? 'adjacentOrSelf' : 'adjacent'
  }
  if (comparison === '<=' && distance === 2) {
    return includeSelf ? 'withinTwoSlotsOrSelf' : 'withinTwoSlots'
  }
  if (comparison === '<=' && distance === 3) {
    return includeSelf ? 'withinThreeSlotsOrSelf' : 'withinThreeSlots'
  }
  // distance=2/3 的 exact 无对应枚举
  return null
}

function normalizeObjectRelation(target: Record<string, unknown>): HeroPositionRelation | null {
  switch (target.type) {
    case 'exactly_x_behind':
      return EXACTLY_BEHIND_COLUMNS[Number(target.num_columns)] ?? null
    case 'col_num':
      return target.start_from_back === true
        ? (COL_FROM_BACK_INDEX[Number(target.column)] ?? null)
        : null
    case 'distance':
      return resolveDistanceRelation(target)
    case 'cascade':
      return target.cascade_type === 'self_and_adj' ? 'adjacentOrSelf' : null
    case 'col_and_back_x':
      return Number(target.num_back_cols) === 1 ? 'sameOrBehindColumn' : null
    default:
      return null
  }
}

function normalizeTargetRelation(target: unknown): HeroPositionRelation | null {
  if (target === 'all' || target === 'all_slots' || isFilterLikeTarget(target)) {
    return 'any'
  }
  if (typeof target === 'string') {
    return STRING_RELATION_MAP[target] ?? null
  }
  if (target && typeof target === 'object') {
    return normalizeObjectRelation(target as Record<string, unknown>)
  }
  return null
}

export function normalizeExplicitTargeting(effect: unknown): HeroExplicitTargeting {
  const targetsField = (effect && typeof effect === 'object') ? (effect as Record<string, unknown>).targets : undefined
  const rawTargets: unknown[] = isUnknownArray(targetsField) ? targetsField : []

  if (rawTargets.length === 0) {
    return { status: 'none', relation: 'any' }
  }

  const relations = (rawTargets).map(normalizeTargetRelation)
  if (relations.some((relation) => relation === null)) {
    return { status: 'unsupported', note: `unsupported targets: ${JSON.stringify(rawTargets)}` }
  }

  const validRelations = relations.filter((r): r is HeroPositionRelation => r !== null)
  const uniqueRelations = [...new Set(validRelations)]
  if (uniqueRelations.length !== 1) {
    return { status: 'unsupported', note: `mixed targets: ${JSON.stringify(rawTargets)}` }
  }

  return {
    status: 'supported',
    relation: uniqueRelations[0]!,
  }
}

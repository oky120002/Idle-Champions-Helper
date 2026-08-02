import { asArray, asRecord } from './io-utils.ts'
import { parseRestrictions } from './restrictions-parser.ts'

interface SlotTopologyEntry {
  slotId: unknown
  row: number
  column: number
  x: unknown
  y: unknown
  adjacentSlotIds: unknown[]
}

interface ScenarioModel {
  variantId: unknown
  scenarioRef: { kind: 'variant'; id: unknown }
  name: unknown
  formationLayoutId: unknown
  objectiveArea: unknown
  slotTopology: SlotTopologyEntry[]
  forcedHeroes: unknown[]
  enemyTypes: unknown[]
  allowedHeroes: unknown[]
  allowedTags: unknown[]
  scenarioWarnings: string[]
  /** 被非英雄实体（小鸡/小鬼/护送等）占据的格数（restrictions 解析）。 */
  occupiedSlotCount: number
}

function contextMatchesVariant(
  context: Record<string, unknown>,
  variant: Record<string, unknown>,
): boolean {
  if (context.kind === 'variant') {
    return context.id === variant.id
  }

  if (context.kind === 'adventure') {
    return context.id === variant.adventureId
  }

  if (context.kind === 'campaign') {
    const campaign = asRecord(variant.campaign)
    return campaign !== null && context.id === campaign.id
  }

  return false
}

function findFormationForVariant(
  formations: unknown[],
  variant: Record<string, unknown>,
): Record<string, unknown> | null {
  for (const formationRaw of formations) {
    const formation = asRecord(formationRaw)
    if (!formation) continue
    const contexts = [
      ...asArray(formation.applicableContexts),
      ...asArray(formation.sourceContexts),
    ]
    const matched = contexts.some((contextRaw) => {
      const context = asRecord(contextRaw)
      return context ? contextMatchesVariant(context, variant) : false
    })
    if (matched) return formation
  }
  return null
}

function projectMechanicsToScenario(
  variant: Record<string, unknown>,
): { mechanicWarnings: string[] } {
  const mechanics = new Set<unknown>(asArray(variant.mechanics))
  const mechanicWarnings: string[] = []

  if (mechanics.has('time_out') || mechanics.has('click_damage_area_limit')) {
    mechanicWarnings.push('当前场景含计时或点击限制，攻速与持续输出价值提升。')
  }

  return { mechanicWarnings }
}

export function buildOfficialScenarioModel(
  variant: Record<string, unknown>,
  formations: unknown[],
): ScenarioModel {
  const formation = findFormationForVariant(formations, variant)
  const slotTopology: SlotTopologyEntry[] = formation
    ? asArray(formation.slots).map((slotRaw) => {
        const slot = asRecord(slotRaw) ?? {}
        return {
          slotId: slot.id,
          row: typeof slot.row === 'number' ? slot.row : 0,
          column: typeof slot.column === 'number' ? slot.column : 0,
          x: slot.x,
          y: slot.y,
          adjacentSlotIds: asArray(slot.adjacentSlotIds),
        }
      })
    : []
  const { mechanicWarnings } = projectMechanicsToScenario(variant)

  const restrictions = asArray(variant.restrictions)
  const allowedHeroIds = asArray(variant.allowedHeroIds)
  const allowedTags = asArray(variant.allowedTags)

  // restrictions 文本模板匹配 → slot-occupying 格数 + 未解析 warning。
  const restrictionTexts = restrictions.map((raw) => {
    const item = asRecord(raw) ?? {}
    const original = typeof item.original === 'string' ? item.original : ''
    const localized = asRecord(item.display) ?? {}
    const display = typeof item.display === 'string'
      ? item.display
      : (typeof localized.display === 'string' ? localized.display : '')
    return { original, display }
  })
  const parsedRestrictions = parseRestrictions(restrictionTexts)
  const restrictionWarnings: string[] = []
  if (parsedRestrictions.lockedSlotCount > 0) {
    restrictionWarnings.push(`当前场景有 ${parsedRestrictions.lockedSlotCount} 个槽位被非英雄实体占据，不参与英雄占位。`)
  }
  // 未解析的非平凡 restriction → 提示含特殊机制，请人工评估（flavor 文本不映射阵型约束）。
  restrictionWarnings.push(...parsedRestrictions.warnings.map((w) => `${w}（含特殊机制，请人工评估对阵型的影响）`))

  return {
    variantId: variant.id,
    scenarioRef: { kind: 'variant', id: variant.id },
    name: variant.name,
    formationLayoutId: formation?.id ?? null,
    objectiveArea: variant.objectiveArea ?? null,
    slotTopology,
    forcedHeroes: asArray(variant.forcedHeroIds),
    enemyTypes: asArray(variant.enemyTypes),
    allowedHeroes: allowedHeroIds,
    allowedTags,
    occupiedSlotCount: parsedRestrictions.lockedSlotCount,
    scenarioWarnings: [
      ...mechanicWarnings,
      ...restrictionWarnings,
      ...(formation ? [] : ['当前场景没有匹配的阵型布局。']),
      ...(allowedHeroIds.length > 0 || allowedTags.length > 0
        ? ['当前场景仅允许特定英雄（only_allow_crusaders），候选池已按白名单过滤。']
        : []),
    ],
  }
}

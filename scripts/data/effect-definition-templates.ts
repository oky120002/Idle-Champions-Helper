import type { JsonValue } from '../../src/domain/types'

type RawDefinition = Record<string, unknown>

/**
 * effect_def 的 effect_key 精简 template（只保留 DPS 评分需要的字段）。
 *
 * effect_def（effect_defines，公开 2872 条）被 patron_perk / blessing 的 `effect_def,<id>` 引用。
 * 本 template 供运行时解引用：
 * - `effectString`：判断 kind（hero_dps/global_dps）+ 数值来源（`$replace`=perLevel×actualLevel / 固定值）。
 * - `filterTargets`：英雄属性限定（by_tags/heroes/stat_score...），经 signalSemantics.normalizeTargetQualifier
 *   解析为 HeroQualifier，按 carry 匹配（hero_dps per-carry 生效条件）。
 * - `targets`：阵型作用范围（all/col_num/slots/by_tags/heroes）。
 *
 * 非 DPS effect_def（healing/gold/cooldown...）整体丢弃——评分只消费 DPS。
 */
export interface EffectDefinitionKeyTemplate {
  effectString: string
  filterTargets: JsonValue[]
  targets: JsonValue[]
}

export interface EffectDefinitionTemplate {
  id: string
  effectKeys: EffectDefinitionKeyTemplate[]
}

const DPS_KINDS = new Set(['hero_dps_multiplier_mult', 'global_dps_multiplier_mult'])

function isDpsEffectString(effectString: unknown): boolean {
  if (typeof effectString !== 'string') {
    return false
  }
  const kind = effectString.split(',')[0] ?? ''
  return Boolean(kind) && DPS_KINDS.has(kind)
}

function asJsonArray(value: unknown): JsonValue[] {
  return Array.isArray(value) ? (value as JsonValue[]) : []
}

export function normalizeEffectDefinitionTemplate(def: RawDefinition = {}): EffectDefinitionTemplate | null {
  const id = def.id
  if (id === undefined || id === null) {
    return null
  }
  const rawKeys = Array.isArray(def.effect_keys) ? def.effect_keys : []
  const effectKeys: EffectDefinitionKeyTemplate[] = []

  for (const key of rawKeys) {
    // effect_keys 元素通常为 dict；偶有裸 string（无 filter_targets），按 string 造 template。
    if (typeof key === 'string') {
      if (isDpsEffectString(key)) {
        effectKeys.push({ effectString: key, filterTargets: [], targets: [] })
      }
      continue
    }
    if (!key || typeof key !== 'object') {
      continue
    }
    const k = key as RawDefinition
    const effectString = typeof k.effect_string === 'string' ? k.effect_string : ''
    if (!isDpsEffectString(effectString)) {
      continue
    }
    effectKeys.push({
      effectString,
      filterTargets: asJsonArray(k.filter_targets),
      targets: asJsonArray(k.targets),
    })
  }

  if (effectKeys.length === 0) {
    return null
  }
  return { id: String(id), effectKeys }
}

export function buildEffectDefinitionTemplates(
  effectDefines: readonly RawDefinition[],
): EffectDefinitionTemplate[] {
  return effectDefines
    .map(normalizeEffectDefinitionTemplate)
    .filter((t): t is EffectDefinitionTemplate => t !== null)
}

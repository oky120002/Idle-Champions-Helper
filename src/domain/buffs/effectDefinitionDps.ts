import { parseEffectPayload } from '../effects/effect-string'

/**
 * DPS effect_def 运行时解引用（消费 `effect-definitions.json`）。
 *
 * patron_perk / blessing 的 catalog effect.effectString 可能是：
 * - 裸 `global_dps_multiplier_mult,$replace`（直接全局加成）；
 * - `effect_def,<id>` 引用（template 在 effect-definitions.json，含 kind + filter_targets/targets）。
 *
 * 本模块负责把 `effect_def,<id>` 解引用为 template effectKeys，并按 effect_string 语义算 value，
 * 供 globalBuff（通道 1：global_dps）与 externalHeroDpsMult（通道 2：hero_dps per-carry）复用。
 *
 * 消费类型与 scripts/data/effect-definition-templates.ts 的 EffectDefinitionTemplate 字段对齐
 * （effectString / filterTargets / targets），序列化兼容。
 */
export interface EffectDefinitionKeyEntry {
  effectString: string
  filterTargets: unknown[]
  targets: unknown[]
}

export interface EffectDefinitionEntry {
  id: string
  effectKeys: EffectDefinitionKeyEntry[]
}

/** active catalog effect（已按 active context 过滤 + 解析 actual level）。globalBuff 与 externalHeroDpsMult 复用。 */
export interface ActiveCatalogEffect {
  effectString: string
  perLevel: number
  level: number
}

const EFFECT_DEF_REF = /^effect_def,(.+)$/

/** catalog effect.effectString 是 `effect_def,<id>` 引用？ */
export function isEffectDefinitionReference(effectString: string): boolean {
  return EFFECT_DEF_REF.test(effectString)
}

/**
 * 解析 catalog effect 的 effectString：若为 `effect_def,<id>` 引用，返回 template 的 effectKeys；
 * 否则（裸 effect_string / 无 template）返回 null，调用方按裸 effect 逻辑处理。
 */
export function resolveEffectDefinitionKeys(
  effectString: string,
  templates: ReadonlyMap<string, EffectDefinitionEntry> | null | undefined,
): readonly EffectDefinitionKeyEntry[] | null {
  if (!templates) {
    return null
  }
  const match = EFFECT_DEF_REF.exec(effectString)
  if (!match) {
    return null
  }
  const templateId = match[1]
  if (templateId === undefined) {
    return null
  }
  return templates.get(templateId)?.effectKeys ?? null
}

/**
 * effect_def effectKey（或裸 effect_string）的数值：
 * - `$replace` → `perLevel × actualLevel`（per-user 实际等级缩放）；
 * - 固定值（如 `hero_dps_multiplier_mult,400`）→ 400；
 * - 非法 → 0。
 */
export function resolveEffectKeyValue(
  effectString: string,
  perLevel: number,
  actualLevel: number,
): number {
  const payload = parseEffectPayload(effectString)
  if (!payload) {
    return 0
  }
  const arg = payload.args[0]
  if (arg === '$replace') {
    return perLevel * actualLevel
  }
  const fixed = Number(arg)
  return Number.isFinite(fixed) ? fixed : 0
}

/** effect_string 的 kind（首个逗号前的标识符，精确匹配用）；非法 → null。 */
export function parseEffectKind(effectString: string): string | null {
  return parseEffectPayload(effectString)?.kind ?? null
}

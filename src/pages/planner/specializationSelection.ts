import type { SpecializationEntry } from '../../domain/abilities/specializationSignals'
import type { UserProfileSnapshot } from '../../domain/user-profile/types'

/**
 * 页面级专精 override：heroId → 玩家在 planner UI 选中的专精 upgradeId 列表（跨所有专精层合并）。
 * key 存在 = 该英雄已被 UI 覆盖（即便 [] = 显式选「无专精」）；key 缺失 = 用存档值。
 */
export type SpecializationOverrideMap = Record<string, string[]>

/**
 * 把页面级专精 override 合并进 profileSnapshot，得到喂给 engine 的有效 snapshot。
 *
 * - 无 snapshot / 无 override → 原样返回（同引用，避免 usePlannerRecommendation 无谓重算）。
 * - override[heroId] 存在 → 覆盖该英雄 specializations；缺失 → 保持存档 specialization_choices。
 * - 不修改原 snapshot（不可变）。engine 按 OwnedHero.specializations 注入 signal（ADR 0017），契约不变。
 *
 * override 是 session 级 working copy，不写回 IndexedDB；删 key = 回退到存档值。
 */
export function mergeSpecializationOverrides(
  snapshot: UserProfileSnapshot | null,
  overrides: SpecializationOverrideMap,
): UserProfileSnapshot | null {
  if (!snapshot || Object.keys(overrides).length === 0) {
    return snapshot
  }

  let changed = false
  const ownedHeroes = snapshot.ownedHeroes.map((hero) => {
    const override = overrides[hero.heroId]
    if (override === undefined) {
      return hero
    }
    changed = true
    return { ...hero, specializations: override }
  })

  return changed ? { ...snapshot, ownedHeroes } : snapshot
}

/** 一个专精层（同 requiredLevel 互斥选项组）。null requiredLevel 归为一组（保守互斥）。 */
export interface SpecializationTier {
  requiredLevel: number | null
  entries: SpecializationEntry[]
}

/**
 * 把英雄的 catalog 专精条目按 requiredLevel 分层（同层互斥、层间各选一个）。
 * 升序排列；requiredLevel 缺失（null）的归入同一组并排在末尾。组内保持 catalog 原序。
 */
export function groupSpecializationsByTier(entries: SpecializationEntry[]): SpecializationTier[] {
  const byLevel = new Map<number | null, SpecializationEntry[]>()
  for (const entry of entries) {
    const key = entry.requiredLevel ?? null
    const list = byLevel.get(key)
    if (list) {
      list.push(entry)
    } else {
      byLevel.set(key, [entry])
    }
  }
  return [...byLevel.entries()]
    .sort(([a], [b]) => tierSortKey(a) - tierSortKey(b))
    .map(([requiredLevel, tierEntries]) => ({ requiredLevel, entries: tierEntries }))
}

function tierSortKey(level: number | null): number {
  return level === null ? Number.POSITIVE_INFINITY : level
}

/**
 * 应用单层选择：从当前选择数组中移除本层全部 id，再加入新选 id（null = 选「无」，只移除）。
 * 返回新数组（不改入参）；其它层的选择原样保留。upgradeId 跨层唯一，理论不冲突。
 */
export function applyTierSelection(
  current: readonly string[],
  tierUpgradeIds: readonly string[],
  selected: string | null,
): string[] {
  const tier = new Set(tierUpgradeIds)
  const next = current.filter((id) => !tier.has(id))
  if (selected !== null) {
    next.push(selected)
  }
  return next
}

/**
 * 过滤出当前可选的专精条目：无前置（requiredUpgradeId 为 null/undefined）或前置已选中。
 * 指向非 catalog 选项的前置（普通升级 gate 或哨兵）视为恒满足——结构 gate 节点已进 catalog，
 * 故 catalog 内的前置才是真正的专精互斥依赖。供 UI 每层渲染前裁剪不可选项（级联型专精树
 * 仅显示与已选上层匹配的依赖层分支）。
 */
export function availableSpecializations(
  entries: readonly SpecializationEntry[],
  selected: readonly string[],
): SpecializationEntry[] {
  const entryById = new Map(entries.map((entry) => [entry.upgradeId, entry]))
  const selectedSet = new Set(selected)
  return entries.filter((entry) => {
    const prereq = entry.requiredUpgradeId
    if (!prereq) return true
    if (!entryById.has(prereq)) return true
    return selectedSet.has(prereq)
  })
}

/**
 * 级联清理：从选择中移除所有「前置不满足」的孤立选项，迭代到稳定（A→B→C 传递依赖）。
 * 改上层后下层可能留下游戏不可能的组合（如 hero 81 选「秘银皮肤」tier-1 + 「秘银皮肤」tier-2，
 * 但 tier-2 的 gate 是另一个互斥的 tier-1）；此函数在每次 override 选择后调用，清掉孤立下游。
 * 前置指向非 catalog 选项（普通升级 gate）不视为孤立。catalog 外的选中 id 原样保留（不归此函数管）。
 */
export function pruneOrphanedSpecializations(
  current: readonly string[],
  entries: readonly SpecializationEntry[],
): string[] {
  const entryById = new Map(entries.map((entry) => [entry.upgradeId, entry]))
  const selected = new Set(current)
  let changed = true
  while (changed) {
    changed = false
    for (const id of [...selected]) {
      const prereq = entryById.get(id)?.requiredUpgradeId
      if (prereq && entryById.has(prereq) && !selected.has(prereq)) {
        selected.delete(id)
        changed = true
      }
    }
  }
  return [...selected]
}

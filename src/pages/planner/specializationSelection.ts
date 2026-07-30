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

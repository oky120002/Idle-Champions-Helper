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

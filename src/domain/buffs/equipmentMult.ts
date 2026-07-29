/**
 * 装备 per-carry base DPS 加成计算。
 *
 * 数据源：`loot-catalog.json`（normalize 从 raw loot_defines 提取，保留 slot/rarity/effect_string）。
 * 数据源确认：`docs/specs/modules/planner/data-source-confirmations.md` §13.1。
 *
 * IC 装备无独立 ilvl/rarity 曲线——base effect 按 (hero, slot, rarity) 直接编码在 loot_defines，
 * enchant（item level）按固定比例放大：`final% = base% × (1 + enchant/250)`。
 *
 * 1/250 反推自明斯克 4 装备实测（slot1/2/3/5 的 base×(1+enchant/250) 精确匹配 +1378/+1343/+1032/+1224%）；
 * 250 的游戏常量来源未在 definitions 找到（可能客户端硬编码），作校准 knob 保留，待官方公式确认后微调。
 *
 * MVP 范围：只接 `hero_dps_multiplier_mult`（per-carry base DPS 装备，如明斯克 slot1/2）。
 * - 作 equipmentAdjustment 直接乘 carryDps（loot 未进 damagePool，此处补全）。
 * - `global_dps_multiplier_mult`（阵型级，应进 globalBuff/globalDpsPool）与 `buff_upgrade`/`buff_ultimate`
 *   （技能 buff）非 per-carry base DPS，留后续。
 * - 未传入 owned loot（未导入存档）→ 1（无加成，向后兼容）。
 */

export interface LootCatalogEntry {
  heroId: string
  slotId: string
  rarity: string
  effectString: string
}

export interface OwnedLootSlot {
  rarity: number
  /** item level（enchant）；缺省 0 = 无缩放（取 base）。 */
  enchant?: number
}

const HERO_DPS_PREFIX = 'hero_dps_multiplier_mult,'

/** enchant→effect 放大系数 = 1/250（反推自明斯克实测，见模块注释）。 */
const ENCHANT_SCALE = 1 / 250

/**
 * 解析 loot effect 的 base DPS 数值；非 base-DPS effect 返回 null。
 * `hero_dps_multiplier_mult,350` → 350；`buff_upgrade,275,2192` / `reduce_ultimate_cooldown,45` → null。
 */
export function parseLootEffectValue(effectString: string): number | null {
  if (!effectString.startsWith(HERO_DPS_PREFIX)) {
    return null
  }
  const raw = effectString.slice(HERO_DPS_PREFIX.length)
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/** 按 (slotId, rarity) 索引该英雄的 hero_dps base effect。 */
function indexCatalogByHero(
  heroId: string,
  catalog: readonly LootCatalogEntry[],
): Map<string, number> {
  const index = new Map<string, number>()
  for (const entry of catalog) {
    if (entry.heroId !== heroId) continue
    const value = parseLootEffectValue(entry.effectString)
    if (value === null) continue
    // 累加（防御同 slot:rarity 多 DPS effect；当前 raw 0 例）。
    const key = `${entry.slotId}:${entry.rarity}`
    index.set(key, (index.get(key) ?? 0) + value)
  }
  return index
}

/**
 * 玩家 owned 装备的 per-carry base DPS multiplier = `1 + Σ(base × (1 + enchant/250))/100`。
 * 作 equipmentAdjustment 乘进 carryDps（loot 未进 damagePool，此处补全）。
 *
 * - 无 owned loot（未导入存档）→ 1（无加成，向后兼容）。
 * - enchant 缺省 0 → base 无缩放。
 * - owned rarity 在 catalog 缺失 → 该槽不计。
 */
export function computeEquipmentMult(
  heroId: string,
  ownedLootBySlot: Readonly<Record<string, OwnedLootSlot>> | null,
  catalog: readonly LootCatalogEntry[],
): number {
  if (!ownedLootBySlot || Object.keys(ownedLootBySlot).length === 0) {
    return 1
  }
  const index = indexCatalogByHero(heroId, catalog)
  let addPercent = 0
  for (const [slotId, owned] of Object.entries(ownedLootBySlot)) {
    const base = index.get(`${slotId}:${owned.rarity}`)
    if (typeof base === 'number') {
      addPercent += base * (1 + (owned.enchant ?? 0) * ENCHANT_SCALE)
    }
  }
  return 1 + addPercent / 100
}

/**
 * 批量算每英雄的 equipmentAdjustment，供 options.equipmentAdjustmentByHero。
 *
 * 多余字段（gild/pigment/found）自动忽略——OwnedHeroLootSlot 结构兼容 OwnedLootSlot。
 * mult=1（无 owned loot 或 catalog 无匹配）不进 map：scoreFormation 对缺省 hero 用 `?? 1`，
 * 省载荷 + 保持「未导入存档 = 无加成」语义。
 */
export function computeEquipmentAdjustmentByHero(
  heroes: ReadonlyArray<{
    heroId: string
    lootBySlot: Readonly<Record<string, OwnedLootSlot>>
  }>,
  catalog: readonly LootCatalogEntry[],
): Map<string, number> {
  const result = new Map<string, number>()
  for (const hero of heroes) {
    const mult = computeEquipmentMult(hero.heroId, hero.lootBySlot, catalog)
    if (mult !== 1) {
      result.set(hero.heroId, mult)
    }
  }
  return result
}

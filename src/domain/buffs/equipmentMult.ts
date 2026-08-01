/**
 * 装备加成计算（per-carry base DPS + 全队 global_dps）。
 *
 * 数据源：`loot-catalog.json`（normalize 从 raw loot_defines 提取，保留 slot/rarity/effect_string）。
 * 数据源确认：`docs/specs/modules/planner/data-source-confirmations.md` §13.1。
 *
 * IC 装备无独立 ilvl/rarity 曲线——base effect 按 (hero, slot, rarity) 直接编码在 loot_defines，
 * enchant（item level）按固定比例放大：`final% = base% × (1 + enchant/250)`。
 * 1/250 反推自明斯克 4 装备实测（slot1/2/3/5 的 base×(1+enchant/250) 精确匹配 +1378/+1343/+1032/+1224%）；
 * 250 的游戏常量来源未在 definitions 找到（可能客户端硬编码），作校准 knob 保留，待官方公式确认后微调。
 *
 * 已接入 effect（单参数 `kind,value` 格式，enchant 同规则缩放）：
 * - `hero_dps_multiplier_mult`（per-carry base DPS，如明斯克 slot1/2）→ per-hero equipmentAdjustment 乘 carryDps
 *   （loot 未进 damagePool，由 scoreFormation 补全进 damage:hero 池）。
 * - `global_dps_multiplier_mult`（阵型级全队 DPS，scope=global）→ 全队聚合 multiplier，
 *   由 scoringBonusInputs 并入 global_dps add pool（damage:global，与 patron/blessing 同池加法）。
 *
 * 未接（留后续 B1）：`health_mult`（survival）、`gold_multiplier_mult`（gold）、
 * `buff_base_crit_*`（crit，mult 语义走 critFactor 独立通道）、
 * `buff_upgrade`（元加成，放大另一 upgrade 效果值，需先 resolve 被放大对象）。
 *
 * 未传入 owned loot（未导入存档）→ 无加成（向后兼容）。
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

/** loot 单参数 effect kind（`kind,value` 格式，value 为百分比基数）；buff_upgrade 等多参数元加成不在此列。 */
const SIMPLE_VALUE_KINDS = new Set([
  'hero_dps_multiplier_mult',
  'global_dps_multiplier_mult',
  'health_mult',
  'gold_multiplier_mult',
  'buff_base_crit_chance_mult',
  'buff_base_crit_damage_mult',
])

export interface ParsedLootEffect {
  kind: string
  value: number
}

/**
 * 解析 loot effect 的 kind+value；非单参数 effect（buff_upgrade 元加成等）→ null。
 * `hero_dps_multiplier_mult,350` → { kind, value:350 }；`buff_upgrade,275,2192` / `reduce_ultimate_cooldown,45` → null。
 */
export function parseLootEffect(effectString: string): ParsedLootEffect | null {
  const comma = effectString.indexOf(',')
  if (comma <= 0) {
    return null
  }
  const kind = effectString.slice(0, comma)
  if (!SIMPLE_VALUE_KINDS.has(kind)) {
    return null
  }
  const value = Number(effectString.slice(comma + 1))
  return Number.isFinite(value) ? { kind, value } : null
}

/** enchant→effect 放大系数 = 1/250（反推自明斯克实测，见模块注释）。 */
const ENCHANT_SCALE = 1 / 250

/** 全 catalog 索引：`heroId:slotId:rarity` → parsed effect（每 loot item 单 effect；三元组唯一）。 */
function indexCatalog(catalog: readonly LootCatalogEntry[]): Map<string, ParsedLootEffect> {
  const index = new Map<string, ParsedLootEffect>()
  for (const entry of catalog) {
    const parsed = parseLootEffect(entry.effectString)
    if (parsed) {
      index.set(`${entry.heroId}:${entry.slotId}:${entry.rarity}`, parsed)
    }
  }
  return index
}

/**
 * 一件 owned loot 经 enchant 缩放后的指定 kind effect 值（base × (1 + enchant/250)）。
 * catalog 无该 (hero,slot,rarity) 或 kind 不匹配 → 0（该槽对该 kind 无贡献）。
 */
function scaledOwnedEffect(
  index: ReadonlyMap<string, ParsedLootEffect>,
  heroId: string,
  slotId: string,
  owned: OwnedLootSlot,
  kind: string,
): number {
  const parsed = index.get(`${heroId}:${slotId}:${owned.rarity}`)
  if (!parsed || parsed.kind !== kind) {
    return 0
  }
  return parsed.value * (1 + (owned.enchant ?? 0) * ENCHANT_SCALE)
}

/**
 * 玩家 owned 装备的 per-carry base DPS multiplier = `1 + Σ(base × (1 + enchant/250))/100`。
 * 作 equipmentAdjustment 乘进 carryDps（loot 未进 damagePool，scoreFormation 补全进 damage:hero 池）。
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
  const index = indexCatalog(catalog)
  let addPercent = 0
  for (const [slotId, owned] of Object.entries(ownedLootBySlot)) {
    addPercent += scaledOwnedEffect(index, heroId, slotId, owned, 'hero_dps_multiplier_mult')
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
  const result = new Map<string, number>
  for (const hero of heroes) {
    const mult = computeEquipmentMult(hero.heroId, hero.lootBySlot, catalog)
    if (mult !== 1) {
      result.set(hero.heroId, mult)
    }
  }
  return result
}

/**
 * 全队 owned 装备的 global_dps multiplier = `1 + Σ_all heroes(base × (1 + enchant/250))/100`。
 * `global_dps_multiplier_mult` 是阵型级（scope=global）：任意英雄装备均贡献全队 DPS，跨英雄求和。
 * 返回 multiplier（与 patron/blessing globalBuff 同构），由 scoringBonusInputs 并入 global_dps add pool。
 *
 * - 未导入存档（无 owned loot）→ 1。
 * - enchant 缩放同 hero_dps。
 * - 只计 global_dps kind；hero_dps/health/gold/crit 装备不计入（各走独立通道）。
 */
export function computeEquipmentGlobalDpsMult(
  heroes: ReadonlyArray<{
    heroId: string
    lootBySlot: Readonly<Record<string, OwnedLootSlot>>
  }>,
  catalog: readonly LootCatalogEntry[],
): number {
  const index = indexCatalog(catalog)
  let addPercent = 0
  for (const hero of heroes) {
    if (!hero.lootBySlot) {
      continue
    }
    for (const [slotId, owned] of Object.entries(hero.lootBySlot)) {
      addPercent += scaledOwnedEffect(index, hero.heroId, slotId, owned, 'global_dps_multiplier_mult')
    }
  }
  return 1 + addPercent / 100
}

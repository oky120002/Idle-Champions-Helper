/**
 * 装备 multiplier 计算。
 *
 * 数据源：`loot-catalog.json`（normalize 从 raw loot_defines 提取，保留 slot_id）。
 * 数据源确认：`docs/modules/planner/data-source-confirmations.md` §13.1。
 *
 * IC 装备无独立 ilvl/rarity 曲线——效果按 (hero, slot, rarity) 直接编码在 loot_defines。
 * M1 理论基线把全 rarity 全 slot 累加（理论上界高估）；本模块按玩家 owned rarity 选取，
 * 产 equipmentMult（真实）与 theoreticalLootMult（M1 基线），供 13.4 调整比：
 * `realCarryDps = theoreticalCarryDps × (equipmentMult / theoreticalLootMult)`。
 *
 * MVP 范围：只算 DPS 类 effect（`global_dps_multiplier_mult`，add 进 global pool）。
 * 非 DPS（reduce_ultimate_cooldown / buff_upgrade 等）与 gild/enchant（无曲线）留缺口。
 *
 * 近似局限（第十一轮审计，当前 UI 未接入 → equipmentAdjustmentByHero 无调用方，暂无实际影响）：
 * adjustment 作整体乘数缩放整个 carryDps（含 crit/vuln/globalBuff 与 support 英雄的 global_dps buff），
 * 而非只替换 globalDpsPool 中的 loot 部分。当 globalDpsPool 含非 loot 加成时，比率会连带缩放
 * support buff（方向上低估 carryDps）；且只调 carry 自身 loot，support 英雄 loot 的 over-count 未触及。
 * 精确修复需 loot 按 owned 进 damage pool（重构 collect/evaluatePlacementFit 区分 loot 与非 loot 源），
 * 风险高且依赖 UI 传入 owned 数据 → 留 UI 接入时一并评估（见 data-source-confirmations.md §13.1）。
 */

export interface LootCatalogEntry {
  heroId: string
  slotId: string
  rarity: string
  effectString: string
}

export interface OwnedLootSlot {
  rarity: number
}

const DPS_EFFECT_PREFIX = 'global_dps_multiplier_mult,'

/**
 * 解析 loot effect 的 DPS 数值；非 DPS effect 返回 null。
 * `global_dps_multiplier_mult,120` → 120；`reduce_ultimate_cooldown,10` → null。
 */
export function parseLootEffectValue(effectString: string): number | null {
  if (!effectString.startsWith(DPS_EFFECT_PREFIX)) {
    return null
  }
  const raw = effectString.slice(DPS_EFFECT_PREFIX.length)
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/** 按 heroId 收集 catalog 中该英雄的 DPS loot 效果，按 (slotId, rarity) 索引。 */
function indexCatalogByHero(
  heroId: string,
  catalog: readonly LootCatalogEntry[],
): Map<string, number> {
  const index = new Map<string, number>()
  for (const entry of catalog) {
    if (entry.heroId !== heroId) continue
    const value = parseLootEffectValue(entry.effectString)
    if (value === null) continue
    // 累加（不覆盖）：与 computeTheoreticalLootMult 聚合对称，避免同 (slot,rarity) 多 DPS effect
    // 时 owned 取末值、theoretical 累加导致 ratio 失配（当前 raw 0 例，防御上游变更）。
    const key = `${entry.slotId}:${entry.rarity}`
    index.set(key, (index.get(key) ?? 0) + value)
  }
  return index
}

/**
 * 玩家 owned 装备 multiplier = `1 + Σ(owned DPS effect)/100`。
 * 按 ownedLootBySlot 的 rarity 从 catalog 选取每槽对应效果（非全 rarity 累加）。
 */
export function computeEquipmentMult(
  heroId: string,
  ownedLootBySlot: Readonly<Record<string, OwnedLootSlot>>,
  catalog: readonly LootCatalogEntry[],
): number {
  const index = indexCatalogByHero(heroId, catalog)
  let addPercent = 0
  for (const [slotId, owned] of Object.entries(ownedLootBySlot)) {
    const rarity = String(owned.rarity)
    const value = index.get(`${slotId}:${rarity}`)
    if (typeof value === 'number') {
      addPercent += value
    }
  }
  return 1 + addPercent / 100
}

/**
 * M1 理论 loot multiplier = `1 + Σ(全 slot 全 rarity DPS effect)/100`。
 * 即当前 hero-abilities.json 基线（collectRawEffectEntries 全量 loot 累加）的等价量。
 * 供 13.4 计算调整比 equipmentMult / theoreticalLootMult。
 */
export function computeTheoreticalLootMult(
  heroId: string,
  catalog: readonly LootCatalogEntry[],
): number {
  let addPercent = 0
  for (const entry of catalog) {
    if (entry.heroId !== heroId) continue
    const value = parseLootEffectValue(entry.effectString)
    if (typeof value === 'number') {
      addPercent += value
    }
  }
  return 1 + addPercent / 100
}

/**
 * 装备调整比 = ownedEquipMult / theoreticalLootMult（阶段 13.4）。
 * 用于把 M1 理论基线 carryDps 缩放到玩家实际装备：
 * `realCarryDps = theoreticalCarryDps × equipmentAdjustment`。
 *
 * - 无 owned loot（未导入存档）→ 1（保持理论基线）。
 * - owned rarity = 全 max → 1（理论即现实）。
 * - owned rarity < max → < 1（下调到真实装备水平）。
 */
export function computeEquipmentAdjustment(
  heroId: string,
  ownedLootBySlot: Readonly<Record<string, OwnedLootSlot>> | null,
  catalog: readonly LootCatalogEntry[],
): number {
  if (!ownedLootBySlot || Object.keys(ownedLootBySlot).length === 0) {
    return 1
  }
  const owned = computeEquipmentMult(heroId, ownedLootBySlot, catalog)
  const theoretical = computeTheoreticalLootMult(heroId, catalog)
  return theoretical > 0 ? owned / theoretical : 1
}

/**
 * 装备加成计算（per-carry hero_dps/health + placement-aware global_dps/gold）。
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
 * - `hero_dps_multiplier_mult`（hero-scope，per-carry base DPS）→ per-hero multiplier，
 *   scoreFormation 取 carry 值并入 damage:hero 池（hero-scope 只 boost 装备者，仅 carry 计）。
 * - `health_mult`（hero-scope，per-carry 生命）→ per-hero multiplier，scoreFormation 取 carry 值并入 survival:hero 池。
 * - `global_dps_multiplier_mult`（global-scope，全队 DPS）→ per-hero addPercent，
 *   scoreFormation 按 **placed 英雄**求和并入 damage:global 池（装备英雄绑定，只阵型内生效，排除 bench）。
 * - `gold_multiplier_mult`（global-scope，全队金币）→ per-hero addPercent，scoreTeamGold 按 placed 求和并入 gold:global 池。
 * - `buff_base_crit_chance_mult`/`buff_base_crit_damage_mult`（hero-scope，per-carry 暴击，mult 语义）
 *   → per-hero {chanceMult, damageMult}，scoreFormation 取 carry 值经 computeCritFactor 独立通道注入（非池聚合）。
 *
 * hero-scope（hero_dps/health/crit）只 boost 装备者自身 → scoreFormation 仅取 carry 值；
 * global-scope（global_dps/gold）影响全队但装备者必须在阵型内 → scoreFormation/scoreTeamGold 按 placed 求和
 * （与 patron/blessing 账号级 globalBuff 分列——后者不依赖 placed）。
 *
 * 未接（留后续 B1）：`buff_upgrade`（元加成，放大另一 upgrade 效果值，需先 resolve 被放大对象）。
 *
 * 未传入 owned loot（未导入存档）→ 无加成（向后兼容）。
 */

import { extractTargetIdsFromParsedEffectPayload, parseEffectPayload } from '../effects/effect-string'

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
 * 一个英雄所有 owned loot 对指定 kind 的加性百分比和（Σ base × (1 + enchant/250)）。
 * ownedLootBySlot null/空 → 0。
 */
function sumHeroOwnedByKind(
  index: ReadonlyMap<string, ParsedLootEffect>,
  heroId: string,
  ownedLootBySlot: Readonly<Record<string, OwnedLootSlot>> | null,
  kind: string,
): number {
  if (!ownedLootBySlot) {
    return 0
  }
  let sum = 0
  for (const [slotId, owned] of Object.entries(ownedLootBySlot)) {
    sum += scaledOwnedEffect(index, heroId, slotId, owned, kind)
  }
  return sum
}

/**
 * 批量算每英雄指定 kind 的加性百分比（Σ base×(1+enchant/250)）；0 不进 map（省载荷）。
 * 单次建索引复用。hero-scope kind 由调用方包成 multiplier（computeEquipment*ByHero）；
 * global-scope kind（global_dps/gold）直接用 addPercent（scoreFormation 按 placed 求和注入 global 池）。
 */
function computeAddPercentByHero(
  heroes: ReadonlyArray<{
    heroId: string
    lootBySlot: Readonly<Record<string, OwnedLootSlot>>
  }>,
  catalog: readonly LootCatalogEntry[],
  kind: string,
): Map<string, number> {
  const index = indexCatalog(catalog)
  const result = new Map<string, number>()
  for (const hero of heroes) {
    const addPercent = sumHeroOwnedByKind(index, hero.heroId, hero.lootBySlot, kind)
    if (addPercent !== 0) {
      result.set(hero.heroId, addPercent)
    }
  }
  return result
}

/**
 * 玩家 owned 装备的 per-carry base DPS multiplier = `1 + Σ(base × (1 + enchant/250))/100`。
 * scoreFormation 把 `(multiplier-1)×100` 并入 damage:hero 池 addPercent（与 ability hero_dps 同 key 加法，
 * unified 池语义 A1；见 simulator.md hero_dps_pool），非独立乘进 carryDps。hero-scope 仅 carry 计。
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
  return 1 + sumHeroOwnedByKind(index, heroId, ownedLootBySlot, 'hero_dps_multiplier_mult') / 100
}

/**
 * 批量算每英雄的 equipmentAdjustment，供 options.equipmentAdjustmentByHero（hero-scope hero_dps multiplier）。
 * 多余字段（gild/pigment/found）自动忽略——OwnedHeroLootSlot 结构兼容 OwnedLootSlot。
 * scoreFormation 取 carry 值（hero-scope 仅 carry 计），缺省 ?? 1。
 */
export function computeEquipmentAdjustmentByHero(
  heroes: ReadonlyArray<{
    heroId: string
    lootBySlot: Readonly<Record<string, OwnedLootSlot>>
  }>,
  catalog: readonly LootCatalogEntry[],
): Map<string, number> {
  const result = new Map<string, number>()
  for (const [heroId, addPercent] of computeAddPercentByHero(heroes, catalog, 'hero_dps_multiplier_mult')) {
    result.set(heroId, 1 + addPercent / 100)
  }
  return result
}

/**
 * 批量算每英雄的 health multiplier（hero-scope health_mult），供 options.equipmentHealthByHero。
 * scoreFormation survival 段取 carry 值并入 survival:hero 池（影响 effectiveHealth/推图层数）。
 */
export function computeEquipmentHealthByHero(
  heroes: ReadonlyArray<{
    heroId: string
    lootBySlot: Readonly<Record<string, OwnedLootSlot>>
  }>,
  catalog: readonly LootCatalogEntry[],
): Map<string, number> {
  const result = new Map<string, number>()
  for (const [heroId, addPercent] of computeAddPercentByHero(heroes, catalog, 'health_mult')) {
    result.set(heroId, 1 + addPercent / 100)
  }
  return result
}

/**
 * 批量算每英雄的 global_dps 加性百分比（global-scope global_dps_multiplier_mult），供 options.equipmentGlobalDpsByHero。
 * scoreFormation 按 **placed 英雄**求和并入 damage:global 池（装备英雄绑定，只阵型内生效，排除 bench；
 * 与 patron/blessing 账号级 globalBuff 分列）。enchant 缩放同 hero_dps。
 */
export function computeEquipmentGlobalDpsByHero(
  heroes: ReadonlyArray<{
    heroId: string
    lootBySlot: Readonly<Record<string, OwnedLootSlot>>
  }>,
  catalog: readonly LootCatalogEntry[],
): Map<string, number> {
  return computeAddPercentByHero(heroes, catalog, 'global_dps_multiplier_mult')
}

/**
 * 批量算每英雄的 gold 加性百分比（global-scope gold_multiplier_mult），供 options.equipmentGoldByHero。
 * scoreTeamGold 按 placed 英雄求和并入 gold:global 池（team-gold 模式，placement-aware）。
 */
export function computeEquipmentGoldByHero(
  heroes: ReadonlyArray<{
    heroId: string
    lootBySlot: Readonly<Record<string, OwnedLootSlot>>
  }>,
  catalog: readonly LootCatalogEntry[],
): Map<string, number> {
  return computeAddPercentByHero(heroes, catalog, 'gold_multiplier_mult')
}

/**
 * 批量算每英雄的暴击 mult（hero-scope buff_base_crit_chance_mult / buff_base_crit_damage_mult），
 * 供 options.equipmentCritByHero。crit 是 mult 语义、走 critFactor 独立通道（非池聚合）：每 sub-type 的
 * 原始百分比经 enchant 缩放后折算 mult（1+Σ/100），chance/damage 各自独立。
 * scoreFormation 取 carry 值经 computeCritFactor 第三参注入（hero-scope 仅 carry 计）。
 */
export interface EquipmentCritBonus {
  /** 暴击几率 mult = 1 + Σ(buff_base_crit_chance_mult base × (1+enchant/250))/100。 */
  chanceMult: number
  /** 暴击伤害 mult = 1 + Σ(buff_base_crit_damage_mult base × (1+enchant/250))/100。 */
  damageMult: number
}
export function computeEquipmentCritByHero(
  heroes: ReadonlyArray<{
    heroId: string
    lootBySlot: Readonly<Record<string, OwnedLootSlot>>
  }>,
  catalog: readonly LootCatalogEntry[],
): Map<string, EquipmentCritBonus> {
  const chance = computeAddPercentByHero(heroes, catalog, 'buff_base_crit_chance_mult')
  const damage = computeAddPercentByHero(heroes, catalog, 'buff_base_crit_damage_mult')
  const result = new Map<string, EquipmentCritBonus>()
  for (const heroId of new Set([...chance.keys(), ...damage.keys()])) {
    result.set(heroId, {
      chanceMult: 1 + (chance.get(heroId) ?? 0) / 100,
      damageMult: 1 + (damage.get(heroId) ?? 0) / 100,
    })
  }
  return result
}

/**
 * 装备 buff_upgrade 元加成：放大英雄自身某 upgrade 的效果值。
 *
 * 与 hero_dps/global_dps/gold/crit/health 加性通道不同，buff_upgrade 是 wrapper（bonusScaleOfSignal
 * 指向 base signal），产出 signal 注入 profile（equipmentBuffSignals.ts applyEquipmentBuffsToProfile），
 * 非聚合数值。loot 数据全是 plain `buff_upgrade`/`buff_upgrades`（2168 条实测，0 条 stacks_multiply/
 * stack_func）；复杂变体（per_tagged/distance/where）依赖 build 期 stack 元数据，runtime 从 effectString
 * 不可构造 → 只接 plain 两 kind，复杂变体返回 null（标注「没算」）。
 *
 * target 是英雄自己的 upgrade（champion-details upgrades[].id）；effect-string.ts 的 target 抽取已覆盖
 * 单/多 target + 4 参变体（buff_upgrade→args[1]，buff_upgrades→args.slice(1)，第4参忽略）。
 */
const PLAIN_BUFF_UPGRADE_KINDS = new Set(['buff_upgrade', 'buff_upgrades'])

export interface ParsedBuffUpgrade {
  value: number
  targetUpgradeIds: string[]
}

export function parseBuffUpgradeEffect(effectString: string): ParsedBuffUpgrade | null {
  const payload = parseEffectPayload(effectString)
  if (!payload || !PLAIN_BUFF_UPGRADE_KINDS.has(payload.kind)) {
    return null
  }
  const value = Number(payload.args[0])
  if (!Number.isFinite(value)) {
    return null
  }
  const targetUpgradeIds = extractTargetIdsFromParsedEffectPayload(payload)
  if (targetUpgradeIds.length === 0) {
    return null
  }
  return { value, targetUpgradeIds }
}

/** 一件装备 buff_upgrade wrapper 的 runtime 注入元数据（经 enchant 缩放）。 */
export interface EquipmentBuff {
  /** 被放大的目标 upgrade id（英雄自身 upgrade）；runtime 按此反查 direct base signal。 */
  targetUpgradeId: string
  /** enchant 缩放后的 wrapper 百分比：base × (1 + enchant/250)。 */
  value: number
  /** 源 effectString（wrapper signal 的 rawEffect，保留来源可追溯）。 */
  rawEffect: string
}

/**
 * 批量收集每英雄 owned 装备的 buff_upgrade wrapper 元数据，供 runtime applyEquipmentBuffsToProfile
 * 按 target upgradeId 反查 base signal 构造 wrapper 注入。enchant 缩放同加性通道（base × (1+enchant/250)）。
 * 未导入存档（无 owned loot）或无 buff_upgrade 装备 → 空 map（向后兼容）。
 */
export function collectEquipmentBuffsByHero(
  heroes: ReadonlyArray<{
    heroId: string
    lootBySlot: Readonly<Record<string, OwnedLootSlot>>
  }>,
  catalog: readonly LootCatalogEntry[],
): Map<string, EquipmentBuff[]> {
  const index = new Map<string, { rawEffect: string; value: number; targetUpgradeIds: string[] }>()
  for (const entry of catalog) {
    const parsed = parseBuffUpgradeEffect(entry.effectString)
    if (parsed) {
      index.set(`${entry.heroId}:${entry.slotId}:${entry.rarity}`, { rawEffect: entry.effectString, ...parsed })
    }
  }
  const result = new Map<string, EquipmentBuff[]>()
  for (const hero of heroes) {
    const buffs: EquipmentBuff[] = []
    for (const [slotId, owned] of Object.entries(hero.lootBySlot)) {
      const indexed = index.get(`${hero.heroId}:${slotId}:${owned.rarity}`)
      if (!indexed) {
        continue
      }
      const scaledValue = indexed.value * (1 + (owned.enchant ?? 0) * ENCHANT_SCALE)
      for (const targetUpgradeId of indexed.targetUpgradeIds) {
        buffs.push({ targetUpgradeId, value: scaledValue, rawEffect: indexed.rawEffect })
      }
    }
    if (buffs.length > 0) {
      result.set(hero.heroId, buffs)
    }
  }
  return result
}

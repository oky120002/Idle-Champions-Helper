# 装备与能力数据核实

## equipment 曲线数据源

**结论：无独立 ilvl/rarity 乘数曲线——装备效果直接按 (hero, slot, rarity) 编码在 `loot_defines` / `champion-details.loot`。**

### 数据结构

- `loot_defines`（4176 条）：每条 = 一个 (hero_id, slot_id, rarity) 组合，含 `effects: [{effect_string}]`。
  - 例：hero 1 slot 1：rarity 1 → `global_dps_multiplier_mult,10`；rarity 2 → `65`；rarity 3 → `120`；rarity 4 → `230`。
  - rarity 共 4 档（1-4），slot 共 4 槽（slot_id 1-4）。每 hero 约 16-24 条 loot。
- `champion-details.<id>.loot`（normalize 后）：包含该 hero 的全部 (slot, rarity) 组合，保留 `slotId` + `rarity`（`normalizeChampionLoot` 读 `slot_id`/`rarity`）。
- `hero-abilities.json` 的 loot signal **不携带 (slotId, rarity)**——`collectRawEffectEntries` 把 `detail.loot[].effects[]` 展平成 signal，丢失槽位/稀有度配对。`equipmentMult` 需按 owned (slot, rarity) 选取，故 normalize 另建 flat `loot-catalog.json`（跨 hero 单文件索引，planner 运行时只载 hero-abilities，不载 champion-details）。
- 效果类型：绝大多数 `global_dps_multiplier_mult`（按 rarity 递增），少量 `reduce_ultimate_cooldown` / `buff_upgrade` / `buff_ultimate`。

### 理论基线（over-count）

`collectRawEffectEntries` 遍历 `detail.loot` **全部条目**收 effect → 进入 hero profile 的 supportSignals → 消费层全量累加进 damage pool。即把**所有 rarity × 所有 slot** 的 loot 效果全部相加，等同「玩家每个槽位同时拥有全部 rarity」（不可能，玩家每槽只有一个 rarity）→ **理论上界高估**。

### 装备精细化策略

装备「曲线」实为**按 owned rarity 选取对应 loot effect**（不是连续曲线函数）：

1. **数据**：`UserProfileSnapshot.ownedHeroes[].lootBySlot: Record<slotId, {rarity, gild, enchant, ...}>` = 玩家每槽实际 rarity。
2. **映射**：按 (hero, slot, ownedRarity) 从 loot_defines 取该 loot 的 effect_string（而非全 rarity 求和）。
3. **multiplier**：`equipmentMult = Π(1 + ownedLootEffect/100)`（每槽一件，进 globalDpsMultiplier pool）。

### 已知缺口

- **loot-catalog 与 champion-details.loot 同源双路径**：`buildLootCatalog`（normalize-idle-champions-definitions）与 `normalizeChampionLoot`（normalize-champions）各自从 raw `loot_defines` 读取 (slot, rarity, effect)，当前数据一致；任一路径单独改动都会产生静默漂移风险。
- **hero_dps 已建模**：`computeEquipmentMult`（`equipmentMult.ts:167-186`）按 owned (slot, rarity) 累加 `hero_dps_multiplier_mult`，`steadyStateScoring.ts:306-313` 将 `(multiplier-1)×100` 并入 `damage:hero` unified 池 addPercent（与 ability hero_dps 同 key 加法，非独立乘进 carryDps）。`buff_upgrade` 已接 owned-aware wrapper 通道（见 damage-mechanic-inventory.md §4 装备行）。
- **gild / enchant 无曲线**：`game_rule_defines` 无 gilding/enchant 缩放曲线（服务端公式）。`OwnedHeroLootSlot.gild/enchant` 暂不建模。
- **feat / legendary**：同 loot 结构（`detail.feats` / `detail.legendaryEffects`），理论基线已全量纳入；当前未按玩家实际选择的 feat（`OwnedHero.activeFeats`）和传奇等级（`OwnedHeroLegendarySlot.level`）裁剪。

---

## ability_defines ult buff

### 数据源

`ability_defines`（10 条），结构 `{id, hero_ids, base_cooldown, duration, effect}`：

- 对齐：**id === hero_id**（`hero_ids` 数组为空，关联纯靠 id；raw 无字段引用 ability_defines）。
- `effect`：裸 effect_string（`effect_def,28`）或 JSON 串（`{"effect_string":"attack_speed_mult,100",...}`）。
- cooldown/duration：base_cooldown 900-7200 秒，duration 0-30 秒。
- DPS-relevant 信号（经 effect_def 展开）：Commander `global_dps_multiplier_mult,100`（全队 ×2）、Pact Weapon `hero_dps_multiplier_mult,100`、Cunning Action `attack_speed_mult,100`、Channel Divinity `buff_upgrades` 等。

### uptime 折算（`src/domain/simulator/ultUptime.ts`）

- `computeUltUptime(duration, baseCooldown, modronActive)` = `duration / base_cooldown`（modron 满级自动施放），上限 1；modron 未激活 / 参数非法 → 0（保守不计）。
- `foldUltBuffValue(value, uptime)` = `value × uptime`（steady-state 长期平均覆盖率）。
- 边界：steady-state 近似；step simulation（长期扩展）用逐窗口实际激活状态替代。

### pipeline 集成现状

ability_defines 已完整接入三层数据流：

1. **normalize 层**（`scripts/data/normalize-champions.ts`）：`normalizeChampionAbility`（:659）按 id 对齐提取 `ability_defines[id]` → `champion-details.<id>.ability`；effect 三形态统一展开——裸 string / JSON 串 / `effect_def,N` 引用查 `effect_defines` 展开。uptime 折算收敛在 normalize 层（`value × min(1, duration/baseCooldown)`，modron 满级 steady-state），消费侧零改动。
2. **collect 层**（`scripts/data/effect-helpers.ts`）：`collectRawEffectEntries` 第六源 `sourceBucket='ability'` 收集 `detail.ability.effects`（预折算后的串）。
3. **产物**：champion-details.ability 已含 `{id, duration, baseCooldown, effects}`；hero-abilities.json 含 ult buff signal（Commander hero 1 产 `globalDpsMultiplier value=0.833`，即 `100 × 30/3600`）。

modron gating：modron 未满级 → uptime=0 → ult buff 不进 pool（保守）。

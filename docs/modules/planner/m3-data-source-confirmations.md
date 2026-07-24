# M3 数据源确认报告

- 作用：归档里程碑 3（阶段 10-14）各「数据源确认」步骤的调查结论，供后续实现与审计追溯。
- 来源：raw `definitions-2026-04-13T02-00-23.309Z.json`（`game_rule_defines` / `monster_defines` / `patron_perk_defines` 等）。
- 配套：步骤清单见 `milestone-3-enhancement.md`；格式特性见 `docs/research/data/game-data-source/format-quirks.md`。

---

## 10.1 怪物 stats 数据源（monster_base_stats）

**结论：数据源确认可用。** 怪物随层数缩放的 stats 是**全局 game rule**（`game_rule_defines.rule_name=="monster_base_stats"`），不是 per-monster 字段。per-monster 身份（tags / attack_type / adventures）在 `monster_defines`，已由 `scripts/data/normalize-adventures.ts` 的 `buildMonsterCatalog` 收取；缩放曲线此前未被任何模块消费，阶段 10 首次接入。

### 字段清单（`monster_base_stats.rule`）

| 字段 | 值 | 用途 |
|---|---|---|
| `base_health` | `10` | 怪物 area 1 基础生命 |
| `health_growth_rate` | `2.031` | 默认每层生命增长率 |
| `health_growth_rate_curve` | `{1:2.031, 2001:3.031, 2251:4.531}` | 按层数分档的生命增长率（stepped curve） |
| `base_dps` | `1` | 怪物 area 1 基础秒伤 |
| `dps_growth_rate` | `1` | 默认每层 dps 增长率 |
| `dps_growth_rate_curve` | `{1:1, 50:1.75, 51:1, 100:1.75, ...}` | boss 层（50/100/151 起 每 50 层）1.75× spike，高层（2001-2401 每 50 层）升至 4，2451 层 1e10（max_area 墙） |
| `base_speed` | `50` | 怪物速度参数（语义未确认，见下方 dps 量纲缺口） |
| `speed_growth_rate` | `1` | 速度不随层数增长 |
| `health_gold_ratio` | `0.65` | 生命/金币比基准（阶段 3 baseGold 已用） |
| `health_gold_ratio_curve` | `{1:0.65, 42:0.62, ...}` | 比率随层数衰减 |
| `gold_overrides` | `{1:.., 2:..}` | 按层的金币覆写 |
| `power_boost_time` / `power_boost_growth_rate` / `power_boost_multiplicative` | `10` / `1` / `false` | 怪物 power boost 机制（rate=1，当前无实际增长贡献） |

### 缩放公式（实现采用）

CNE 的 `*_growth_rate_curve` 是 **per-area stepped curve**：area A 的增长率 = curve 中 `≤ A` 的最大 key 对应值。stats 按**逐层复合**累积：

```
stat(area) = base × Π_{a=2..area} curve_lookup(a)
```

- **生命**（area ≤ 2000）：`health(A) = 10 × 2.031^(A-1)`。area 2001+ 增长率升至 3.031、2251+ 升至 4.531（高层加速）。
- **dps**：增长率常态为 1（不增长），仅 boss 层（50/100/151/201…，第 3 个起 = 151 + 50k）×1.75；即 `dps(A) = 1.75^(boss 层数)`。

**数值合理性核对**（佐证 per-area 复合解释正确）：
- `health(50) = 10 × 2.031^49 ≈ 10^16`，`health(100) ≈ 10^31`，`health(1000) ≈ 10^308`（恰逼近 double 上界），`health(2000) ≈ 10^616`（超出 float → 必须用 break_eternity，本仓库 `GameNumberValue` 已是 `break_eternity.js`）。
- 怪物生命每层 ~2× 是 IC 指数墙的核心设计；dps 增长缓慢（每 50 层 1.75×）→ survival 约束在推图初期决定后长期稳定，**HP（击杀时间）才是推图层数的主要约束**，与阶段 5「survival 降级为约束、推图预估以 BUD/HP 为主」一致。

### 绝对值校准边界（继承第六轮审计）

公式**结构**来自官方数据，但**绝对值未与真实游戏实测对照**。阶段 10.2 预估结果必须向用户标注「未校准」，待阶段 7.5 BUD 实测校准后才闭环。相对比较（高 BUD 阵型预估层数 > 低 BUD）不受影响。

### dps 量纲缺口（第八轮审计）

`base_dps` / `dps_growth_rate_curve` 字段名为 dps，但 `base_speed`(=50) 语义未确认（per-second vs per-hit）。areaEstimation 的 survival 约束（effectiveHealth ≥ monsterDpsAt）当前以「怪物伤害随层数缩放」近似——`survivalCalculation.canSurviveBurst` 的正确判据是单次伤害（incomingDamagePerHit）。精确的单次伤害判据需 base_speed 语义确认后派生 monsterDamagePerHitAt，留后续。

### 相关 game rules（阶段 14 复用）

- `max_area: {area: 2501}` — 游戏最大层数，推图预估上限。
- `max_modron_auto_reset_area: {area: 2500}` — modron 自动重置层数上限（阶段 14.3）。
- `click_damage_settings: {base_power:1, power_curve:2.031, base_cost:50, cost_curve:1.7}` — click damage 按层缩放曲线与怪物生命同构（阶段 14.1）。
- `ultimate_damage_params: {dps_based:true, ...}` — ult 伤害派生自 DPS/BUD（阶段 14.4）。

---

## 11.1 blessings 数据源调查

**结论：blessings 在 M3 不可做——只做 patron-perks（阶段 11.3/11.4）。**

证据链：

1. **definitions 无 blessing 效果定义**：top-level keys 全量枚举无 `blessing_defines` / `blessing_defines`；`patron_defines` / `campaign_defines` 的 properties 不含 blessing 树。effect_defines 中仅 634/646 含 `luck_of_yondalla_blessing`（Yondalla 特例机制，非通用 patron blessings 系统）、1439 含 `behind` tag 的 hero_dps（非 blessing）。
2. **raw user save 有 favor + blessings 计数**：`scripts/data/user-sync/userProfileNormalizer.ts` 的 `CampaignPayload` 读 `favor` / `blessings`，`normalizeCampaignDetails` 产出 `{campaignId, favor, blessings: Record<string,number>}`（blessing_id → 已购数量/等级）。
3. **但 `UserProfileSnapshot` 丢弃该数据**：`buildUserProfileSnapshot` 调 `normalizeCampaignDetails` 只为产 warning（`campaign details imported: N`），favor/blessings 不进 snapshot 字段（`src/domain/user-profile/types.ts` 的 `UserProfileSnapshot` 无 favor/blessings）。

**含义**：即便把 favor/blessings 计数接回 snapshot，**没有 blessing 效果定义**就无法知道每个 blessing_id 给多少 DPS/金币加成——blessing 树定义不在当前 definitions 快照（可能属游戏服务端或未抓取的独立端点）。阶段 11 按 milestone 条件「11.1 确认 blessings 不可做 → 只做 patron-perks」执行。

**后续若要补 blessings**：①确认 blessing 树定义的上游端点并抓取；②`UserProfileSnapshot` 加 `campaigns: {campaignId, favor, blessings}[]`；③blessing 效果按 patron-perks 同构解析（effect_def 引用 + per_level 缩放）。

---

## 11.2 patron-perks effect 结构确认

**结论：数据源结构清晰，可解析。**

来源：`patron_perk_defines`（110 条，type 1/2 各 55——type 区分 perk 类别，effect 结构同构）。结构：

```jsonc
{
  "id": 1, "name": "Mirt's Mirth", "patron_id": 1, "tier_id": 1, "type": 1,
  "cost": { "base_cost": 5000, "scaling": 1.05 },
  "levels": 10,                  // 最大等级
  "effects": [
    { "effect_string": "global_dps_multiplier_mult,$replace", "per_level": 100 }
  ]
}
```

### effect 形态

- `effect_string` + `per_level`（每级加成值）。
- `$replace` 语义：perk 效果按当前等级 **替换**（非叠加），有效值 = `per_level × currentLevel`。`levels` 上限封顶。
- 两类载体：
  1. **裸 effect_string**（如 `global_dps_multiplier_mult,$replace` / `gold_multiplier_mult,$replace`）——直接全局加成。
  2. **`effect_def,<id>` 引用**——指向 `effect_defines[<id>]`，含 `effect_keys[]`（带 `filter_targets` tag 限定，如 effect_def 454 `hero_dps_multiplier_mult` + `by_tags:good`）。

### effect_string 分布（110 perks）

| effect_string | 数量 | 加成类型 |
|---|---|---|
| `global_dps_multiplier_mult,$replace` | 21 | 无条件全局 DPS（进 patronPerkMult pool） |
| `gold_multiplier_mult,$replace` | 2 | 全局金币 |
| `global_dps_multiplier_mult_area_tags,$replace,<tag>` | 3 | 场景 tag 条件全局 DPS（hellish 2 / underground 1） |
| `global_dps_multiplier_mult_per_ge_pair,$replace` | 1 | 条件全局 DPS（按 GE 对计数，MVP 未接入） |
| `global_dps_multiplier_mult_per_enemy,$replace` | 1 | 条件全局 DPS（按敌人数计数，MVP 未接入） |
| `global_dps_mult_per_tagged_crusader_mult,$replace,gold` | 1 | 条件全局 DPS（按 gold tag 英雄计数，MVP 未接入） |
| `effect_def,<id>`（453-460 / 609-613 / 828-833 等） | ~80 | tag 限定 hero_dps / healing / vulnerability 等 |
| `monster_health_reduce,$replace` / `health_mult,$replace` / `monster_with_tag_more_damage` 等 | 少量 | 非全局，按需评估 |

### 接入策略（阶段 11.3/11.4）

- **全局 DPS 进 global pool**：`global_dps_multiplier_mult,$replace`（21 条）直接进 `patronPerkMult` pool（add 语义，value = per_level × maxLevels）；global-buffs.json 实际产出 21 signals（per-patron 4/5/6/4/2）。area_tags 条件版（3 条）+ per_ge_pair/per_enemy/per_tagged 计数版（3 条）需条件匹配，留后续扩展。
- **tag 限定 hero_dps**（effect_def 引用，~80 条）：按 `filter_targets` tag 匹配英雄，进 `heroDpsMultiplier` pool。MVP 可先接全局 DPS（最高频、最直接），tag 限定版按需扩展（复用现有 `HeroQualifier` tag 解析）。
- **perk 等级来源**：patron perks 的已购等级属用户存档（类似 blessings，需 `UserProfileSnapshot` 暴露 patron perk levels）。snapshot 当前未暴露 → MVP 取**满级理论值**（per_level × levels），标注「理论最大」，按存档裁剪留阶段 13 精细化（与装备/feat 同批）。

> **perk 等级数据缺口**：`UserProfileSnapshot` 未暴露 patron perk 已购等级（同 11.1 blessings 缺口）。raw user save 是否含 perk levels 待 13.2 提取阶段一并确认；MVP 先用满级理论值进 pool。

---

## 12.1 restrictions 高频模式评估

**结论：restrictions 高度离散，可模板化的高频模式仅 slot-occupying 一类；其余为 flavor 文本，低频手工补。**

### 数据源

- `variants.json.items[].restrictions: Array<{original, display}>`（normalize 后，双语）。1405 variant 全部有 restrictions。
- 来源字段：`adventure_defines.restrictions_text`（raw，字符串）；variant 继承自父 adventure。
- 现状：`buildOfficialScenarioModel` 把 `variant.restrictions` 非空时仅标 warning「自由文本，尚未自动解析，请人工复核」，`bannedHeroes` 恒空。

### 模式分布（jq 全量统计）

restrictions 绝大多数是**独特 flavor 文本**（描述特殊冒险机制：疯牛/暗影怪/无限亡灵等），不映射到阵型约束。可操作（影响阵型合法性/候选池）的模式只有两类，且**各模式频次极低（1–2 次）**：

**① slot-occupying（→ lockedSlots，最高价值）**：全文仅 5 条 EN 提及 "slots" + 占据语义：

| 模式（EN） | ZH | 锁定格数 |
|---|---|---|
| Four slots...occupied by chickens | 四格会被小鸡占据 | 4 |
| Two random slots...cursed | 两格被诅咒 | 2 |
| Three friendly imps take up slots | 三个友好小鬼占据 | 3 |
| The Farmer's Daughter and Son take up two slots | 农夫之女与子占两格 | 2 |
| Friendly animals take up slots...one slot...then every... | 友好动物占格（1 + 随层数递增） | 变量（复杂，手工补） |

**② champion-tag 限制（→ allowedTags，已被 mechanics 覆盖）**：「Only Evil Champions」「may only use Ranger, Druid, and/or Barbarian」等。这些已被结构化 `only_allow_crusaders` mechanics 捕获（scenario.allowedTags/allowedHeroes），restrictions_text 版本冗余，不重复解析。

### 接入策略（阶段 12.2/12.3）

- **slot-occupying 模板匹配**：关键词模板 `（数字词）slots...（take up|occupied|cursed）`（EN）+ `（中文数词）格...占据`（ZH）→ lockedSlots 数。变量版（friendly animals）进 semantic-overrides.json 手工补。
- **champion-tag 不重复解析**：已由 mechanics 覆盖。
- **flavor 文本不解析**：特殊冒险机制（疯牛/暗影等）不映射阵型约束，进 warning 提示「含特殊机制，请人工评估」。
- 不用 NLP（批判③），纯关键词模板 + 手工 semantic-overrides。

---

## 13.1 equipment 曲线数据源确认

**结论：无独立 ilvl/rarity 乘数曲线——装备效果直接按 (hero, slot, rarity) 编码在 `loot_defines` / `champion-details.loot`。**

### 数据结构

- `loot_defines`（4176 条）：每条 = 一个 (hero_id, slot_id, rarity) 组合，含 `effects: [{effect_string}]`。
  - 例：hero 1 slot 1：rarity 1 → `global_dps_multiplier_mult,10`；rarity 2 → `65`；rarity 3 → `120`；rarity 4 → `230`。
  - rarity 共 4 档（1-4），slot 共 4 槽（slot_id 1-4）。每 hero 约 16-24 条 loot（不同 slot/rarity/效果类型）。
- `champion-details.<id>.loot`（normalize 后）：**包含该 hero 的全部 (slot, rarity) 组合**（hero 1 = 24 条），保留 `slotId` + `rarity`（`normalizeChampionLoot` 读 `slot_id`/`rarity`）。
- `hero-abilities.json` 的 loot signal **不携带 (slotId, rarity)**——`collectRawEffectEntries` 把 `detail.loot[].effects[]` 展平成 signal，丢失槽位/稀有度配对。`equipmentMult` 需按 owned (slot, rarity) 选取，故 normalize 另建 flat `loot-catalog.json`（跨 hero 单文件索引，planner 运行时只载 hero-abilities，不载 champion-details）。
- 效果类型：绝大多数 `global_dps_multiplier_mult`（按 rarity 递增），少量 `reduce_ultimate_cooldown` / `buff_upgrade` / `buff_ultimate`。

### M1 理论基线现状（over-count）

`collectRawEffectEntries`（`effect-helpers.ts:584`）遍历 `detail.loot` **全部条目**收 effect → 进入 hero profile 的 supportSignals → 消费层全量累加进 damage pool。即 M1 把**所有 rarity × 所有 slot** 的 loot 效果全部相加，等同「玩家每个槽位同时拥有全部 rarity」（不可能，玩家每槽只有一个 rarity）→ **理论上界高估**。

### 阶段 13 精细化策略

装备「曲线」实为**按 owned rarity 选取对应 loot effect**（不是连续曲线函数）：

1. **数据**：`UserProfileSnapshot.ownedHeroes[].lootBySlot: Record<slotId, {rarity, gild, enchant, ...}>` = 玩家每槽实际 rarity。
2. **映射**：按 (hero, slot, ownedRarity) 从 loot_defines 取该 loot 的 effect_string（而非全 rarity 求和）。
3. **multiplier**：`equipmentMult = Π(1 + ownedLootEffect/100)`（每槽一件，进 globalDpsMultiplier pool）。

### 已知缺口

- **loot-catalog 与 champion-details.loot 同源双路径**：`buildLootCatalog`（normalize-idle-champions-definitions）与 `normalizeChampionLoot`（normalize-champions）各自从 raw `loot_defines` 读取 (slot, rarity, effect)，当前数据一致（hero 1 两边均 24 条），但属两套代码路径，未来单边改动有漂移风险；理想态从 champion-details.loot 单源派生 catalog。
- **MVP 只算 global_dps**：`equipmentMult` / `theoreticalLootMult` 只计 `global_dps_multiplier_mult`；`hero_dps_multiplier_mult`（160 条，对 carry 自身 DPS 同为乘子）、`buff_upgrade` 等未纳入调整比。owned 装备若以 hero_dps 为主，调整比近似为 1（不下调），M1 hero_dps loot over-count 残留。留后续按 effect 维度分组精算。
- **gild / enchant 无曲线**：`game_rule_defines` 无 gilding/enchant 缩放曲线（服务端公式）。`OwnedHeroLootSlot.gild/enchant` 暂不建模，记缺口。
- **feat / legendary**：同 loot 结构（`detail.feats` / `detail.legendaryEffects`），M1 已全量进基线；13.2 按玩家实际选择的 feat（`OwnedHero.activeFeats`）和传奇等级（`OwnedHeroLegendarySlot.level`）裁剪。

---

## 14.4 ability_defines ult buff（uptime 核心 + pipeline 集成方案）

### 数据源（已确认）

`ability_defines`（10 条），结构 `{id, hero_ids, base_cooldown, duration, effect}`：
- 对齐：**id === hero_id**（`hero_ids` 数组为空，关联纯靠 id；`raw 无字段引用 ability_defines`）。
- `effect`：裸 effect_string（`effect_def,28`）或 JSON 串（`{"effect_string":"attack_speed_mult,100",...}`）。
- cooldown/duration：base_cooldown 900-7200 秒，duration 0-30 秒。
- DPS-relevant 信号（经 effect_def 展开）：Commander `global_dps_multiplier_mult,100`（全队 ×2）、Pact Weapon `hero_dps_multiplier_mult,100`、Cunning Action `attack_speed_mult,100`、Channel Divinity `buff_upgrades` 等。

### uptime 折算（已实现·纯函数）

`src/domain/simulator/ultUptime.ts`：
- `computeUltUptime(duration, baseCooldown, modronActive)` = `duration / base_cooldown`（modron 满级自动施放），上限 1；modron 未激活 / 参数非法 → 0（保守不计）。
- `foldUltBuffValue(value, uptime)` = `value × uptime`（steady-state 长期平均覆盖率）。
- 边界：steady-state 近似；step simulation（长期扩展）用逐窗口实际激活状态替代。7 测试。

### pipeline 集成方案（待执行·记留）

完整接入需三层数据流改动（风险高，本轮聚焦 uptime 核心，pipeline 集成留后续）：

1. **normalize 层**：`scripts/data/normalize-champions.ts` 按 id 对齐提取 `ability_defines[id]` → `champion-details.<id>.ability`（含 `effect` / `base_cooldown` / `duration`）。注意 `effect` 双形态（裸 string vs JSON 串），需 `normalizeEffectReference` 统一提取 `effect_string`。
2. **collect 层**：`scripts/data/effect-helpers.ts` 的 `collectRawEffectEntries` 新增第五源 `sourceBucket='ability'`，收集 `detail.ability` 的 effect_keys（经 effect_def 引用展开，复用现有 effect_def 解析）。
3. **uptime 折算**：build 层按 modron 节奏折算——`ultSignal.value = foldUltBuffValue(rawValue, computeUltUptime(duration, baseCooldown, modronActive))`，进对应 pool（global_dps→globalDpsMultiplier、hero_dps→heroDpsMultiplier、attack_speed→speed pool）。
4. **modron gating**：modron 未满级 → uptime=0 → ult buff 不进 pool（保守）。`modronActive` 由调用方按玩家 modron 状态传入。

执行前提：确认 ability id↔hero_id 对齐无歧义（10 条，可逐条核对 effect 与英雄 ult 名称）；接入后重跑 buildModels 同步 hero-abilities.json 产物；`data:signal-coverage` 验证 ability 源 signal 产出。





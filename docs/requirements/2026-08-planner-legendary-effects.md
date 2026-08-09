# planner 传奇装备效果接入

**优先级**：待评

## 是什么

将传奇装备的加成效果接入 planner 评分链路，使评分反映玩家已锻造的传奇装备贡献；同时提供锻造优先级建议——哪些英雄优先做传奇、哪些效果最值得升级。

## 背景

### 传奇装备是后期核心成长线

传奇（Legendary）是装备稀有度最高档，在常规四档之上。每个英雄 6 个装备槽，史诗装备可通过熔铸升级为传奇，获得额外传奇效果（调研 `legendary-forge.md`）。

- 熔铸消耗提亚马特鳞片，6 件全传奇总计 4500 鳞片
- 传奇效果可升级（上限 20 级），每级消耗鳞片 + 神眷
- 重铸可重新随机传奇效果

社区共识（Reddit 传奇攻略帖）：优先给核心辅助做传奇（NERDS、Blooshi、Artemis、Antrius、Valentine、Jim、Birdsong、Torogar、Strix、Zorbu 等），因为辅助的传奇效果是全队加成（`global_dps_multiplier_mult`），收益覆盖全阵型。

### 990 条传奇效果，两类加成

游戏数据 `champion-details/*.json` 的 `legendaryEffects` 数组，165 个英雄 × 6 槽 = 990 条效果。全部为伤害加成，只有两类：

| 效果类型 | effect key | 数量 | 作用 |
|---|---|---|---|
| 全队伤害加成 | `global_dps_multiplier_mult` | 499 条 | 作用于全阵型所有英雄 |
| 特定英雄伤害加成 | `hero_dps_multiplier_mult` | 491 条 | 作用于满足标签/属性条件的英雄 |

约 39%（382 条）带 `per_crusader` 条件叠加——阵型中每多一个满足条件的英雄效果叠一层。

关键：传奇效果使用与基础能力**完全相同的信号格式**（`effect_string` → `effect_key,amount`），可直接复用现有 effect 解析管线。

### 存档已导入但评分不消费

存档导入链路已完整支持传奇数据：

- `OwnedHero.legendaryBySlot: Record<string, OwnedHeroLegendarySlot>` — 每槽位的传奇等级 + 效果 ID
- `OwnedHero.legendaryEffects: string[]` — 已激活的传奇效果 ID 列表
- `UserProfileSnapshot.legendaryLevelCap: number` — 全局传奇等级上限

但 `buildScoringBonusInputs`（评分加成装配入口）完全不处理传奇数据——它处理装备（loot-catalog）、patron 特权、blessing、feat wrapper，唯独跳过了传奇效果。

### 数值影响

传奇效果的基础数值约 10%-150% per slot（`global_dps_multiplier_mult,100` = 全队 +100%）。6 件全传奇、全队加成型英雄的累积效果可达 6 × 100% = 全队 +600%——这是显著的 DPS 倍率，忽略它会让推荐结果严重低估拥有传奇装备的阵型。

升级等级放大效果值（每级提升固定百分比），20 级满级传奇的效果值约为 1 级的 2-3 倍。

## 需要做什么

### 阶段一：评分接入（存档驱动）

将已激活传奇效果注入评分链路：

1. 从 `OwnedHero.legendaryBySlot` 提取每个已锻造槽位的 `effectId` + `level`
2. 从 `champion-details` 的 `legendaryEffects` 查找 effect 定义（`effect_string` + `filter_targets` + `target_filters`）
3. 按 level 缩放效果值（每级增量 = base × level_scale，需确认升级曲线）
4. 注入 `buildScoringBonusInputs`：
   - `global_dps_multiplier_mult` → 合入 `equipmentGlobalDpsByHero`（per-hero addPercent，与装备同通道）
   - `hero_dps_multiplier_mult` + `filter_targets` → 合入 `externalHeroDpsContributions`（per-carry 条件生效）
   - `per_crusader` 叠加 → 阵型计数逻辑，复用 `per_tagged_crusader` 同构解析

与 loot effect 不同的是：loot effect 已 baked 进 `hero-abilities.json` 无条件评分（见 `loot-effects-double-counting.md`），而传奇效果是独立的附加层——只有玩家锻造了才生效，不进 hero-abilities 信号池。

### 阶段二：无存档假设配置

与装备假设配置（`synthesizeHypotheticalLootByHero`）同构：未导入存档时，允许用户假设「全英雄全槽传奇 N 级」，统一估算传奇加成。

### 阶段三：锻造优先级建议

回答「鳞片花在哪最值」：

- 遍历所有英雄的 `legendaryEffects` 候选池
- 按 `global_dps` vs `hero_dps` 分类，`per_crusader` 叠加潜力排序
- 结合当前阵型上下文（阵型中有多少英雄满足条件标签？）
- 输出「优先锻造 TOP 5 英雄」+ 每个英雄的预期 DPS 增量百分比

### 不做的部分

- **重铸建议**：重铸随机性太大，且数据中无概率分布，无法建模
- **神眷（Divine Favor）管理**：神眷类型与战役绑定，属账号管理范畴非阵型评估
- **传奇专长（Legendary Feats）**：传奇专长是独立系统（用鳞片升级专长），与传奇装备效果分开处理

## 已有基建

| 组件 | 位置 | 状态 |
|---|---|---|
| 传奇效果数据 | `champion-details/*.json` → `legendaryEffects` | ✅ 990 条，6 槽 × 165 英雄 |
| 存档导入 | `OwnedHeroLegendarySlot`（level, effectId, effectIds） | ✅ 已正常化 |
| 效果解析管线 | `effect_key,amount` 格式 | ✅ 与基础能力同构，可复用 |
| 评分加成装配 | `buildScoringBonusInputs` | ❌ 待新增传奇通道 |
| `global_dps` 通道 | `equipmentGlobalDpsByHero` | ✅ 可复用（per-hero addPercent） |
| `hero_dps` 通道 | `externalHeroDpsContributions` | ✅ 可复用（per-carry 条件） |
| 搜索索引 | `collectLegendaryEffects` in `build-search-index.ts` | ✅ 已抓取效果描述进搜索 |

## 为何暂缓

阶段一（评分接入）工程量中等：需要新建传奇效果提取 + level 缩放逻辑，但通道复用已有基建。**前置依赖**：需确认传奇升级曲线（每级效果增量百分比）——社区说 1→20 级总消耗约 35,589 鳞片，但每级的效果值增量公式需从数据或社区验证。

阶段三（锻造建议）是最有产品特色的部分，但依赖阶段一的评分能力才能算「锻造前后的 DPS 差值」。

## 关联

- 调研：`docs/research/gameplay/legendary-forge.md`（传奇装备与熔铸全貌）
- 社区来源：[Legendary Forge 101 — Reddit](https://www.reddit.com/r/idlechampions/comments/ppl9mg/legendary_forge_101_an_introduction/)、[Forge — Fandom Wiki](https://idlechampions.fandom.com/wiki/Forge)
- 代码：`src/domain/planner/scoringBonusInputs.ts`、`src/domain/user-profile/types.ts:12`（OwnedHeroLegendarySlot）
- 关联需求：`planner-capability-extensions.md`（手动参数子项——装备假设配置可扩展到传奇）

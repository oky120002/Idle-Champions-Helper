# 传奇装备与熔铸系统（Legendary Equipment & Forge）

**数据快照**：2026-08-08（165 个英雄 / champion-details 数据版本）
**可信度**：✅ 已确认 — 游戏数据 `legendaryEffects` 直证效果结构，社区来源确认熔铸/升级/重铸流程与货币。等级上限 20 和升级总成本来自社区，数据无法直接验证。

**社区来源**：
- [Legendary Forge 101 — Reddit](https://www.reddit.com/r/idlechampions/comments/ppl9mg/legendary_forge_101_an_introduction/)
- [Forge — Fandom Wiki](https://idlechampions.fandom.com/wiki/Forge)

## 机制

### 传奇装备是什么

传奇（Legendary）是装备稀有度的最高档，在常规四档（普通→稀有→史诗→传奇）之上。每个英雄有 6 个装备槽，史诗装备可通过**熔铸（Forge）**升级为传奇装备，获得额外的**传奇效果（Legendary Effect）**。

### 怎么获取：熔铸

熔铸在**传奇熔炉（Legendary Forge）**界面进行，消耗**提亚马特鳞片（Scales of Tiamat）**。鳞片来自**提亚马特山峰试炼（Trials of Mount Tiamat）**——限时开放的合作战役，完成可获得鳞片奖励。

熔铸成本按英雄递增：同一英雄第 1 件传奇花 500 鳞片，之后每多一件 +100 鳞片，6 件全传奇总计 4500 鳞片。

### 传奇效果如何作用

每件传奇装备附带一个传奇效果，全部为伤害加成，只有两类：

- **全队伤害加成**（`global_dps_multiplier_mult`，499 条）：作用于全阵型所有英雄。
- **特定英雄伤害加成**（`hero_dps_multiplier_mult`，491 条）：作用于满足标签/属性条件的英雄。

两类约各占一半，每英雄 6 个槽位中通常 3 个全队、3 个英雄定向。

部分效果带**条件叠加**（`stack_func: per_crusader`，382 条，约占 39%）：阵型中每多一个满足条件的英雄，效果叠一层。条件类型有三类：

- **标签条件**（`target_filters.type = "tags"`）：如"女性""矮人"等种族/性别标签。
- **属性条件**（`target_filters.type = "stat"`）：如力量 ≥ 15、敏捷 ≥ 15 等能力值门槛。
- **攻击类型条件**（`target_filters.type = "attack_type"`）：如近战、远程。

英雄定向加成（`hero_dps_multiplier_mult`）还附带 `filter_targets` 筛选谁能吃到加成，同样分 `by_tags`（264 条）、`stat_score`（199 条）、`attack_type`（28 条）。

**明斯克实例**（`champion-details/7.json` legendaryEffects，6 个槽位完整效果）：

| 槽 | 效果 | 条件 | 描述 |
|---|---|---|---|
| 1 | 全队 +10%/人 | per_crusader | 每名阵型英雄叠一层 |
| 2 | 男性英雄 +125% | filter: by_tags `male` | 仅男性英雄吃到 |
| 3 | 全队 +30%/人 | per_crusader + tags `human` | 每名人类英雄叠一层 |
| 4 | 力量≥13 英雄 +150% | filter: stat_score STR≥13 | 仅力量达标英雄吃到 |
| 5 | 全队 +40%/人 | per_crusader + stat CON≥15 | 每名体质达标英雄叠一层 |
| 6 | 近战英雄 +150% | filter: attack_type `melee` | 仅近战英雄吃到 |

### 升级与重铸

- **升级等级**：传奇效果可升级以增强数值，消耗鳞片 + **神眷（Divine Favor）**。神眷类型在熔铸时随机分配，与特定战役挂钩；每升一级要求更高的神眷门槛。从 1 级升到 20 级总计约 35,589 鳞片。等级上限最初为 10 级（成就系统追踪到 10 级里程碑），后续版本上调至 20 级。
- **重铸（Reforge）**：消耗鳞片重新随机该装备的传奇效果，同时重置神眷类型。用于追求更优效果组合或更换不理想的神眷类型。

## 数据源

### champion-details/*.json → legendaryEffects

每个英雄 JSON 顶层 `legendaryEffects` 数组，固定 6 条（对应 slotId 1-6），165 个英雄共 990 条。每条结构：

```
{ id, slotId, effects: [{ effect_string, targets, description, amount_func?, stack_func?, target_filters?, filter_targets? }] }
```

- `effect_string`：效果类型 + 基础数值，如 `global_dps_multiplier_mult,100`。
- `targets`：作用范围——`active_campaign`（全队）/ `all_slots`（特定英雄）。
- `target_filters`：条件叠加的判断条件（`tags` / `stat` / `attack_type`）。
- `filter_targets`：英雄筛选条件（`by_tags` 264 条 / `stat_score` 199 条 / `attack_type` 28 条）。

### loot-catalog.json

仅含 rarity 1-4（普通到史诗），**不含传奇数据**。传奇效果是独立于装备掉落的附加层，不进 loot-catalog。

### hero-abilities.json

不含传奇引用。传奇效果通过 `legendaryEffects` 字段独立携带，不混入 hero-abilities 信号池。

### trials.json

含试炼的角色（roles）、难度（difficulties）等元数据，是鳞片来源战役的结构化信息，不含传奇效果定义。

## 提取方法

传奇效果使用与基础能力相同的信号格式（`effect_string` → `effect_key,amount`），可直接复用现有 effect 解析管线：

- `global_dps_multiplier_mult` 与常规全队加成同构，加进 global buff pool 即可。
- `hero_dps_multiplier_mult` 与常规英雄定向加成同构，按 `filter_targets` 路由到对应英雄。
- `per_crusader` 条件叠加与阵型计数信号（如 per_tagged_crusader）同构。

注意：传奇效果是否计入评分取决于玩家是否拥有该传奇装备——数据中 `legendaryEffects` 列出的是所有可能效果的候选池，实际激活哪些由存档决定（玩家锻造了哪些槽位、升级到多少级）。

## 社区来源

- [Legendary Forge 101 — An Introduction (Reddit r/idlechampions)](https://www.reddit.com/r/idlechampions/comments/ppl9mg/legendary_forge_101_an_introduction/)
- [Forge — Idle Champions Wiki (Fandom)](https://idlechampions.fandom.com/wiki/Forge)
- [Forge Update — Steam Community Discussion](https://steamcommunity.com/app/627690/discussions/0/3767858814403754090/)
- [Trials of Mount Tiamat — Idle Champions Wiki (Fandom)](https://idlechampions.fandom.com/wiki/Trials_of_Mount_Tiamat)

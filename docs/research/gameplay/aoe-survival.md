# AoE 伤害防御机制

**数据快照**：2026-07-20（165 英雄）
**可信度**：⚠️ 待确认 — 四类机制分类有游戏数据支撑（`effect_string` + 描述文本扫描），但具体数值（免疫时长、减伤百分比）部分仅来自描述文本，未经实战验证

## 机制

部分 boss 和敌人会发动大面积（AoE）攻击，对全阵型造成高额伤害。如果阵型不够肉，一波 AoE 下来只剩一两个英雄站立，导致输出中断、阵型崩溃。

应对 AoE 的机制分四类，从强到弱：完全免疫 > 全队减伤 > 临时生命值/护盾 > 持续治疗。

## 四类防御机制

### 一、完全免疫（damage immunity）

让 AoE 打不伤，是最直接的对策。

| 效果模式 | 数据线索 | 描述关键词 |
|---|---|---|
| 每区域首击免疫 | `baldric_dark_bargain_eldath_handler` + `damage_reduction,100` targets:all | "immune to damage for X seconds after the first instance of damage" |
| 首次攻击免疫 | Mehen 被动，无标准 effect_string | "damage is prevented and the monster is stunned" |
| 复活+免疫 | Baeloth `revive_with_health_effect` 系列 | "back to life at 1HP and immune to all damage for X seconds" |
| 替死+免疫 | Strix 被动 | "about to be killed... instead loses... immune to all damage" |
| 大招全免 | Shadowheart `relic` 系列 | "prevents all damage to your Champions" |

**提取**：扫描 `effect_string` 中的 `damage_reduction,100` + `targets:["all"]` 组合，或描述文本中的 `immune to damage` / `prevents all damage`。多数为英雄专属命名效果，无统一 effect key。

### 二、全队减伤（damage reduction）

降低 AoE 的实际伤害。

| 效果模式 | effect_string | 描述关键词 |
|---|---|---|
| 百分比减伤 | `damage_reduction,<amount>` | "reduces the damage taken by... X%" |
| 固定减伤 | `fixed_damage_reduction_all_enemy_attacks,<amount>` | "take X less damage from all attacks" |
| 近战/远程减伤 | `damage_reduction_ranged,<amount>` | "take X% less damage from melee/ranged" |

在 `hero-abilities.json` 中归一化为 `damageReduction` 信号（9 例）。`amount` 是减免百分比或固定值。

**提取**：`hero-abilities.json` 的 `supportSignals[].kind == "damageReduction"` 可直接读取。条件型减伤（如「同列」「需要闪避层数」）在 `positionQualifier` 和 `stackFunc` 中体现。

### 三、临时生命值 / 护盾（temporary health）

给英雄多一层血条，扛过 AoE 后不影响本体血量。

| 效果模式 | 描述关键词 | 数据位置 |
|---|---|---|
| 全队临时 HP | "temporary health to the entire party" | 能力描述文本 |
| 列临时 HP | "temporary hit points" + 列范围 | 能力描述文本 |
| 石肤术 | `imoen_stoneskin` | effect_string |
| 偏折 | "deflect one attack" | 能力描述文本 |

**提取**：无统一 effect key，需扫描描述文本中的 `temporary health` / `temporary hit points` / `stoneskin` / `deflect` 等关键词。

### 四、持续治疗（healing）

AoE 过后把血线拉回来，保证下一波 AoE 前满血。

| 效果模式 | effect_string | 数据位置 |
|---|---|---|
| 阵型治疗 | `healing_mult,<amount>` | `hero-abilities.json` → `heroHealthMultiplier` 信号 |
| 全局治疗加成 | `global_healing_mult,<amount>` | 同上 → `globalHealthMultiplier` 信号 |
| 按秒回血 | 描述文本 "heals... for X health per second" | 能力描述文本 |

**提取**：`hero-abilities.json` 中 `heroHealthMultiplier`（3 例）和 `globalHealthMultiplier`（1 例）可直接读取。按秒回血类无标准信号，需从描述文本提取。`healing` 角色标签（`hero-abilities.json` → `roles`）可辅助定位治疗英雄。

## 数据源

| 数据文件 | 字段 / 信号 | 用途 |
|---|---|---|
| `hero-abilities.json` | `supportSignals[].kind == "damageReduction"`（9 例）| 全队减伤 |
| `hero-abilities.json` | `heroHealthMultiplier`（3 例）、`globalHealthMultiplier`（1 例）| 治疗 |
| `hero-abilities.json` | `roles` 含 `healing` | 治疗英雄标签 |
| `effect_string` | `damage_reduction,<amount>` / `damage_reduction,100` + `targets:["all"]` | 减伤 / 完全免疫 |
| `effect_string` | `fixed_damage_reduction_all_enemy_attacks,<amount>` | 固定减伤 |
| `effect_string` | `damage_reduction_ranged,<amount>` | 近战/远程减伤 |
| `effect_string` | `healing_mult,<amount>` / `global_healing_mult,<amount>` | 治疗 |
| `effect_string` | `imoen_stoneskin` | 石肤术 |
| 条件型减伤 | `positionQualifier`、`stackFunc` | 条件限定 |

完全免疫（damage immunity）和临时生命值（temporary health）类无统一 effect key，需扫描描述文本中的 `immune to damage` / `prevents all damage` / `temporary health` / `temporary hit points` / `stoneskin` / `deflect` 等关键词。

## 与 planner 的关系

当前 planner 的三个目标（DPS / 金币 / 速度）均不覆盖生存能力。阵型被 AoE 灭团时实际 DPS 归零，但模拟器不会反映这一点。生存维度的接入见需求库（待落库）。

## 社区来源

本文为游戏数据直接扫描，无社区来源。

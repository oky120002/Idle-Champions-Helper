# 点击伤害（Clicking / Click Damage）

**数据快照**：2026-08-10（effect-reference.json + game-rules.json）
**社区来源**：[Fandom Wiki: Clicking](https://idlechampions.fandom.com/wiki/Clicking)、[Fandom Wiki: BUD](https://idlechampions.fandom.com/wiki/Base_Ultimate_Damage)
**可信度**：⚠️ 待确认 — BUD 派生关系由社区+开发博客确认；`click_seconds` 精确换算系数在游戏数据中未找到对应字段，`DEFAULT_CLICK_SECONDS=1` 为 MVP 占位

## 机制

点击伤害（click damage）是玩家手动点击怪物造成的伤害。它是 BUD 的派生值，不参与阵型评估排序，仅作辅助展示。

### 与 BUD 的关系 ✅

- click damage = BUD × click_seconds（社区确认 + 开发博客 BUD 引入说明）
- wiki Clicking 页面为 stub，未提供精确的 click_seconds 值或公式细节
- 开发博客（DPS Updates & BUD）确认 BUD 引入前，点击伤害使用旧 DPS 平均值

### 相关效果族（effect-reference.json 直证）

| 效果 key | 说明 | 数据状态 |
|---|---|---|
| `click_damage` | 基础点击伤害 | 有效果定义，无 parser |
| `clicks` | 点击计数相关 | 有效果定义 |
| `global_click_damage_dps_percent` | 全局点击伤害占 DPS 百分比 | 有效果定义，`clearOnReset: true` |
| `critical_click_chance` | 暴击点击概率 | 有效果定义 |
| `critical_click_multiplier` | 暴击点击伤害倍率 | 有效果定义 |
| `click_damage_percent_max_health` | 点击伤害占怪物最大生命百分比 | 有效果实例（arg=1,2），用于特定英雄 |
| `highest_clicks_per_second` | 最高每秒点击数 | 有效果定义 |
| `total_critical_clicks` | 总暴击点击数 | 有效果定义 |
| `this_reset_distractions_clicked` | 本次重置点击的干扰物数 | 有效果定义 |

### game-rules.json 中的 click 设置

游戏数据 `game-rules.json` 未找到 `click_damage_settings` 相关 rule。`src/domain/simulator/clickDamage.ts` 注释记录了 raw `click_damage_settings` 存在 `{base_power:1, base_cost:50, cost_curve:1.7, power_curve:2.031}`，但该设置不在当前 definitions 快照中（可能在更原始的数据层）。

## 数据源

| 字段 | 位置 | 说明 |
|---|---|---|
| `click_damage` 效果族 | `effect-reference.json` | 9 个 click 相关效果 key |
| `click_damage_percent_max_health` | `effect-reference.json` | 按怪物最大生命百分比计的点击伤害 |
| BUD 参数 | `game-rules.json` rule 14 (`ultimate_damage_params`) | click damage 派生自 BUD |
| `computeClickDamage()` | `src/domain/simulator/clickDamage.ts` | `click_damage = BUD × clickSeconds`，clickSeconds 默认 1 |

## 已知缺口

1. **`click_seconds` 精确值**：click 与 BUD 的秒数换算系数在当前数据快照中无对应字段，`DEFAULT_CLICK_SECONDS=1` 为 MVP 占位
2. **click_damage_settings**：raw 设置 `{base_power, base_cost, cost_curve, power_curve}` 不在当前 definitions 快照中
3. **click 效果全部 No parser**：9 个 click 相关效果均未进入评估模型（设计如此——click 不参与阵型评估）

## 与 planner 的关系

click damage 明确不参与阵型评估/排序，仅作辅助参考值展示（`clickDamage.ts` 边界注释）。绝对值依赖 BUD 实测校准。

# 英雄详情：已确认可用字段

- 日期：2026-04-13
- 目标：回答“当前摘要数据缺什么”“官方 definitions 已经能稳定提供什么字段”。

## 当前摘要数据的缺口

`public/data/v1/champions.json` 当前只有：`id`、`name`、`seat`、`roles`、`affiliations`、`tags`、`portrait`。这足够做列表页和基础筛选，但不够支撑：角色卡资料、普攻 / 大招描述、升级轨道、天赋、皮肤、默认天赋槽解锁、availability / event / 时间门 / 商店状态，以及各类原始 `properties` 与曲线字段。

## 官方 definitions 已确认可用的字段

### `hero_defines`

可稳定拿到：

- 基础身份：`id`、`name`、`english_name`、`seat_id`
- 基础数值：`base_cost`、`base_damage`、`base_health`
- 战斗引用：`base_attack_id`、`ultimate_attack_id`
- 角色卡：`character_sheet_details.full_name / class / race / age / alignment / ability_scores / backstory`
- availability：`available_in_next_event`、`available_in_shop`、`available_in_time_gate`、`is_available`
- 时间字段：`date_available`、`last_rework_date`、`next_event_timestamp`
- 分类与扩展：`tags`、`event_name`、`event_upgrades`、`default_feat_slot_unlocks`
- 系统字段：`adventure_ids`、`cost_curves`、`health_curves`、`properties`
- 资产字段：`graphic_id`、`portrait_graphic_id`

### `attack_defines`

通过 `base_attack_id` 与 `ultimate_attack_id` 可补出：`name`、`description`、`long_description`、`cooldown`、`num_targets`、`aoe_radius`、`damage_modifier`、`damage_types`、`tags`、`target`、`animations`、`graphic_id`。

### `upgrade_defines`

按 `hero_id` 可拿到完整升级轨道，核心字段包括：`id`、`required_level`、`required_upgrade_id`、`name`、`upgrade_type`、`effect`、`static_dps_mult`、`default_enabled`，以及可选的 `specialization_name / specialization_description / specialization_graphic_id / tip_text`。

说明：很多升级没有展示名，它们本质上是数值里程碑；详情页应保留，但不能和命名能力升级混成同一视觉层级。`effect` 常见形态是 `effect_def,<id>`，可继续关联 `effect_defines`。

### `hero_feat_defines` 与 `hero_skin_defines`

- `hero_feat_defines`：按 `hero_id` 可拿到全部天赋：`id`、`order`、`name`、`description`、`rarity`、`graphic_id`、`effects`、`sources`、`properties`、`collections_source`。
- `hero_skin_defines`：按 `hero_id` 可拿到：`id`、`name`、`cost`、`details`、`rarity`、`properties`、`collections_source`、`availabilities`（部分皮肤）。

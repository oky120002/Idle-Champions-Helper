# 英雄详情：摘要缺口与核心字段

- 日期：2026-04-13
- 目标：回答“当前摘要数据缺什么”“`hero_defines` 和攻击字段能补到什么”。

## 当前摘要数据的缺口

`public/data/v1/champions.json` 当前只有：`id`、`name`、`seat`、`roles`、`affiliations`、`tags`、`portrait`。这足够做列表页和基础筛选，但不够支撑：角色卡资料、普攻 / 大招描述、升级轨道、天赋、皮肤、默认天赋槽解锁、availability / event / 时间门 / 商店状态，以及各类原始 `properties` 与曲线字段。

## `hero_defines`

可稳定拿到：基础身份 `id / name / english_name / seat_id`，基础数值 `base_cost / base_damage / base_health`，战斗引用 `base_attack_id / ultimate_attack_id`，角色卡 `character_sheet_details.*`，availability 字段，时间字段，分类与扩展字段，以及 `graphic_id / portrait_graphic_id` 等资产字段。

## `attack_defines`

通过 `base_attack_id` 与 `ultimate_attack_id` 可补出：`name`、`description`、`long_description`、`cooldown`、`num_targets`、`aoe_radius`、`damage_modifier`、`damage_types`、`tags`、`target`、`animations`、`graphic_id`。

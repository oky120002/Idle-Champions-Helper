# 英雄详情页数据字段调研

- 日期：2026-04-13
- 目标：确认当前仓库是否已具备“英雄详情页”所需数据，以及详情数据应如何组织
- 当前有效性：基于 2026-04-13 当天抓取的官方 definitions 快照，当前仍有效

## 结论

- 当前 `public/data/v1/champions.json` 只覆盖英雄摘要，不足以直接支撑详情页
- 官方 definitions 已提供大部分详情所需信息：角色卡、攻击、升级、天赋、皮肤和大量系统字段，不需要额外依赖第三方站点
- 推荐新增按英雄拆分的静态详情文件：
  - 摘要继续留在 `public/data/<version>/champions.json`
  - 详情写到 `public/data/<version>/champion-details/<hero-id>.json`
- 详情文件应同时提供两层内容：
  - 结构化层：正常浏览所需的重点区块
  - 原始快照层：source / localized 片段，保证“所有信息”可达

## 当前摘要数据的缺口

`public/data/v1/champions.json` 当前只有：`id`、`name`、`seat`、`roles`、`affiliations`、`tags`、`portrait`。这足够做列表页和基础筛选，但不够支撑：

- 角色卡资料
- 普攻 / 大招描述
- 升级轨道
- 天赋
- 皮肤
- 默认天赋槽解锁
- availability / event / 时间门 / 商店状态
- 各类原始 `properties` 与曲线字段

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

通过 `base_attack_id` 与 `ultimate_attack_id` 可补出：`name`、`description`、`long_description`、`cooldown`、`num_targets`、`aoe_radius`、`damage_modifier`、`damage_types`、`tags`、`target`、`animations`、`graphic_id`

### `upgrade_defines`

按 `hero_id` 可拿到完整升级轨道，核心字段包括：`id`、`required_level`、`required_upgrade_id`、`name`、`upgrade_type`、`effect`、`static_dps_mult`、`default_enabled`，以及可选的 `specialization_name / specialization_description / specialization_graphic_id / tip_text`

说明：很多升级没有展示名，它们本质上是数值里程碑；详情页应保留，但不能和命名能力升级混成同一视觉层级。`effect` 常见形态是 `effect_def,<id>`，可继续关联 `effect_defines`。

### `hero_feat_defines`

按 `hero_id` 可拿到全部天赋：`id`、`order`、`name`、`description`、`rarity`、`graphic_id`、`effects`、`sources`、`properties`、`collections_source`

### `hero_skin_defines`

按 `hero_id` 可拿到：`id`、`name`、`cost`、`details`、`rarity`、`properties`、`collections_source`、`availabilities`（部分皮肤）

## 推荐数据合同

`public/data/<version>/champion-details/<hero-id>.json` 建议拆成：

- 结构化层：英雄摘要、availability、角色卡、普攻 / 大招、事件升级、升级轨道、天赋、皮肤、关键系统字段
- 原始快照层：`hero`、`attacks`、`upgrades`、`feats`、`skins` 的 source / localized 快照片段；若升级已关联 `effect_defines`，也可补解析结果

这样能同时避免两种坏结果：只做漂亮摘要但细节缺失，或直接把大块 JSON 平铺到页面破坏可读性。

## 页面信息架构建议

详情页更适合做“战术档案页”，分成：顶部摘要、角色卡、战斗信息、进阶与成长、天赋与皮肤、系统字段与原始快照。原始快照应放在页面后半段，并通过折叠区块降低默认噪音。

## 外部参考的使用边界

用户给出的 Byteglow / Kleho 详情页可作为“高信息密度详情页”的方向参考。但当前环境无法稳定以浏览器方式复核其完整可视布局，所以本次结论主要来自官方 definitions 字段核对和用户需求，而不是声称“可完整复刻竞品页面”。

## 关键依据

- `public/data/v1/champions.json`
- `scripts/fetch-idle-champions-definitions.mjs`
- `scripts/normalize-idle-champions-definitions.mjs`
- 本次抓取的 source / localized definitions 快照
- 用户提供的参考链接

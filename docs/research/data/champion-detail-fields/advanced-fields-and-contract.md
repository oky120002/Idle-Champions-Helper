# 英雄详情：进阶字段与数据合同

- 日期：2026-04-13
- 目标：沉淀升级 / 天赋 / 皮肤字段，以及详情文件推荐合同和页面结构建议。

## 进阶字段

- `upgrade_defines`：按 `hero_id` 可拿到完整升级轨道，核心字段包括 `id`、`required_level`、`required_upgrade_id`、`name`、`upgrade_type`、`effect`、`static_dps_mult`、`default_enabled`，以及可选的 `specialization_*` 与 `tip_text`。
- `hero_feat_defines`：按 `hero_id` 可拿到全部天赋：`id`、`order`、`name`、`description`、`rarity`、`graphic_id`、`effects`、`sources`、`properties`、`collections_source`。
- `hero_skin_defines`：按 `hero_id` 可拿到：`id`、`name`、`cost`、`details`、`rarity`、`properties`、`collections_source`、`availabilities`（部分皮肤）。

说明：很多升级没有展示名，它们本质上是数值里程碑；详情页应保留，但不能和命名能力升级混成同一视觉层级。

## 推荐数据合同与页面结构

`public/data/<version>/champion-details/<hero-id>.json` 建议拆成：结构化层（英雄摘要、availability、角色卡、普攻 / 大招、事件升级、升级轨道、天赋、皮肤、关键系统字段）和原始快照层（`hero`、`attacks`、`upgrades`、`feats`、`skins` 的 source / localized 片段）。

详情页更适合做“战术档案页”，分成：顶部摘要、角色卡、战斗信息、进阶与成长、天赋与皮肤、系统字段与原始快照。原始快照应放在页面后半段，并通过折叠区块降低默认噪音。

## 外部参考边界

用户给出的 Byteglow / Kleho 详情页可作为“高信息密度详情页”的方向参考；但本次结论主要来自官方 definitions 字段核对和用户需求，而不是声称“可完整复刻竞品页面”。

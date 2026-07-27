# 英雄详情：进阶字段事实

- 作用：沉淀官方 definitions 里升级 / 天赋 / 皮肤字段的实际落点，供详情页核对。
- 详情数据合同（结构化层 + 原始快照层）与页面信息架构已落定，见 `specs/modules/champions/detail/interaction-and-data.md` 与 `specs/modules/champions/detail/page-structure.md`；本文件只保留字段事实。

## 进阶字段

- `upgrade_defines`：按 `hero_id` 可拿到完整升级轨道，核心字段包括 `id`、`required_level`、`required_upgrade_id`、`name`、`upgrade_type`、`effect`、`static_dps_mult`、`default_enabled`，以及可选的 `specialization_*` 与 `tip_text`。
- `hero_feat_defines`：按 `hero_id` 可拿到全部天赋：`id`、`order`、`name`、`description`、`rarity`、`graphic_id`、`effects`、`sources`、`properties`、`collections_source`。
- `hero_skin_defines`：按 `hero_id` 可拿到：`id`、`name`、`cost`、`details`、`rarity`、`properties`、`collections_source`、`availabilities`（部分皮肤）。

说明：很多升级没有展示名，它们本质上是数值里程碑；详情页应保留，但不能和命名能力升级混成同一视觉层级。

## 外部参考边界

Byteglow / Kleho 详情页可作为“高信息密度详情页”的方向参考；但本仓库的详情合同与页面结构主要来自官方 definitions 字段核对和用户需求，而不是声称“可完整复刻竞品页面”，且当前环境无法稳定复核竞品完整可视布局。

# 魔宠目录：获取方式字段与归类事实

- 作用：沉淀“获取方式”字段在 definitions 里的落点与可解释归类。
- 仓库实现（独立同步脚本、SkelAnim 合成 PNG、卡片展示获取方式摘要、不混入 skin）已落地，见 `specs/modules/pets/pets-page-design.md`；本文件只留字段与归类事实。

## 获取方式字段

`familiar_defines[*].collections_source.type` 当前分布（合计 341 条）：`flash_sale` 229、`dlc` 70、`not_yet_available` 12、`gems` 11、`patron` 5、`giveaway` 1、空字符串/空对象 13。

补充核对后，不能只依赖 `collections_source`：`premium_item_defines` 中有 `302` 条 `effect.type = familiar`，覆盖 `298` 个独立 familiar_id；`patron_shop_item_defines` 中有 `5` 条 `effect.type = familiar`。

## 当前可解释归类

与 `pets.json` 的 `acquisition.kind` 对齐的稳定归类（当前数据共 4 类：`premium` 313、`gems` 11、`not-yet-available` 12、`patron` 5）：

1. `premium`（含 DLC / 主题包 / Familiar Pack / 限时闪促；3 条 `sourceType=null` 也归此类）
2. `gems`（宝石商店）
3. `patron`（赞助者商店）
4. `not-yet-available`（暂未开放）

补充说明：`flash_sale` 更接近”限时付费来源”，不应直接解释成抽奖；`patron` 还可以从 `patron_shop_item_defines` 里补出成本和影响力门槛；`sourceType=null` 的条目仍可通过 `cost.premium_item` 和 `premium_item_defines.effect` 命中实际礼包，因此归入 `premium` 而非”来源待确认”。页面层的完整归类规则（含 `unknown` 兜底）见 `specs/modules/pets/pets-page-design.md`。

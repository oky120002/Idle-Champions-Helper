# 宠物目录：获取方式与仓库实现

- 目标：沉淀“获取方式”应该怎么解释，以及本仓库如何实现这个目录。

## 获取方式字段

`familiar_defines[*].collections_source.type` 截至 2026-04-16 的快照分布：`flash_sale` 180、`dlc` 60、`none / 空对象` 42、`not_yet_available` 25、`gems` 11、`patron` 5。当前数据已变化为合计 331 条，分布为：`flash_sale` 229、`dlc` 70、`not_yet_available` 12、`gems` 11、`patron` 5、`sourceType=null` 3、`giveaway` 1（新增 `giveaway` 类型）。

补充核对后，不能只依赖 `collections_source`：`premium_item_defines` 中有 `290` 条 `effect.type = familiar`，其中 `279` 只宠物能命中至少一个 premium item；`patron_shop_item_defines` 中有 `5` 条 `effect.type = familiar`。

## 当前可解释归类

适合作为页面层展示的稳定归类（与 `pets.json` 的 `acquisition.kind` 对齐，共 4 类）：

1. `premium`（含 DLC / 主题包 / Familiar Pack / 限时闪促；3 条 `sourceType=null` 也归此类）
2. `gems`（宝石商店）
3. `patron`（赞助商商店）
4. `not-yet-available`（暂未开放）

补充说明：`flash_sale` 更接近”限时付费来源”，不应直接解释成抽奖；`patron` 还可以从 `patron_shop_item_defines` 里补出成本和影响力门槛；`sourceType=null` 的条目仍可通过 `cost.premium_item` 和 `premium_item_defines.effect` 命中实际礼包，因此归入 `premium` 而非”来源待确认”。

## 仓库实现

1. 新增独立脚本把宠物目录和图像一起写入 `public/data/<version>/pets.json` 与 `public/data/<version>/pets/`
2. 脚本内直接复用 `SkelAnim` 渲染链路，把宠物图标与 4x 立绘都离线合成为单张 PNG
3. 页面运行时只读本地 PNG，继续满足 GitHub Pages 静态站约束
4. 首版只上宠物本体，不把 `familiar_skin_defines` 混入主目录
5. 页面卡片显示“获取方式摘要 + 细节”，不直接暴露原始 JSON 结构给用户

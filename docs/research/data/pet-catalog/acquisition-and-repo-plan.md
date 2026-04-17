# 宠物目录：获取方式与仓库落地

- 日期：2026-04-16
- 目标：沉淀“获取方式”应该怎么解释，以及本仓库首版怎样落这个目录。

## 获取方式字段

`familiar_defines[*].collections_source.type` 当前出现的类型分布：`flash_sale` 180、`dlc` 60、`none / 空对象` 42、`not_yet_available` 25、`gems` 11、`patron` 5。

补充核对后，不能只依赖 `collections_source`：`premium_item_defines` 中有 `290` 条 `effect.type = familiar`，其中 `279` 只宠物能命中至少一个 premium item；`patron_shop_item_defines` 中有 `5` 条 `effect.type = familiar`。

## 当前可解释归类

适合作为页面层展示的稳定归类：

1. 宝石商店
2. 赞助商商店
3. 购买（DLC / 主题包 / Familiar Pack / 限时闪促）
4. 暂未开放
5. 来源待确认

补充说明：`flash_sale` 更接近“限时付费来源”，不应直接解释成抽奖；`patron` 还可以从 `patron_shop_item_defines` 里补出成本和影响力门槛；一部分 `collections_source` 为空，但仍可通过 `cost.premium_item` 和 `premium_item_defines.effect` 命中实际礼包。

## 对本仓库的直接落地建议

1. 新增独立脚本把宠物目录和图像一起写入 `public/data/<version>/pets.json` 与 `public/data/<version>/pets/`
2. 脚本内直接复用 `SkelAnim` 渲染链路，把宠物图标与 4x 立绘都离线合成为单张 PNG
3. 页面运行时只读本地 PNG，继续满足 GitHub Pages 静态站约束
4. 首版只上宠物本体，不把 `familiar_skin_defines` 混入主目录
5. 页面卡片显示“获取方式摘要 + 细节”，不直接暴露原始 JSON 结构给用户

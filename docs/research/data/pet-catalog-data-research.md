# 宠物目录数据研究

- 调研日期：2026-04-16
- 结论状态：当前结论基于当天抓取的官方 definitions 快照，适用于本仓库宠物图鉴首版实现。

---

## 1. 官方字段落点

使用官方 definitions 快照核对后，宠物相关字段集中在：

- `familiar_defines`：宠物主表
- `familiar_skin_defines`：宠物皮肤表
- `premium_item_defines`：付费包与主题包映射
- `patron_shop_item_defines`：赞助商商店来源
- `patron_defines`：赞助商与货币名
- `graphic_defines`：图像资源路径

其中：

- `familiar_defines` 当前共有 `323` 条
- `familiar_skin_defines` 当前共有 `14` 条

---

## 2. 图像字段

`familiar_defines` 已确认可用字段：

- `graphic_id`：宠物图标 / 基础图
- `properties.xl_graphic_id`：4x 立绘槽位

2026-04-16 当天快照中：

- 有效 `graphic_id`：`319` 条
- 有效 `xl_graphic_id`：`319` 条
- 缺图像槽位：`4` 条（当前 definitions 返回 `0`）

资源路径位于 `graphic_defines[*].graphic`，实际路径前缀主要是 `Familiars/...`，少量会落在 `Escorts/...`。

样本抓取确认：

- `Familiars/*` / `Escorts/*` 资源都可从官方 `mobile_assets` 获取
- 2026-04-16 这批有图宠物的 `graphic_id` 与 `xl_graphic_id` 在快照里 **全部都是 `graphic_defines.type = 3`**
- 这类资源并不是“直接可用的一张 PNG”，而是 **zlib 容器里的 `SkelAnim` 分件动画数据**
- 因此宠物图标与宠物立绘都不能只做 deflate 解包；构建期必须继续做 `SkelAnim` pose 合成，输出站内最终 PNG

---

## 3. 获取方式字段

`familiar_defines[*].collections_source.type` 当前出现的类型分布：

- `flash_sale`: `180`
- `dlc`: `60`
- `none / 空对象`: `42`
- `not_yet_available`: `25`
- `gems`: `11`
- `patron`: `5`

补充核对后，不能只依赖 `collections_source`：

- `premium_item_defines` 中有 `290` 条 `effect.type = familiar`
- 其中 `279` 只宠物能命中至少一个 premium item
- `patron_shop_item_defines` 中有 `5` 条 `effect.type = familiar`

因此页面侧的“获取方式”应采用多表合并，而不是单看 `collections_source.type`。

---

## 4. 当前可解释归类

适合作为页面层展示的稳定归类：

1. 宝石商店
2. 赞助商商店
3. 购买（DLC / 主题包 / Familiar Pack / 限时闪促）
4. 暂未开放
5. 来源待确认

补充说明：

- `flash_sale` 在当前快照里更接近“限时付费来源”，不应直接解释成抽奖。
- `patron` 还可以从 `patron_shop_item_defines` 里补出成本和影响力门槛。
- 一部分 `collections_source` 为空，但仍可通过 `cost.premium_item` 和 `premium_item_defines.effect` 命中实际礼包。

---

## 5. 对本仓库的直接落地建议

1. 新增独立脚本把宠物目录和图像一起写入 `public/data/<version>/pets.json` 与 `public/data/<version>/pets/`。
2. 脚本内直接复用 `SkelAnim` 渲染链路，把宠物图标与 4x 立绘都离线合成为单张 PNG。
3. 页面运行时只读本地 PNG，继续满足 GitHub Pages 静态站约束。
4. 首版只上宠物本体，不把 `familiar_skin_defines` 混入主目录。
5. 页面卡片显示“获取方式摘要 + 细节”，不直接暴露原始 JSON 结构给用户。

# 宠物图鉴页设计稿

- 生效日期：2026-04-16
- 当前状态：首版实现已落地，页面入口为 `src/pages/PetsPage.tsx`，导航页签为 `宠物图鉴`。

---

## 1. 目标

在现有静态站、local-first、GitHub Pages 兼容前提下，补一个可稳定浏览全部宠物的页签，满足三件事：

1. 查看系统里的全部宠物。
2. 同时看到宠物图标与立绘。
3. 直接知道宠物怎么入手，而不是只给原始字段。

---

## 2. 页面范围

当前页只覆盖宠物本体（`familiar_defines`），不把 `familiar_skin_defines` 的换皮皮肤混进主列表。

首版卡片必须展示：

- 宠物名（中英双字段）
- 主要描述
- 图标
- 立绘
- 获取方式摘要
- 来源细节（例如宝石数、赞助商、礼包名）
- 当前 definitions 是否已启用

当前不做：

- 宠物皮肤图鉴
- 宠物效果机制说明
- 宠物最佳用法推荐
- 宠物来源的历史时间线

---

## 3. 数据口径

页面运行时只读站内静态资源：

- `public/data/<version>/pets.json`
- `public/data/<version>/pets/icons/*.png`
- `public/data/<version>/pets/illustrations/*.png`

数据构建期来源：

- `familiar_defines`：宠物本体、图标 graphic、XL 立绘 graphic、基础来源标记
- `premium_item_defines`：付费包 / 主题包 / Familiar Pack 映射
- `patron_shop_item_defines`：赞助商商店价格与影响力门槛
- `patron_defines`：赞助商名称与货币名
- `graphic_defines`：图像路径定位

---

## 4. 获取方式归类

页面层只做可解释归类，不做“神秘原始字段直出”：

- `gems` -> 宝石商店
- `patron` -> 赞助商商店
- `premium` -> 购买（再细分成 DLC / 主题包 / Familiar Pack / 限时闪促）
- `not-yet-available` -> 暂未开放
- `unknown` -> 来源待确认

说明：

- 付费来源优先结合 `premium_item_defines` 给出可读礼包名。
- `flash_sale` 但未命中固定 premium item 时，明确标为“购买 · 限时闪促”，不伪装成抽奖。
- 赞助商来源补展示货币成本和影响力门槛。

---

## 5. 视觉与交互

- 卡片顶部用立绘做主舞台，左下角叠放图标，不拆成两张并列小图，优先保扫描效率。
- 筛选区保留三类操作：搜索、来源过滤、图像完整度过滤。
- 移动端不允许横向滑动导航或横向筛选条；筛选区不足宽时改为纵向堆叠。
- 缺图宠物仍必须可见，并用明确空状态说明“当前 definitions 没有可用图像槽位”。

---

## 6. 当前实现落点

- 页面：`src/pages/PetsPage.tsx`
- 路由与导航：`src/app/App.tsx`
- 类型：`src/domain/types.ts`
- 样式：`src/styles/global.css`
- 数据脚本：`scripts/sync-idle-champions-pets.mjs`
- 构建入口：`scripts/build-idle-champions-data.mjs`


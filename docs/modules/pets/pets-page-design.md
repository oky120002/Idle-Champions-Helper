# 宠物图鉴页设计稿

- 生效日期：2026-04-16
- 当前状态：首版实现已落地，页面入口为 `src/pages/PetsPage.tsx`，导航页签为 `宠物图鉴`。
- 页面壳层：宠物页当前桌面端已纳入全站页面工作台规范；小导航、左右结构、滚动与动效细节见 `docs/modules/shared-components/page-workbench-design.md`。

## 目标

在静态站、local-first、GitHub Pages 兼容前提下，补一个可稳定浏览全部宠物的页签，让用户能：

1. 查看系统里的全部宠物
2. 同时看到图标与立绘
3. 直接知道宠物怎么入手，而不是只看原始字段

## 页面范围

当前只覆盖宠物本体 `familiar_defines`，不把 `familiar_skin_defines` 换皮皮肤混进主列表。

首版卡片必须展示：宠物名（中英双字段）、主要描述、图标、立绘、获取方式摘要、来源细节、当前 definitions 是否已启用。

当前不做：宠物皮肤图鉴、宠物效果机制说明、最佳用法推荐、来源历史时间线。

## 数据口径

页面运行时只读站内静态资源：

- `public/data/<version>/pets.json`
- `public/data/<version>/pets/icons/*.png`
- `public/data/<version>/pets/illustrations/*.png`

构建期来源：`familiar_defines`、`premium_item_defines`、`patron_shop_item_defines`、`patron_defines`、`graphic_defines`。

补充说明：宠物 `graphic_id` 与 `properties.xl_graphic_id` 当前主链路同样是 `SkelAnim` 分件资源，不是直接可展示的整张 PNG；因此 `scripts/sync-idle-champions-pets.mjs` 必须在构建期完成 pose 合成，再把图标与立绘写成站内静态 PNG。

## 获取方式归类

页面层只做可解释归类，不直出神秘原始字段：

- `gems` -> 宝石商店
- `patron` -> 赞助商商店
- `premium` -> 购买（再细分 DLC / 主题包 / Familiar Pack / 限时闪促）
- `not-yet-available` -> 暂未开放
- `unknown` -> 来源待确认

规则：付费来源优先结合 `premium_item_defines` 给可读礼包名；`flash_sale` 但未命中固定 premium item 时，明确标为“购买 · 限时闪促”；赞助商来源补展示货币成本和影响力门槛。

## 视觉与交互

- 卡片顶部用立绘做主舞台，左下角叠放图标，不拆成两张并列小图
- 筛选区保留搜索、来源过滤、图像完整度过滤三类操作
- 移动端不允许横向滑动导航或横向筛选条；空间不足时改为纵向堆叠
- 缺图宠物仍必须可见，并明确说明“当前 definitions 没有可用图像槽位”

## 当前实现落点

- 页面：`src/pages/PetsPage.tsx`
- 路由与导航：`src/app/App.tsx`
- 类型：`src/domain/types.ts`
- 样式：`src/styles/global.css`
- 数据脚本：`scripts/sync-idle-champions-pets.mjs`
- 构建入口：`scripts/build-idle-champions-data.mjs`

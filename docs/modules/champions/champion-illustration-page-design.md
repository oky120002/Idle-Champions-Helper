# 英雄立绘页设计稿

- 日期：2026-04-15
- 作用：本页只做立绘页设计入口；细节已拆到 `docs/modules/champions/illustration/`。
- 当前结论：主方案不能依赖浏览器运行时直连官方 `mobile_assets`；最优路径是构建期抓取、解包、渲染并发布站内静态衍生图，运行时只读本地资源。
- 页面壳层：立绘页当前桌面端已纳入全站页面工作台规范；小导航、左右结构、滚动与动效细节见 `docs/modules/shared-components/page-workbench-design.md`。

## 先读哪篇

- 页面口径、范围边界与为何必须走构建期衍生图：`docs/modules/champions/illustration/scope-and-boundaries.md`
- 数据与目录设计、构建流水线、体积守门：`docs/modules/champions/illustration/data-and-build.md`
- 运行时策略、非目标、实施拆分与验收：`docs/modules/champions/illustration/runtime-and-acceptance.md`
- 当前全站页面工作台结构基线：`docs/modules/shared-components/page-workbench-design.md`

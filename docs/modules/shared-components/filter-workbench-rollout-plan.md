# 全站工作台统一推广计划

- 日期：2026-04-22
- 作用：把 `Champions` 已验证的工作台壳层升级为全站统一页面结构，并作为后续实现、复核与清理旧实现的单一事实源。
- 起点设计：`docs/modules/champions/filter/workbench-shell-redesign-design.md`

## 已锁产品决策

- 全站桌面端统一进入工作台模式：上方全站导航 + 下方工作台壳层。
- 覆盖页面：`Champions / Illustrations / Pets / Variants / Formation / Presets / User Data / Champion Detail`。
- 左右结构是统一壳层语义；当前没有左栏的页面直接隐藏左栏，不再维护额外单栏页面体系。
- 英雄详情页返回入口从导航迁到页面工具条；导航 leading slot 路线直接退役。
- 复制当前链接作为全站工作台工具条稳定动作保留；不复制滚动位置和抽屉开合状态。
- 当前未上生产，允许破坏性重构；旧实现直接删除，不保留兼容层。

## 共享组件与实现边界

- `PageWorkbenchShell` 是全站唯一工作台壳层。
- `src/components/workbench/` 负责：壳层、抽屉持久化、筛选页右区滚动恢复、通用悬浮返回顶部、复制链接。
- `src/components/filter-sidebar/` 只保留筛选字段组件与筛选视觉基元，不再承载页面壳层职责。
- `isWorkbenchRoute` 统一覆盖全部工作台页面和 `/champions/:championId` 详情页；桌面锁滚、头部紧凑与主内容高度锁定统一挂在这条路由判定上。
- 不改各页核心业务阅读模型、筛选规则、结果卡契约和 GitHub Pages / HashRouter 兼容方式。

## 页面归位映射

| 页面 | 左顶部区 | 左主体区 | 右顶部区 | 右主体区 |
| --- | --- | --- | --- | --- |
| Champions | 条件 badge、清空、提示 | 现有 champions 筛选组件 | 标题、metrics、筛选摘要、显示全部/随机/复制链接 | 视觉档案、结果卡、空态 |
| Illustrations | 条件 badge、清空、提示 | 现有立绘筛选组件 | 标题、metrics、筛选摘要、显示全部/随机/复制链接 | 立绘结果网格、空态 |
| Pets | 条件 badge、清空、提示 | 现有宠物筛选组件 | 标题、metrics、筛选摘要、显示全部/随机/复制链接 | 宠物结果网格、空态 |
| Variants | 条件 badge、清空、提示 | 现有变体筛选组件 | 标题、metrics、筛选摘要、显示全部/复制链接 | campaign / adventure 分组结果、空态 |
| Formation | 布局状态、提示 | 布局搜索、场景类型、当前布局摘要、布局库 | 标题、当前布局、已放置英雄数、复制链接 | 草稿提示、画板编辑、阵型摘要、保存方案 |
| Presets | 隐藏 | 隐藏 | 标题、总数、可恢复数、复制链接 | 范围说明、方案列表、空态 / 编辑 / 删除 / 恢复 |
| User Data | 隐藏 | 隐藏 | 标题、当前导入方式、解析状态、复制链接 | 导入边界、导入工作台、下一阶段说明 |
| Champion Detail | 隐藏 | 隐藏 | 返回入口、标题、当前章节、复制链接 | 卷宗头部、章节内容、详情侧栏 |

## 滚动与交互统一规则

- 桌面端：工作台使用固定可视高度；有左栏页面左右内滚，无左栏页面只保留右区主滚动。
- 筛选页继续沿用右区滚动恢复：筛选变更后回到摘要区顶部，随机排序不强制回顶。
- 非筛选页统一支持右区悬浮 `返回顶部`；整页 `window` 不再承担主滚动。
- `Illustrations` 与 `Champions` 保留从英雄详情返回时恢复 query 与右区滚动位置。
- `Champion Detail` 继续保留 `returnTo / returnLabel` 语义，复制链接时带当前 `query + section hash`。
- 移动端继续退化为普通单列网页滚动，不维持桌面工作台高度锁定。

## 清理策略

- 直接删除旧 `filter-*` 壳层命名、旧类名、旧样式与旧测试前提，不保留双轨实现。
- 退役目标包括：`FilterSidebarLayout`、`FilterSidebarToolbar`、`FilterWorkbenchShell`、`WorkbenchResultsFloatingTopButton`、旧 `filter-workspace*` 结构与样式。
- 仅服务导航返回入口的 `ChampionDetailNavBackLink`、`site-nav-leading-slot` 及其配套样式一并删除。
- 非必要的 `page-stack + SurfaceCard` 页面外壳全部拆除；页面工具条与工作台壳层成为统一顶层结构。

## 验收标准

- 全站路由在桌面端都进入统一工作台壳层，头部默认紧凑、整页锁滚。
- 有左栏页面支持抽屉开合持久化；无左栏页面不渲染 toggle、pane、gutter。
- 详情页返回入口只存在于工具条，不再出现在导航。
- 仓库内不再保留旧壳层组件、旧命名样式和旧导航返回 slot 路线。

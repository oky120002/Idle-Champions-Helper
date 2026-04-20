# styles 入口

- 先读 `src/styles/global.css`，只看 layer 顺序和导入清单，不读实现细节。
- `foundations/` 只放 token、reset、元素级默认样式。
- `app/` 只放站点壳层；`site-header/` 和 `navigation/` 已按基础、状态、响应式拆开。
- `shared/` 只放跨页面稳定契约；`surfaces/`、`filters/`、`results/`、`formation/` 都按“基础块 / 场景块 / 响应式”拆分。
- `components/` 放组件私有样式；`pages/` 放页面私有样式。

## 读取顺序

- 站点头部：`src/styles/app/site-header/shell.css` -> `src/styles/app/site-header/condensed.css` -> `src/styles/app/site-header/responsive.css`
- 主导航：`src/styles/app/navigation/base.css` -> `src/styles/app/navigation/motion.css` -> `src/styles/app/navigation/responsive.css`
- 通用表面：`src/styles/shared/surfaces/panels.css` -> `page-tab-header.css` -> `page-header-metrics.css` -> `section-primitives.css` -> `responsive.css`
- 筛选：`src/styles/shared/filters/base.css` -> `active-filter-bar.css` -> `sidebar.css` -> `disclosure.css`
- 结果卡：`src/styles/shared/results/layout.css` -> `avatar.css` -> `card.css` -> `responsive.css`
- 阵型：`src/styles/shared/formation/library.css` -> `board.css` -> `mobile-editor.css` -> `responsive.css`
- 英雄详情：`src/styles/pages/champion-detail/shell.css` -> `dossier.css` -> `sections.css` -> `upgrades.css` -> `feats.css` -> `media.css`

## 约束

- 共享样式优先按“基础块 / 场景块 / 响应式”拆，不为省几行 CSS 把多类选择器重新塞回一个大文件。
- 同一个 `@media` 同时修改多个子块时，允许集中到当前目录的 `responsive.css`，避免把一次移动端修改拆到多个文件里。
- 页面私有样式不要回写到 `shared/`；只有稳定跨页面契约才能上升到共享层。
- 新增样式先判断归属，再决定是否拆到局部子目录；不要重新引入新的巨型聚合文件。

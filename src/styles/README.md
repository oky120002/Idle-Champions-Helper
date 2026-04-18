# styles 入口

- 先读 `src/styles/global.css`，只看导入顺序，不看实现。
- `foundations/` 只放 token、reset、元素级默认样式。
- `app/` 只放站点壳层：`shell`、`site-header`、`navigation`。
- `shared/` 只放跨页面复用样式：`surfaces`、`filters`、`results`、`formation`、`controls`。
- `components/` 只放独立组件样式；当前只有 `visual-workbench`。
- `pages/` 只放页面私有样式；跨 section 的规则放该页的 `shell.css`。

## 读取顺序

- 壳层问题：`app/shell.css` -> `app/site-header.css` -> `app/navigation.css`
- 通用卡片/布局：`shared/surfaces.css`
- 筛选面板：`shared/filters.css`
- 结果卡与列表：`shared/results.css`
- 阵型棋盘：`shared/formation.css`
- 表单、按钮、反馈：`shared/controls.css`
- 英雄详情：`pages/champion-detail/shell.css` -> `dossier.css` -> `sections.css` -> `upgrades.css` -> `feats.css` -> `media.css`
- 视觉工作台：`components/visual-workbench.css`
- 其他页面：直接读对应 `pages/*.css`

## 约束

- 不新增新的巨型入口文件；样式按壳层 / 共享 / 页面 / 组件落位。
- 页面选择器不回写到 `shared/`，除非它真是跨页面契约。
- 断点规则跟随所属文件；跨多个详情 section 的断点放 `pages/champion-detail/shell.css`。
- 复用优先复制小样式，不为省几行 CSS 引入高耦合。

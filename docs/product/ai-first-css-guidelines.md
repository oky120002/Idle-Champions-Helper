# AI-first CSS 开发规范

- 方案日期：2026-04-18
- 适用范围：`src/styles/**/*.css`
- 目标：让 AI 只读取当前改动所需的最小样式上下文，稳定控制层级、耦合和 token

## 1. 目录职责

- `src/styles/global.css` 只保留 `@layer` 顺序与 `@import` 清单，不写实现。
- `foundations/` 只放 token、reset、元素默认样式。
- `app/` 只放站点壳层：页面骨架、站点头部、导航。
- `shared/` 只放跨页面稳定契约；不能偷放单页私有选择器。
- `components/` 只放独立组件样式；组件跨页复用但不升级成全局契约时放这里。
- `pages/` 只放页面私有样式；跨多个 section 的页面级规则放该页 `shell.css`。

## 2. 渐进式读取

- 默认读取顺序：`global.css` -> 命中的目录 -> 命中的文件。
- 壳层问题先读 `app/shell.css`、`app/site-header.css`、`app/navigation.css`。
- 英雄详情页按 `shell.css` -> `dossier.css` -> `sections.css` -> `progression.css` -> `media.css` 读取。
- 共享样式只读命中的那一层，不回扫整棵 `shared/`。

## 3. 拆分规则

- 新增样式先判断归属：壳层、共享、组件、页面；不要直接堆回入口文件。
- CSS 文件建议不超过 500 行；超过 600 行应评估拆分；超过 800 行必须继续拆。
- 断点规则跟随所属文件；只有跨多个详情 section 的断点才进页面 `shell.css`。
- 优先接受少量重复，也不要为了省几行 CSS 制造跨文件强耦合。
- 命名延续当前 BEM 风格：块负责边界，`__` 表示内部结构，`--` 表示状态或变体。

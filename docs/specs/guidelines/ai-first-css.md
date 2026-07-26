# AI-first CSS 开发规范

- 适用范围：`src/styles/**/*.css`
- 目标：让样式问题默认只读取当前命中的层级、子目录和叶子文件，不回扫整棵样式树。

## 1. 目录职责

- `src/styles/global.css` 只保留 layer 顺序与导入清单，不写实现。
- `foundations/`：token、reset、元素级默认样式。
- `app/`：站点壳层；优先按基础、状态、响应式拆到子目录。
- `shared/`：跨页面稳定契约；优先按“基础块 / 场景块 / responsive”拆分。
- `components/`：组件私有样式；未上升为共享契约前不要放进 `shared/`。
- `pages/`：页面私有样式；跨多个 section 的页面级规则放该页自己的壳层文件。

## 2. 默认读取顺序

- 先读 `src/styles/global.css`，确认命中的 layer 和叶子文件。
- 壳层问题：`app/site-header/*`、`app/navigation/*`。
- 通用表面：`shared/surfaces/*`。
- 筛选：`shared/filters/*`。
- 结果卡：`shared/results/*`。
- 阵型：`shared/formation/*`。
- 页面私有问题：直接进入对应 `pages/*.css`。

## 3. 体量预算

| 类别 | 默认保留 | 评估拆分 | 应拆 | 必须拆 |
| --- | --- | --- | --- | --- |
| `src/styles/shared/` | <= 280 | 281-400 | 401-560 | > 560 |
| `src/styles/app/` | <= 320 | 321-420 | 421-600 | > 600 |
| `src/styles/pages/` / `components/` | <= 260 | 261-380 | 381-520 | > 520 |

CSS 语义密度低于 TS / TSX，但大文件会显著抬高一次样式修改的读取成本，所以仍要控制边界。

## 4. 拆分方式

- 先按读者意图拆：基础壳层、交互块、场景块、响应式。
- 同一个 `@media` 同时改动多个子块时，允许集中到当前目录的 `responsive.css`，不要把一次移动端调整拆进很多文件。
- 选择器命名继续沿用当前 BEM 风格：块负责边界，`__` 表示内部结构，`--` 表示状态或变体。
- 优先接受少量重复，也不要为了复用几行样式制造跨文件强耦合。
- 页面私有选择器不回写到 `shared/`，除非它已经是稳定的跨页面契约。

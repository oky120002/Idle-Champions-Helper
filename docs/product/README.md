# product 文档入口

- 作用：只在需要产品范围、长期边界或全局规则时加载本目录；默认先读子主题入口，而不是直接读大文档。

## 当前文档

- `docs/product/roadmap/README.md`：项目价值、定位、用户、范围、阶段路线、技术方向与风险。
- `docs/product/idle-champions-roadmap.md`：兼容旧入口的项目路线索引，适合从历史路径跳转时使用。
- `docs/product/documentation-governance.md`：文档职责、低 token 写法、渐进式加载和更新触发条件。
- `docs/product/ai-first-ts-tsx-guidelines.md`：AI-first 的 TypeScript / React 结构、类型边界、文件拆分与 token 控制规范。
- `docs/product/mobile-compatibility-guidelines.md`：移动端布局约束，重点是“禁止把横向滑动当主交互”。

## 何时先读哪份

- 判断“这次要做什么、不做什么、先后顺序是什么”：优先读 `docs/product/roadmap/README.md`；如果当前规则或外层入口仍引用旧路径，再读 `docs/product/idle-champions-roadmap.md`。
- 判断“规则应写进哪里、入口文档为什么要短、哪些文档该更新”：读 `docs/product/documentation-governance.md`。
- 判断“TS / TSX 怎么拆、怎么控 token、怎么做渐进式加载”：读 `docs/product/ai-first-ts-tsx-guidelines.md`。
- 判断“移动端布局或 sticky 区域是否越界”：读 `docs/product/mobile-compatibility-guidelines.md`。

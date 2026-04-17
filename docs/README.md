# docs 文档入口

- 作用：`docs/` 总索引，只回答“下一步去哪读”；专题细节必须下沉到目录 `README.md` 或更小叶子文档。
- 默认读取顺序：`README.md` -> `docs/README.md` -> 主题目录 `README.md` -> 子主题 `README.md` -> 单篇叶子文档。
- 原则：入口文档只保留导航、边界和触发条件；实现细节、证据、操作步骤和审计结果全部下沉。

## 先去哪一层

- 项目边界、路线图、移动端规则、AI-first 开发规范与文档治理：`docs/product/README.md`
- 数据、部署、测试与外部事实：`docs/research/README.md`
- 模块设计稿与局部交互方案：`docs/modules/README.md`
- 运行、仓库、环境排查与验证：`docs/investigations/README.md`
- 常见故障与可复用修复路径：`docs/troubleshooting/README.md`
- 通用问题摘要台账：`docs/troubleshooting-log.md`

## 文档治理入口

- `docs/product/documentation-governance.md`：文档扫描、精简、归档与更新触发条件。
- `docs/product/ai-first-ts-tsx-guidelines.md`：面向 AI 开发的 TypeScript / React 结构、token 控制与渐进式加载规范。
- `docs/product/mobile-compatibility-guidelines.md`：移动端布局与交互硬约束，尤其是横向滚动禁令。

## 放置规则

- `docs/product/`：项目定位、阶段目标、全局规则、PRD
- `docs/research/`：数据来源、技术选型、部署、测试、外部核实
- `docs/modules/`：模块设计稿、模块补充研究、模块级验证
- `docs/investigations/`：排查、复现、环境确认、历史验证
- `docs/troubleshooting/`：常见故障、工具链异常、可复用处理路径
- `docs/` 根目录：只放跨主题入口和台账

## 渐进式要求

- 目录和文件统一 `kebab-case`。
- 调研统一 `*-research.md`；排查统一 `*-investigation.md` 或 `*-verification.md`；模块设计优先 `*-design.md`。
- 同一主题只允许一个短入口；概要、决策、实现、验证、审计应继续拆成更小文件。
- 同一事实只在一处展开，其他入口只保留一句摘要和链接。
- 仓库内引用统一项目相对路径；历史结论要标明当前是否仍有效。
- 某目录文档增长到不适合平铺时，先补该目录 `README.md`，再继续加专题文档。
- 默认不跨主题预加载；只有当前问题真的涉及交叉边界时才继续展开下一层。

## 需要更新本目录的情况

- 新增或删除目录级文档、局部 `README.md`。
- 项目范围、路由、部署链路、数据目录、文档治理规则发生变化。
- 新增跨项目或跨模块的长期规范，例如 AI-first TS / TSX 开发规则。
- 发现根索引重新膨胀、重复列举专题细节、写入绝对路径或过期命令。

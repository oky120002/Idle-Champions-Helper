# docs 文档入口

- 作用：`docs/` 总索引，只回答“下一步去哪读”；专题细节必须下沉到目录 `README.md` 或更小叶子文档。
- 默认读取顺序：`README.md` -> `docs/README.md` -> 主题目录 `README.md` -> 子主题 `README.md` -> 单篇叶子文档。
- 原则：入口文档只保留导航、边界和触发条件；实现细节、证据、操作步骤和审计结果全部下沉。

## 先去哪一层

- 产品边界与路线：`docs/product/README.md`
- 数据 / 部署 / 测试等外部事实：`docs/research/README.md`
- 模块设计稿：`docs/modules/README.md`
- 排查与历史验证：`docs/investigations/README.md`
- 通用问题摘要：`docs/troubleshooting-log.md`

## 放置规则

- `docs/product/`：项目定位、阶段目标、全局规则、PRD
- `docs/research/`：数据来源、技术选型、部署、测试、外部核实
- `docs/modules/`：模块设计稿、模块补充研究、模块级验证
- `docs/investigations/`：排查、复现、环境确认、历史验证
- `docs/` 根目录：只放跨主题入口和台账

## 渐进式要求

- 同一主题只允许一个短入口；概要、决策、实现、验证、审计应继续拆成更小文件
- 主题规模一旦增长，先补子目录 `README.md`，再继续写叶子文档
- 默认不跨主题预加载；只有当前问题真的涉及交叉边界时才继续展开下一层

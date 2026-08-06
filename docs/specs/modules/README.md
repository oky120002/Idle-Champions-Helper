# specs/modules/ —— 模块规范

每个模块一个子目录，自治。描述「这个模块现在是什么、怎么工作」。

## 标准结构

每个 `<name>/` 目录：

- `README.md`：入口（≤60 行）——模块是什么 + 文件索引
- `design.md`：设计——架构、数据流、关键决策指针
- `rules.md`：硬规则——必须满足的约束
- `acceptance.md`：验收标准（DoD）
- `contract.md`（可选）：数据合同 / 接口契约

## 规则

- 模块自治：设计 / 规则 / 验收在模块目录；跨模块决策进 `decisions/`
- 只描述「现在是什么」，不写里程碑 / 变更叙事（进 `plans/`）
- 决策依据指向 `decisions/`，外部事实指向 `research/`
- 单模块的里程碑 / 计划进 `plans/`（scope = 模块名）

## 现有模块

- [`champions/`](./champions/)（detail / filter / illustration）
- [`formation/`](./formation/)
- [`pets/`](./pets/)
- [`planner/`](./planner/)
- [`presets/`](./presets/)
- [`search/`](./search/)
- [`shared-components/`](./shared-components/)
- [`user-data/`](./user-data/)

## 何时新增模块

新功能域（独立的一组页面 / 数据 / 规则）→ 新建 `specs/modules/<name>/` + 标准文件。

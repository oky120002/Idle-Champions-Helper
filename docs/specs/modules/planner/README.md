# planner 模块文档入口

- 作用：自动阵型计划器的产品需求、架构设计与功能说明。
- 边界：本目录是功能与设计事实源；Ralph 任务契约与验收用例见 `.ralph/tasks/planner/`。

## 文档导览

### 产品与架构

- `prd.md`：产品目标、用户流程、隐私与基线要求。
- `development-design.md`：三层架构、目录设计、命名约定、BUD 与 DPS 取舍、模拟/UI 分离。
- `development-design-data.md`：数据流、核心数据契约、官方只读 client、IndexedDB 与隐私测试。

### 推荐与评分

- `recommendation-and-placement-design.md`：推荐英雄、站位规则、模型字段、条件匹配语义与 merge 策略。
- `development-design-simulator.md`：GameNumber、基线、加成聚合、评分维度、搜索、计算模式、Web Worker、推图预估与 UI 工作台。
- `signal-coverage-research.md`：planner signal 真实覆盖率盘点。

### 专题

- `expression-evaluator.md`：`per_hero_expr` 两类表达式的解析与求值（布尔谓词现状 + 数值表达式扩展）。
- `bud-verification.md`：BUD 计算公式与游戏内校准。
- `buff-upgrade-priority.md`：buff_upgrade wrapper 变体覆盖与稀有度去重。
- `data-source-confirmations.md`：推图预估、全局加成、restrictions、装备等数据源的字段确认事实。

## 关联入口

- Ralph 任务包：`.ralph/tasks/planner/README.md`
- Ralph 验收用例：`.ralph/tasks/planner/acceptance-cases.md`
- 个人数据导入现状：`docs/specs/modules/user-data/user-data-import-design.md`
- 阵型编辑现状：`docs/specs/modules/formation/README.md`
- 方案存档现状：`docs/specs/modules/presets/README.md`

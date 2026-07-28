# planner 模块文档入口

- 作用：自动阵型计划器的产品范围、架构、数据、推荐评分与运行时合同。
- 边界：本目录是功能与设计事实源；历史 Ralph 任务包（含旧路径引用）见 `.ralph/tasks/planner/`，仅作存档，不反映当前结构。

## 文档导览

### 产品与架构

- `scope.md`：产品范围、用户目标、非目标、角色场景、用户流程与页面需求。
- `requirements.md`：数据、计算与隐私需求。
- `architecture.md`：三层架构、目录设计、命名约定、BUD 与 DPS 取舍、模拟 / UI 分离、**计算原则**（根本目标 / 投影模式约束② / 外部加成契约约束③ / Hermetic 边界 / 数据分类铁律 / 入参契约）。
- `data-and-privacy.md`：数据流、核心数据契约、官方只读 client、IndexedDB 与隐私。

### 推荐与评分

- `recommendation.md`：推荐英雄、站位规则、模型字段、条件匹配语义与 merge 策略。
- `search-and-ranking.md`：搜索、排序、输出合同与验收场景。
- `simulator.md`：GameNumber、等级基线、加成聚合、评分维度、搜索与计算模式。
- `computation-runtime.md`：Web Worker、推图预估、输出合同、UI 与测试覆盖。

### 数据核实

- `docs/research/data/planner/README.md`：怪物、Patron、场景限制、装备、能力、BUD 与信号覆盖证据。

### 验收

- `acceptance.md`：整体 DoD 与关键验收指针。

### 专题

- `expression-evaluator.md`：当前布尔表达式求值边界，以及其他表达式域的职责分界。
- `dps-mechanics.md`：DPS 机制注册表（id / 识别字段 / 代码处理点 / 使用英雄），机制 id 三处一致的锚点。
- `dps-mechanic-abstraction.md`：机制抽象四条阈值（≥2 抽象 / 孤儿特化+预警 / 孤儿→≥2 立刻抽象 / >10 升级策略注册表）。
- `champion-reference-verification.md`：英雄实测参照数据统一 schema（机制倍率 + 伤害快照）、校准口径与测试两组。

## 关联入口

- **英雄实测数据入库（统一口径，冻结）**：`docs/runbooks/add-champion-reference.md`——新数据照此走，不另造口径。
- 个人数据导入（planner 消费 `UserProfileSnapshot`）：`docs/specs/modules/user-data/README.md`
- 阵型编辑：`docs/specs/modules/formation/README.md`
- 方案存档：`docs/specs/modules/presets/README.md`

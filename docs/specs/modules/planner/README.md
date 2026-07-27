# planner 模块文档入口

- 作用：自动阵型计划器的产品范围、架构、数据、推荐评分与专题事实。
- 边界：本目录是功能与设计事实源；历史 Ralph 任务包（含旧路径引用）见 `.ralph/tasks/planner/`，仅作存档，不反映当前结构。

## 文档导览

### 产品与架构

- `scope.md`：产品范围、用户目标、非目标、角色场景、用户流程、数据 / 计算 / 隐私需求提要。
- `architecture.md`：三层架构、目录设计、命名约定、BUD 与 DPS 取舍、模拟 / UI 分离。
- `data-and-privacy.md`：数据流、核心数据契约、官方只读 client、IndexedDB 与隐私。

### 推荐与评分

- `recommendation.md`：推荐英雄、站位规则、模型字段、条件匹配语义与 merge 策略。
- `simulator.md`：GameNumber、等级基线、加成聚合、评分维度、搜索、计算模式、Web Worker、推图预估。
- `signal-coverage.md`：planner signal 真实覆盖率盘点。

### 验收

- `acceptance.md`：整体 DoD 与关键验收指针。

### 专题

- `expression-evaluator.md`：`per_hero_expr` 两类表达式的解析与求值（布尔谓词现状 + 数值表达式扩展）。
- `bud-verification.md`：BUD 计算公式与游戏内校准。
- `buff-upgrade-priority.md`：buff_upgrade wrapper 变体覆盖与稀有度去重。
- `data-source-confirmations.md`：关键数据源（怪物 stats、patron-perks、restrictions、equipment、ability）字段结构、公式与缺口确认。

## 关联入口

- 个人数据导入（planner 消费 `UserProfileSnapshot`）：`docs/specs/modules/user-data/README.md`
- 阵型编辑：`docs/specs/modules/formation/README.md`
- 方案存档：`docs/specs/modules/presets/README.md`

# planner 推图进度仪表盘

**状态**: 已落地
**类型**: milestone
**范围**: planner / simulator / UI
**创建日期**: 2026-08-24

## 目标

把 planner 的区域预估、绑定约束和可解释的提升方向集中展示，让玩家知道当前能推到哪里、卡在哪里，以及下一步应优先改善哪个维度。

## 范围

- 复用 `AreaEstimationResult` 的区域、击杀上限、存活上限和绑定约束，不重写区域估算公式。
- 补齐仪表盘所需的可解释派生数据：目标区域的伤害/生存对照、墙类型和差距等级。
- 在 planner 结果卡中完善仪表盘展示，并保持绝对区域值“未校准、仅供相对比较”的边界。
- 基于现有阵型评分与候选池输出有限、可解释的改进方向；不引入逐秒模拟、Modron、药水或新的账号数据依赖。
- 补齐领域单测、组件测试、国际化文案和 planner 规格；完成后归档需求与计划。

## 阶段 Checklist

- [x] 阶段 1: 冻结仪表盘数据契约和墙类型判定规则 —— 验证方式：领域单测覆盖伤害墙、存活墙、设计上限、缺省和边界输入
- [x] 阶段 2: 实现瓶颈分析与改进方向派生 —— 验证方式：单测验证差距等级、活跃约束和建议在无数据时的保守回退
- [x] 阶段 3: 完善 planner 结果仪表盘 —— 验证方式：组件测试验证区域、对照、墙标记、瓶颈和建议的可观察渲染
- [x] 阶段 4: 完成接缝验证和文档收口 —— 验证方式：`npm run typecheck`、相关 unit/component 测试、文档治理测试和构建通过
- [x] 阶段 5: 更新当前规格并归档已完成资产 —— 验证方式：需求与计划均带终态并移入对应 `archives/`，活跃文档只描述当前态

## 验收

- planner 结果旁有独立推图仪表盘，展示预估区域、击杀上限、存活上限和绑定限制。
- 仪表盘能区分伤害瓶颈、存活瓶颈、机制吞吐量瓶颈和设计上限，并给出玩家可理解的说明。
- 仪表盘展示目标区域的可比较指标；无法精确校准的绝对值明确标注，不把近似值描述成游戏内精确结果。
- 在现有候选池足够时给出最多 1 至 2 条可解释改进方向；候选数据不足时不臆测、不显示空泛建议。
- 现有 `areaEstimate` 计算结果和 planner 其他模式行为不回归。
- 新增行为有 co-located 单测/组件测试，测试入口先通过类型检查。
- `docs/specs/modules/planner/` 描述最终现状；需求文件和本计划完成后分别移入 `docs/archives/requirements/` 与 `docs/archives/plans/`。

## 落地后

- specs/ 更新点：
  - `docs/specs/modules/planner/recommendation.md`：补充区域仪表盘输出、墙类型解释和建议边界。
  - `docs/specs/modules/planner/acceptance.md`：补充仪表盘用户可见验收条件。
  - 如派生数据形成独立稳定契约，再更新 `docs/specs/modules/planner/computation-runtime.md`。
- 需求文件 `docs/requirements/2026-08-planner-area-dashboard.md` 加入“已落地”终态并移入 `docs/archives/requirements/`。
- 本 change 状态 → 已落地 → 移 `archives/plans/`。
- **specs/ 永不引用本 milestone**（规范描述最终态，不描述交付过程）。

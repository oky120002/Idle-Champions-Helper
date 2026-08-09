# planner 领域模块入口

- 作用：承接自动计划里的纯计算链路，只放候选池、合法性、评估、搜索和推算结果契约。
- 边界：不放页面 JSX、浏览器状态、路由、副作用和文案编排；页面层只消费结果。

## 先读顺序

- `recommendationEngine.ts` — 主入口；串起候选池、布局槽位、合法性、评估和 beam search。
- `recommendationTypes.ts` — 推算结果、解释文本、阵位条目和 blocker 契约。
- `plannerModel.ts` — merge 后推算输入模型。
- `candidatePool.ts` — `owned-only / all-hypothetical` 候选模式。
- `formationLegality.ts` — seat 冲突、禁用英雄、强制英雄、锁槽。
- `steadyStateScoring.ts` — 当前可静态解释的评估。
- `beamSearchRanking.ts` — deterministic beam search。

## 其他文件

- `computationMode.ts` — 同步 / Worker 计算模式选择。
- `variantConstraints.ts` — 变体限制投影。
- `hypotheticalBaseline.ts` — 未拥有英雄假设基线。
- `placementFit.ts` / `placementFitTypes.ts` / `placementReasonCode.ts` / `placementSlotRelation.ts` — placement fit 评估。
- `placementFitTestFixtures.ts` — 测试夹具。
- `plannerNarrative.ts` — 推算结果叙事文本。
- `scoringBonusInputs.ts` — 评估加成输入构建。
- `scoringSupportSync.ts` — 评估支持度同步。
- `goldObjective.ts` — 金币目标。

## 子目录

- `compute/` — Worker 计算（plannerCompute + worker entry）。
- `mechanics/` — signal multiplier / stack count resolver。
- `references/` — 英雄参考验证数据（minsc7 / varo159 / vi95 等）。
- `scoring/` — crit / vulnerability / pool aggregation 评估因子。

## 不变量

- 推算引擎属于领域层，不反向 import `src/pages/**`。
- 页面组件不作为领域结果类型来源；共享契约留在本目录。
- unsupported 规则只进 warning，不静默计入目标值。
- 推算引擎只消费 merge 后 planner model；计算逻辑留在本目录。

## 继续时的入口

- 补独立子模块先看 `docs/specs/modules/planner/recommendation.md`。
- 补 carry-centric 推算优先改 `recommendationEngine.ts` 和 `steadyStateScoring.ts`。
- 补 planner model / merge 层先看 `plannerModel.ts`、`src/data/plannerModel.ts` 和 `src/data/plannerOverridesStore.ts`。

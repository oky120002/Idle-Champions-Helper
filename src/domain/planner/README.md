# planner 领域模块入口

- 作用：承接自动计划里的纯计算链路，只放候选池、合法性、评分、搜索和推荐结果契约。
- 边界：这里不放页面 JSX、浏览器状态、路由、副作用和文案编排；页面层只能消费这里的结果。

## 先读顺序

- 推荐主入口先读 `src/domain/planner/recommendationEngine.ts`。
- 结果合同与跨层共享类型读 `src/domain/planner/recommendationTypes.ts`。
- 候选池模式读 `src/domain/planner/candidatePool.ts`。
- 阵型合法性读 `src/domain/planner/formationLegality.ts`。
- 搜索与评分分别读 `src/domain/planner/beamSearchRanking.ts`、`src/domain/planner/steadyStateScoring.ts`。
- 变体限制投影与未拥有英雄假设分别读 `src/domain/planner/variantConstraints.ts`、`src/domain/planner/hypotheticalBaseline.ts`。

## 当前职责

- `recommendationEngine.ts`
  - 串起候选池、布局槽位、合法性、评分和 beam search。
  - 输出页面可直接消费的 `PlannerRecommendation`，但不依赖任何页面组件类型。
- `plannerModel.ts`
  - 定义 merge 后推荐输入模型；统一承接 `hero-abilities.json`、`scenarios.json`、仓库语义补丁和浏览器本地 override。
- `recommendationTypes.ts`
  - 定义推荐结果、解释文本、阵位条目和 blocker 契约。
- `candidatePool.ts`
  - 定义 `owned-only / all-hypothetical` 两种候选模式。
- `formationLegality.ts`
  - 检查 seat 冲突、禁用英雄、强制英雄和锁槽。
- `steadyStateScoring.ts`
  - 只做当前可静态解释的评分，不偷偷吸收 unsupported 规则。
- `beamSearchRanking.ts`
  - 负责 deterministic beam search；不关心 UI，也不决定文案。

## 当前不变量

- 推荐引擎属于领域层，不允许反向 import `src/pages/**`。
- 页面组件不能作为领域结果的类型来源；共享契约必须放回 `src/domain/planner/`。
- 评分和搜索只消费结构化输入，不在 JSX 里现场拼规则。
- unsupported 规则只能进入 warning，不能静默计分。
- 推荐引擎只消费 merge 后 planner model；计算逻辑留在本目录，不塞回页面层或测试夹具里现场拼 `champions + formations + champion-details`。

## 后续继续时优先看什么

- 若要继续补“独立子模块”，先看 `docs/modules/planner/recommendation-and-placement-design.md`。
- 若要补 carry-centric 推荐，优先改 `recommendationEngine.ts` 和 `steadyStateScoring.ts`，不要先改页面。
- 若要继续补 planner model / merge 层，先看 `src/domain/planner/plannerModel.ts`、`src/data/plannerModel.ts` 和 `src/data/plannerOverridesStore.ts`。

# AI-first 结构与可维护性审计

度量基准日：2026-08-01（分支 `opencode/dev1`，commit `c377707d`）。本文件是轮 2 结构审计的 canonical 来源；体例沿用 `test-suite-audit.md`。体量阈值取自 `docs/specs/guidelines/ai-first-ts-tsx.md` §3：

| 类别 | 默认保留 | 评估拆分 | 应拆 | 必须拆 |
|------|----------|----------|------|--------|
| `.ts`（model/hook/rule/adapter） | ≤240 | 241-320 | 321-480 | >480 |
| `.tsx`（区块/组件） | ≤180 | 181-260 | 261-360 | >360 |
| 页面入口 `.tsx` | ≤220 | 221-320 | 321-420 | >420 |

判据不只看行数——拆分成立只看 3 指标（常见任务一跳命中率 / 无关上下文占比 / 修改需打开文件数），拆完若让常见修改多开文件就先保留现状（CLAUDE.md AI-first 根目标）。

## 1. 审计范围与方法

**范围**：`src/**` 全量 + `scripts/**`。**方法**：指标驱动——`wc -l` 拉体量、`fd` 找 barrel、`rg` 找接口/实现/排列式分支、对照 hermeticBoundary 守护域确认跨边界耦合。测试文件体量已由 `test-suite-audit.md` 收口（co-location / 巨型拆分），本轮不重审测试组织。

**总体结论**：近期 mechanic-isolation + build-models 拆分后，结构整体健康。hermetic 守护锁住 simulator/planner 跨层耦合；barrel 干净（仅 2 个小 barrel）；主要抽象（`PlannerComputeRunner`）2 实现 + 运行时工厂选择，非投机。发现 2 个超「必须拆」阈值的生产文件（§2），5 个超「应拆」（§3）。

## 2. P1 — 超必须拆阈值的生产文件

| 文件 | 行 | 类别 | 动作 | ROI | 影响面 | 进度 |
|------|----|------|------|-----|--------|------|
| `src/domain/planner/recommendationEngine.ts` | 578 | .ts >480 必须拆 | ~~类型下沉 recommendationTypes.ts~~ | **✅ 不拆（3-metric 否决）** | — | 5 类型块共 ~87 行，搬走后 578→491 仍超 480 阈值（非审计预估 ~430）；`PlannerRecommendationOptions` 每字段被 evaluate/recommend 直接消费，「新增 option」常见任务会 1→2 文件。**顺手收**：`evaluateFormation`/`buildPlannerRecommendation` 两处 `scoreFormation` 选项透传逐字重复（含同一注释），抽 `scorePlannerFormation` helper 锁定两入口透传一致不变量（否则漏改一处 → 同一阵型静默算出不同 DPS，无诊断）；581 行，279 测试全过 |
| `src/pages/PlannerEvaluatePage.tsx` | 501 | 页面入口 >420 必须拆 | ~~结果卡/自配面板抽 sub-component~~ | **✅ 不拆（3-metric 否决）** | — | 状态高度内聚（placements/lockedSlots/scoringMode/evaluation 交叉耦合）：FormationBoardCanvas 的 slotExtras 锁/选交互需透传 ~11 个 prop，结果卡需 evaluation/t/heroNameById/scoreLabel；抽 sub-component 会让任何跨区块改动从 1 文件变多文件且 props 爆炸。数据加载 hook 已抽（`usePlannerCollections`/`usePlannerEvaluation`），剩余是内聚页面逻辑，根规则文件「拆完让常见修改多开文件则保留」直接适用 |

## 3. P2 — 超「应拆」阈值（各需 3-metric 评估，内聚则保留）

| 文件 | 行 | 现状判断 |
|------|----|----------|
| `src/domain/planner/steadyStateScoring.ts` | 421 | 321-480 应拆。核心评估循环（`scoreFormation`+`scoreTeamGold`）内聚，拆开会割裂 carry 遍历+pool 聚合的紧耦合；crit/vuln/dimension 因子已下沉 `scoring/`。**倾向保留**，除非找到独立子 Concern |
| `src/data/user-sync/userProfileNormalizer.ts` | 420 | 321-480 应拆。normalize 各字段提取，若多段独立可按字段族拆；须先确认是否共享中间状态 |
| `src/domain/abilities/abilityModel.ts` | 392 | 321-480 应拆。类型 + `DIMENSION_BY_KIND`/`POOL_SCOPE_BY_KIND` 静态映射 + `computeHeroGainProfile` + `appendHeroAbilitySignals` 等。类型与映射/函数可分；但作为 abilities 域的单一类型源，拆开可能增加跨文件跳转。**倾向保留**，映射下沉收益有限 |
| `src/pages/champions/championRoster.ts` | 347 | 321-480 应拆。页面聚合逻辑，须读后判断 |
| `src/domain/abilities/heroPredicate.ts` | 326 | 321-480 应拆。谓词解析器，若方言（shorthand/functional）独立可按方言拆 |

scripts 侧大文件（`normalize-adventures.ts` 1288、`sync-idle-champions-pets.ts` 1174、`official-rule-helpers.ts` 1064、`normalize-champions.ts` 887、`effect-helpers.ts` 850）超出 ts-tsx 阈值，但 scripts 是 build 期一次性脚本，体量预算适用性弱于 src；本轮登记不展开，留轮 4（脚本与管线）一并审。

## 4. 验证健康（结构气味核查无问题）

| 气味 | 核查结论 |
|------|----------|
| 投机抽象（单实现接口） | `PlannerComputeRunner`（`compute/plannerCompute.ts:55`）有 2 实现（`SyncPlannerComputeRunner` + `WorkerPlannerComputeRunner`）+ `createPlannerComputeRunner` 运行时选择——合法抽象，非投机。`BonusProvider` 经 mechanic-isolation 评估**刻意不引入**统一接口（5 provider 输出形态不同 + <阈值，见 ADR 0008）。无单实现工厂 |
| barrel 文件 | 仅 2 个真 barrel（`src/data/user-profile-store/index.ts` 18 行、`src/domain/user-profile/index.ts` 6 行），均小且语义清晰。无损害一跳命中率的多层 barrel |
| 跨边界回跳式复用 | `hermeticBoundary.test.ts` 守护 simulator 纯公式层禁 import `../effects/`/`../abilities/signalSemantics`；buffs/ 独立扫描域。架构层已强制，非靠人工复查 |
| 排列式 if → switch/map | 抽样 `formatLegalityViolation`（recommendationEngine.ts:52）已用 switch；`matchesSlotRelation`（placementSlotRelation.ts:117）用 switch + 列拓扑计算。未见典型排列式 if 串 |
| 缓存/中间层 | mechanic-isolation 已删 `computeTheoreticalLootMult`/`computeEquipmentAdjustment` 死码；`buildScoringBonusInputs` 下沉纯函数替代 4 useMemo。无多余缓存层 |

## 5. 未深度覆盖（登记供后续结构 pass）

本轮指标驱动，以下需逐文件读码，未展开（避免上下文膨胀降质）：死码/未用导出系统性扫描（需 ts-prune 或 `rg` 交叉验证 import）、命名准确性逐符号核查、语义判断是否误沉代码（spec→code 边界）。建议作为结构 pass 的独立任务，或并入轮 4 脚本侧一并做。

## 6. 轮 2 收口

- **P0 清零**：本轮无 P0（结构问题无「明确 bug」性质）。
- **P1 登记**：2 个超必须拆阈值生产文件（§2），带动作 + ROI + 影响面。**均经 3-metric 评估后 ✅ 不拆**（recommendationEngine 顺手收 scoreFormation 透传重复为不变量守护），详见 §2 进度列。
- **P2 登记**：5 个超应拆阈值文件 + scripts 大文件留轮 4。
- **验证健康**：§4 五项结构气味核查无问题。

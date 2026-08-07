# 金币预算接入评分链路

**Status**: Landed
**Type**: change
**Scope**: planner
**Created**: 2026-08-06

## 目标

让 planner 推荐阵容时考虑英雄实际可达等级：用户给一个全局金币预算，每个英雄按各自升级费用曲线换算出能升到几级，据此判断专精是否解锁，等级 + 专精 + 金币一起传入评分链路。

## 背景

- 升级费用数据来源已确认：游戏 JSON 的 `baseCost`（每英雄不同）+ `costCurves["1"]`（每英雄增长率 1.05~1.15），164 英雄 100% 覆盖。
- 费用公式来自社区（[Reddit](https://www.reddit.com/r/idlechampions/comments/71ml15/champion_upgrade_rates_9_of_them_anyways/)）：累计升到等级 X = `baseCost × (1 - rate^X) / (1 - rate)`（等比数列求和）。
- `goldBudgetBaseline.ts`（金币→等级二分搜索）和 `specializationBaseline.ts`（专精解锁等级提取）均已有骨架但零调用者，且各有问题需修。
- 大数计算用 `decimal.js`（`GameNumberValue`），封装在 `gameNumber.ts`（ADR 0014）。
- 规范已录入 `ai-first-ts-tsx.md` §6。

## 范围

- `src/domain/simulator/goldBudgetBaseline.ts` — 重写接真实数据
- `src/domain/simulator/specializationBaseline.ts` — 修判据 bug + 接入
- `src/domain/simulator/gameNumber.ts` — 迁移到公共目录
- `src/domain/planner/recommendationEngine.ts`、`steadyStateScoring.ts` — 接入新入参
- `src/domain/abilities/specializationSignals.ts` — 等级门控
- 6 处违规直接 import decimal.js — 收敛到 wrapper
- planner UI — 金币/等级二选一互斥控件

## 阶段 Checklist

### 阶段 0：基础设施 ✅

- [x] `gameNumber.ts` 从 `simulator/` 迁移到 `src/domain/gameNumber.ts`，更新全部 import 路径 —— 验证：`npm run test:run` 226 文件 1427 测试全绿
- [x] 6 处违规直接 `import { Decimal } from 'decimal.js'` 收敛到 wrapper（`baseDps.ts`/`survivalCalculation.ts`/`steadyStateScoring.ts`/`goldObjective.ts`/`recommendationEngine.ts`/`monsterStats.ts`）+ 新增 `toGameNumber` 快捷构造 wrapper —— 验证：生产代码零直接 import（仅 gameNumber.ts）

### 阶段 1：费用公式实现 + 校准 ✅

- [x] 实现累计升级费用函数 `computeCumulativeLevelCost(baseCost, rate, targetLevel): GameNumberValue`（等比数列求和 `baseCost × (rate^X-1)/(rate-1)`，decimal.js）+ 新增 `subtractGameNumbers` wrapper —— 验证：单元测试 6 项（level=0/1/10/100/8000 + 多英雄保序）
- [x] 校准验证：Bruenor(baseCost=5,rate=1.06) level=1/10/100 与手算精确一致；减法在 decimal.js 内完成避免 JS 浮点误差（`rate-1` 先算致 4.999... 偏差）

### 阶段 2：金币 ↔ 等级双向换算 ✅

- [x] 重写 `goldBudgetBaseline.ts`：`computeAffordableLevel`（金币→per-hero 等级二分搜索）+ `computeMaxGoldForLevel`（等级→最贵英雄累计费用），删除旧 `costCurve` 函数式接口（零引用） —— 验证：15 项测试（含多英雄取 max、零/超大金币、双向闭环向下取整一致性）
- [x] 双向闭环测试：金币→等级→反算金币 ≤ 原金币（向下取整），下一级费用 > 原金币

### 阶段 3：专精按等级判断解锁 ✅

- [x] 删除 `specializationBaseline.ts`（零引用死代码 + 判据 bug；catalog 的 `requiredLevel` 直接用于门控，不需要 baseline 提取） —— 验证：typecheck 通过
- [x] `applySpecializationsToProfile` 加 `heroLevel` 参数 + 等级门控（`requiredLevel != null && heroLevel < requiredLevel` → 跳过注入）；recommendationEngine 传 `owned.level` —— 验证：3 项测试（够/不够/null 不过控）

### 阶段 4：评分链路接入 ✅

- [x] `ScoringInput` 增加 `goldBudget?: GameNumberValue`；`PlannerRecommendationOptions` 增加 `goldBudget?: string`（游戏记数法）+ `heroLevelOverride?: Map<string, number>` —— 验证：类型检查通过 + 透传测试（等级影响 carryDps、goldBudget 不崩溃）
- [x] engine 两个入口（buildPlannerRecommendation + evaluateFormation）均合并 heroLevelOverride 到 heroLevels Map，在专精注入前完成构建使等级门控用覆盖后的等级 —— 验证：1440 测试全绿

### 阶段 5：UI 二选一互斥

#### 5a：worker 换算接口 ✅

- [x] `PlannerComputeRunner` 加 `convertGoldLevel` 方法；`PlannerComputeConvertMessage` / `GoldLevelConversion` 协议类型；`processConvertGoldLevel` 纯函数（worker 内换算，不经过 engine） —— 验证：5 项测试（gold/level 两种模式 + 空列表）
- [x] hero profile 加 `baseCost?: number`（数据管线 buildHeroModels.ts 提取，164 英雄 100% 覆盖）

#### 5b：UI 控件 + 实时渲染 ✅

- [x] planner UI 增加金币/等级互斥控件（PlannerGoldLevel 组件：radio 三选一 + 互斥输入框 + 换算摘要）
- [x] 接入 `runner.convertGoldLevel`：usePlannerPageModel debounce（300ms）+ cancelled flag 竞态防护
- [x] 金币模式：换算结果构建 `heroLevelOverride` + `goldBudget` 传入推荐 options
- [x] 等级模式：统一等级 + `effectiveGoldBudget`（maxGold）传入推荐 options
- [x] 互斥逻辑：radio 切换时条件渲染对应输入框
- [x] ~~后续增强：评估页（PlannerEvaluatePage）接入~~ → 已转 TODO 追踪，不在本计划范围
- [x] **部署前置**：`npm run data:official` 已运行（`a0bfecd0`，hero-abilities.json 含 baseCost，165 英雄 100% 覆盖）

### 阶段 6：文档同步 ✅

- [x] specs 更新：`simulator.md`（金币预算换算 + 专精等级门控最终态）、`requirements.md`（等级来源扩展为金币/等级二选一）
- [x] requirements 状态更新：`planner-capability-extensions.md` 金币预算子项打钩
- [x] 数据重建后 plan Status → Landed → 移 `archives/plans/`

## 验收

- 金币模式：给定全局金币，planner 按各英雄实际可达等级推荐，专精按等级门控解锁
- 等级模式：给定全局等级，planner 用该等级 + 反算金币推荐
- 费用公式校准偏差 < 5%
- 无直接 import decimal.js（仅 gameNumber.ts）
- 全量测试通过

## 落地后

- specs/ 更新点：
  - `specs/modules/planner/simulator.md`：金币预算换算 + 专精等级门控最终态
  - `specs/modules/planner/requirements.md`：等级来源扩展为金币/等级二选一
  - `specs/guidelines/ai-first-ts-tsx.md` §6：gameNumber.ts 路径更新（如迁移）
- 本 change Status → Landed → 移 `archives/plans/`

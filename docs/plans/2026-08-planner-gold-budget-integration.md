# 金币预算接入评分链路

**Status**: Accepted
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

### 阶段 3：专精按等级判断解锁

- [ ] 修 `specializationBaseline.ts` 判据 bug：专精节点判定从 `upgradeType === 'specialization'` 改为 `specializationName != null`（与 `specialization-catalog.ts` 对齐） —— 验证：所有英雄专精 baseline 不再 fallback 到 1
- [ ] engine 接入：等级 < requiredLevel 的专精不注入信号（`applySpecializationsToProfile` 加等级门控） —— 验证：等级够/不够的专精注入行为测试

### 阶段 4：评分链路接入

- [ ] scoring input 增加 `goldBudget: GameNumberValue` 入参 —— 验证：类型检查 + 入参透传测试
- [ ] engine 在构建 per-hero 等级 Map 时：金币模式用换算结果，等级模式用直接值 + 反算金币 —— 验证：两种模式端到端评分测试

### 阶段 5：UI 二选一互斥

- [ ] planner UI 增加金币/等级互斥控件（选金币→全局输入框，选等级→全局输入框） —— 验证：Playwright/E2E 互斥行为测试
- [ ] 互斥逻辑：选金币时隐藏等级输入（反之亦然），切换时清空对方值 —— 验证：手动 + E2E

### 阶段 6：文档同步

- [ ] specs 更新：`simulator.md`（金币预算+专精门控最终态）、`requirements.md`（等级来源扩展为金币/等级二选一）
- [ ] requirements 状态更新：`planner-capability-extensions.md` 对应子项打钩
- [ ] 本 plan Status → Landed → 移 `archives/plans/`

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

# DPS 机制抽象体系 + 英雄参照测试框架

**Status**: Landed
**Type**: milestone
**Scope**: planner
**Created**: 2026-07-27

## 目标

用游戏表现层机制反推、校准模拟器评分。搭通用 DPS 机制抽象 + 可持续扩充的英雄参照测试框架（蔚 hero_id=95 为首份样例），不针对单个英雄写死。

## 范围

- 机制补齐：`formation-count-mult-stack` 补 `per_hero`；新增 `dynamic-stack-multiply`（stacksMultiply + manualStackCount）；pool 聚合识别 stacksMultiply→multFactor。
- 归一化修复：`attachSignalSemantics` 读 `stack_func_data.tag` 为 count 限定、`filter_targets` 回归 target 限定（蔚 ed=1644 善良榜样）。
- `manualStackCount` 透传链：`ScoringInput` → `evaluatePlacementFit`（三处）→ `PlannerRecommendationOptions` → worker → UI（评估页/计划页「动态层数假设」输入）。
- 英雄参照框架：`ChampionReference` 类型 + 蔚基准 + 对照测试（`championReferenceVerification.test.ts`）。
- 文档：specs 三份（机制注册表 / 抽象阈值 / 参照校准）+ runbooks 两份 + research 蔚调研 + simulator.md 同步 + `test:simulator` 命令。

## 阶段 Checklist

- [x] 阶段 1: 英雄参照框架骨架 + 蔚基准（TDD 红）—— commit `8c9c9e45`。验证：references 测试红（per_hero 不识别、stacksMultiply 不消费）。
- [x] 阶段 2: 机制补齐 + 归一化 count/target 修复 + 单测（TDD 绿）—— commit `937e68c4`。验证：4^7=16384、1.0033^1930≈576；418 域测试无回归。
- [x] 阶段 3: manualStackCount 透传链 + UI —— commit `7c044cd8`。验证：steadyStateScoring 透传测试；912 测试无回归。
- [x] 阶段 4: 文档六类落库 + `test:simulator` 命令 + 抽象阈值守护测试。验证：`docs-governance.test.ts` 绿；`test:simulator` 可跑。

## 验收

- 蔚善良榜样 `4^7=16384`、出言不逊 `1.0033^1930≈576` 对照过（30% 容差）。
- pool 倍率 `16384×577×1.2×2.578≈2.92e7` 对照游戏「叠层系数」2.92e09%，偏差 < 1%。
- 四条抽象阈值落规范 + 守护测试；机制 id 三处一致。
- `npm run test:simulator` 聚合 typecheck + 模拟器/planner 域 + signal-coverage + smoke。

## 落地后

- specs/ 更新点：
  - `specs/modules/planner/dps-mechanics.md`：机制注册表（新建）
  - `specs/modules/planner/dps-mechanic-abstraction.md`：四条阈值（新建）
  - `specs/modules/planner/champion-reference-verification.md`：参照校准规范（新建）
  - `specs/modules/planner/README.md`：导览补三份
  - `specs/modules/planner/simulator.md`：dynamic-stack-multiply + pool stacksMultiply 同步
- runbooks/：`verify-formation-simulator.md` + `add-champion-reference.md`（新建）+ README 索引
- research/：`gameplay/` 新主题 + `champion-mechanics/vi-95.md`（蔚实测）
- `package.json`：`test:simulator` 脚本
- 本 change Status → Landed → 已移 `archives/plans/`
- **specs/ 永不引用本 milestone**（规范描述最终态，不描述交付过程）

## 勘误后记（2026-07-28 深度审计）

本里程碑落地后，对蔚参照的深度审计发现验收口径与代码实现存在偏差，已在 specs/research/test 同步修正（本历史记录仅追加勘误，不改原始验收描述）：

- **「验收」pool 倍率偏差 < 1% 属研究分解非代码产出**：`16384×577×1.2×2.578≈2.92e7` 是研究 flat-factor 手搓分解（vi-95.md 标注「非代码产出」），对照游戏善良榜样「叠层系数」。代码实际 damage:hero pool 聚合蔚全部 damage signal（含 buff_upgrade 修饰按 base.value 折算进 addPercent），与游戏单能力叠层系数非直接可比。逐项 `multiplierChecks`（per-signal 16384/576）是有效自动化校准；pool 级 `calibrationTarget` 当前不作为断言。
- **蔚角色定位**：蔚是善良榜样的**提供者（support）**，非自身 carry。善良榜样 `target=geneutral`（伦理中立阵营），蔚自身 `Neutral Good` 无 geneutral 标签。早期参照把蔚当 carry 吃自身善良榜样是概念错误，已修正参照数据与测试（geneutral mock carry + 蔚 support）。
- **heroDpsMultiplier 阵型 buff 定位缺陷（核心评分 bug，已修）**：`attachSignalSemantics` 曾对 `targets:['all']` 的 relation='any' 设 positionQualifier=null，被 `resolvePositionRelation` 当 heroDpsMultiplier 类型默认 'self'，导致 support 位的阵型 hero_dps buff（蔚善良榜样等）永不对 carry 生效。已修：`targets:['all']` 显式设 `{relation:'any'}`（见 vi-95.md「评分链路修复记录」）。手搓测试信号曾用 carry=support=同槽位 + 塞 geneutral 双重掩盖此缺陷——真实数据端到端测试组已补齐。

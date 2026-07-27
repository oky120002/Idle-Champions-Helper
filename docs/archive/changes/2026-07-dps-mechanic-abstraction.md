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
- 本 change Status → Landed → 已移 `archive/changes/`
- **specs/ 永不引用本 milestone**（规范描述最终态，不描述交付过程）

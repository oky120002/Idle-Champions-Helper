# 自动阵型计划器架构

## 系统定位

planner 是个人成长导向阵型决策台的核心模块：在用户当前拥有英雄、装备、feat、传奇、专精与场景限制下，自动推荐较优的上场英雄与站位。不做黑盒全自动最优解，按本地优先、可解释、可验证原则，输出可追溯的推荐结果与加成拆解。

## 三层架构

能力表达、加成聚合、优化目标分层是 planner 的核心设计原则：

```text
能力表达层（HeroAbility）    统一英雄能力模型，hero-agnostic；把官方散落 effect 解析为结构化 signal
  ↓
加成聚合层（placementFit）    pool 结构聚合：pool 内 add 相加 / mult 相乘，pool 间乘法
  ↓
优化目标层（objective）       每种推荐模式用真实目标量（GameNumber），输出层字段 objectiveValue
  ↓
搜索层（beamSearch）          按 objective 最大化做 deterministic beam search
```

关键约束：

- placementFit 是 pool 聚合器，不产出启发式「评分」；旧 `score` / `heuristicRoleMultiplier` / `isCarryViable` 已淘汰。
- 每种模式用真实目标量：carry-dps 模式 = `carryDps`；team-gold 模式 = `teamGoldFind`。
- 算法与英雄的握手点唯一：`HeroAbilityProfile`。
- 任何无法静态计算的变量进入 `warnings`，不静默计入 `objectiveValue`。

## 目标架构与目录

```text
public/data/v1/*              公共游戏基座数据
public/data/v1/{hero-abilities,scenarios,semantic-overrides}.json  推荐专用归一化模型
browser credential input       用户手动输入的凭证，只在前端内存中使用
IndexedDB user snapshot        归一化私人账号快照
IndexedDB planner overrides    浏览器本地 planner 语义覆盖
src/domain/simulator/*         数字层、基线、effect、稳态 DPS
src/domain/planner/*           场景、候选池、合法性、搜索和排序
src/pages/planner/*            自动计划工作台 UI
scripts/private-user-data/*    本机开发私有抓取和泄漏扫描
```

页面层只编排状态和展示。凭证解析、官方只读 client、用户快照、模拟器和 planner 搜索都放在邻近领域模块，避免把长规则写进 JSX。

目录职责：

- `src/data/user-sync/`：官方只读 client、allowlist、同步状态、payload normalizer。
- `src/data/user-profile-store/`：IndexedDB snapshot store 与可选 credential vault。
- `public/data/v1/{hero-abilities,scenarios,semantic-overrides}.json`：推荐引擎直接消费的归一化模型。
- `scripts/data/semantic-overrides.json`：仓库跟踪的推荐语义补丁。
- `src/domain/user-profile/`：`UserProfileSnapshot`、`OwnedChampionState`、`ImportedFormationSave`、装备、feat、传奇和 warning 类型。
- `src/domain/abilities/`：能力表达层——`HeroAbilitySignal`、`ResolvedHeroAbilityProfile`、build→JSON→runtime 边界类型。
- `src/domain/simulator/`：`GameNumber`、最后专精基线、金币预算基线、`baseDps`/`BUD`/`survival` 计算、稳态 DPS 模拟。
- `src/domain/planner/`：变体限制投影（`variantConstraints`）、候选池、假设英雄公平基线、阵型合法性、beam search 和结果模型。
- `src/pages/planner/`：profile 状态面板、场景选择、候选模式、基线输入、结果卡和保存 preset 操作。
- `scripts/private-user-data/`：敏感扫描、私有 env loader、私有快照 manifest。

## 命名约定

通用符号（英雄能力、数据产物）去除 `Planner` 前缀，专属推荐引擎模块保留：

- 能力层类型与函数去前缀：`HeroAbilitySignal`、`matchesHeroQualifier`、`attachSignalSemantics`、`normalizeEffectSignal`、`buildOfficialHeroModel`、`resolveHeroAbilityProfiles`。
- JSON 产物与 IndexedDB key 按通用性命名：`hero-abilities.json`、`scenarios.json`、`semantic-overrides.json`；IndexedDB store `heroAbilityOverrides`。
- 推荐引擎模块保留 `planner` 命名（`src/domain/planner/`：recommendationEngine / beamSearch / steadyStateScoring / candidatePool / placementFit），「阵型推荐引擎」职责在此命名准确。

## BUD 与 DPS 的取舍

BUD（Biggest Unique Damage）= 阵型近期最高单次伤害。

- 阵型推荐（相对比较）：DPS 足够，planner 用 `carryDps` 近似优化。
- 推图层数预估（绝对值）：IC 怪物血量按 BUD 缩放；用 DPS 近似会偏差，BUD 更准。

两者都计算、都展示。BUD 公式与绝对值校准证据见 `docs/research/data/planner/bud-calibration.md`；推图层数预估算法见 `computation-runtime.md`。

## 模拟/UI 分离

模拟引擎全部在 `src/domain/planner/` + `src/domain/simulator/` + `src/domain/abilities/`，零 React/UI 依赖。两个纯函数入口共享 `resolvePlannerScenario` 做 variant→scenario 与 blocker 解析：

- `buildPlannerRecommendation(variant, collections, profile, options)`：beam search 找 Top K 最佳阵型。
- `evaluateFormation(variant, collections, profile, placements, options)`：评估用户指定的单一阵型（不搜索），输出完整拆解。

CLI 证明「丢 UI 输出 JSON」：`npm run simulate -- recommend|evaluate`（`scripts/simulator/simulate.ts`）读 `public/data/v1/*.json` → 引擎 → stdout JSON。无 `--profile` 时合成「全英雄已拥有（level 1）」快照演示完整链路。

## 深入阅读

- 数据、隐私、目录与存储：`data-and-privacy.md`
- 推荐英雄、站位、模型字段与 merge 策略：`recommendation.md`
- 数字层、基线、加成聚合与计算模式：`simulator.md`
- Web Worker、推图预估、输出合同与 UI：`computation-runtime.md`

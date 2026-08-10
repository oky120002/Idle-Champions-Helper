# 自动阵型计划器架构

## 系统定位

planner 是最佳阵型自动推算工具的核心模块：在用户当前拥有英雄、装备、feat、传奇、专精与场景限制下，自动推算最优上场英雄与站位。按本地优先、可解释、可验证原则，输出可追溯的推算结果与加成拆解。

## 计算约束

planner 的根本目标是帮用户找到「当前英雄 × 当前阵型」最优配置，最大化输出（carry-dps）/ 金币（team-gold）/ 速度（team-speed）效益。

投影模式、外部加成入参契约、取值口径、加成建模正确性原则、Hermetic 边界、数据分类铁律等开发硬约束见 `computation-constraints.md`。

## 入参契约

下表登记全部入参的代码消费状态。`consumed` = 已接入评估链路。

**A. 基础数据（`PlannerCollections`，启动加载 / 缓存，非 per-call）**

| 字段 | 状态 |
|---|---|
| `plannerHeroes` / `plannerScenarios` | consumed（`updateCollections` 缓存） |
| `featCatalog` / `specializationCatalog` | consumed（`applyActiveFeats` / `applyActiveSpecializations` 按玩家选择注入 profile） |
| signal 解锁等级 `required_level` | consumed（烘进 `HeroAbilitySignal.requiredLevel`） |
| loot-catalog / effect-definitions / patron-perks catalog / legendary-effects-catalog | consumed（`buildScoringBonusInputs` 装配外部加成） |
| 怪物 / BUD 曲线 | consumed（`monsterStats.ts` 内联全局常量） |

**B. 动态状态（per-call `PlannerEvaluateInput` / `options`）**

| 字段 | 状态 |
|---|---|
| `placements` / `variant` / `heroLevels`（取自 `ownedHeroes.level`，未拥有按 `DEFAULT_CARRY_LEVEL=1`） | consumed |
| `scoringMode` / `candidateMode` / `computationMode` / `beamWidth` | consumed |
| `lockedCarryHeroId` / `lockedSlots` | consumed |
| `manualStackCount`（动态层数假设） | consumed |
| `aggregateProjection`（投影模式开关） | consumed |
| `globalBuffMultiplier`（patron + blessing 账号级 global_dps） | consumed（`buildScoringBonusInputs` 合成） |
| `equipmentAdjustmentByHero`（hero_dps） / `equipmentHealthByHero` / `equipmentGlobalDpsByHero` / `equipmentGoldByHero` / `equipmentCritByHero` | consumed（装备五通道，placement-aware / per-carry） |
| `equipmentBuffsByHero`（buff_upgrade wrapper，按 target upgradeId 反查 base 注入 profile） | consumed |
| `externalHeroDpsContributions`（patron / blessing 的 effect_def hero_dps） | consumed |
| `profileSnapshot.activeContext`（patronId / deity，过滤 type1 patron / 地图 blessing） | consumed |

## 未接入能力

架构层当前未接入评估的能力边界（细节见各专题文档）：等级基线估算（`simulator.md`）、familiar / modron 状态（入参契约表登记，未消费）。其余按主题归位：ult / click / modron 辅助指标（`computation-runtime.md`）、数值表达式（`expression-evaluator.md`）、speed 优化模式（`simulator.md`）、尚不支持的 carry / 计数条件（`recommendation.md`）、孤儿机制扫描（`dps-mechanic-abstraction.md`）。

## 决策记录（ADR）

决策 why 在 ADR，最终态在本目录各专题 spec。ADR 位于 `docs/decisions/`：

- `0008` 加成机制按自然形态隔离（不引入统一接口 / 注册表）
- `0009` 真实目标量 carryDps + pool 聚合 + beam search（淘汰启发式 / 黑盒）
- `0010` hermetic 入参契约（纯函数，永不读登录态 / 数据源）
- `0011` 投影模式 aggregateProjection（阵型倍率 vs 绝对 DPS 双模）
- `0012` BUD vs DPS（相对比较用 DPS，绝对推图用 BUD）
- `0013` DPS 机制抽象阈值（≥2 通用路径，>10 升级注册表）
- `0014` GameNumber 用 decimal.js
- `0015` 英雄参照作重构回归守护（非绝对精度标尺）
- `0016` 性能策略：候选裁剪 + Worker 卸载（否决增量求值 / 降 beam）
- `0017` 专精外部选择（build catalog + runtime 按玩家选择注入）

## 三层架构

能力表达、加成聚合、优化目标分层是 planner 的核心设计：

```text
能力表达层（HeroAbility）    统一英雄能力模型，hero-agnostic；把官方散落 effect 解析为结构化 signal
  ↓
加成聚合层（placementFit）    pool 结构聚合：pool 内 add 相加 / mult 相乘，pool 间乘法
  ↓
优化目标层（objective）       每种推荐模式用真实目标量（GameNumber），输出层字段 objectiveValue
  ↓
搜索层（beamSearch）          按 objective 最大化做 deterministic beam search
```

- placementFit 是 pool 聚合器，不产出启发式「评估」。
- 每种模式用真实目标量：carry-dps = `carryDps`；team-gold = `teamGoldFind`。
- 算法与英雄的握手点唯一：`HeroAbilityProfile`。
- 任何无法静态计算的变量进入 `warnings`，不静默计入 `objectiveValue`。

## 目标架构与目录

```text
public/data/v1/*              公共游戏基座数据
public/data/v1/{hero-abilities,scenarios,semantic-overrides}.json  推荐专用归一化模型
browser credential input       用户手动输入的凭证，只在前端内存中使用
IndexedDB user snapshot        归一化私人账号快照
IndexedDB planner overrides    浏览器本地 planner 语义覆盖
src/domain/abilities/*         能力表达层（HeroAbilitySignal / ResolvedHeroAbilityProfile）
src/domain/simulator/*         数字层、基线、effect、稳态 DPS 公式
src/domain/buffs/*             外部加成 provider（装备 / patron / blessing / effect_def 解引用）
src/domain/planner/*           场景、候选池、合法性、搜索和排序
src/pages/planner/*            自动计划工作台 UI
scripts/private-user-data/*    本机开发私有抓取和泄漏扫描
```

页面层只编排状态和展示。凭证解析、官方只读 client、用户快照、模拟器和 planner 搜索都放在邻近领域模块，避免把长规则写进 JSX。

## 命名约定

通用符号（英雄能力、数据产物）去除 `Planner` 前缀，专属推算引擎模块保留：

- 能力层类型与函数去前缀：`HeroAbilitySignal`、`matchesHeroQualifier`、`attachSignalSemantics`、`resolveHeroAbilityProfiles`。
- JSON 产物与 IndexedDB key 按通用性命名：`hero-abilities.json`、`scenarios.json`、`semantic-overrides.json`；IndexedDB store `heroAbilityOverrides`。
- 推算引擎模块保留 `planner` 命名（`src/domain/planner/`：recommendationEngine / beamSearch / steadyStateScoring / candidatePool / placementFit）。

## BUD 与 DPS 的取舍

BUD（Biggest Unique Damage）= 阵型近期最高单次伤害。

- 阵型推荐（相对比较）：DPS 足够，planner 用 `carryDps` 近似优化。
- 推图层数预估（绝对值）：IC 怪物血量按 BUD 缩放；用 DPS 近似会偏差。

两者都计算、都展示。当前 BUD 用 best carry 的单次伤害近似（`budCalculation.ts`，carry 通常设 BUD）；绝对值未校准，推图层数预估依赖校准才闭环。BUD 公式与校准证据见 `docs/research/data/planner/bud-calibration.md`；推图层数预估算法见 `computation-runtime.md`。

## 模拟 / UI 分离

模拟引擎全部在 `src/domain/planner/` + `src/domain/simulator/` + `src/domain/abilities/`，零 React / UI 依赖。两个纯函数入口共享 `resolvePlannerScenario` 做 variant → scenario 与 blocker 解析，入参统一为 `PlannerInput`（`variant` / `collections` / `profileSnapshot` / `placements` / `options`）：

- `buildPlannerRecommendation(input)`：beam search 找 Top K 最佳阵型。
- `evaluateFormation(input)`：评估用户指定的单一阵型（不搜索），输出完整拆解。

两入口共用 `scorePlannerFormation`（`recommendationEngine.ts`）调 `scoreFormation`，结构性锁定透传一致。

CLI 证明「丢 UI 输出 JSON」：`npm run simulate -- recommend|evaluate`（`scripts/simulator/simulate.ts`）读 `public/data/v1/*.json` → 引擎 → stdout JSON。无 `--profile` 时合成「全英雄已拥有（level 1）」快照演示完整链路。

## 深入阅读

- 开发硬约束（投影模式 / 外部加成契约 / 取值口径 / Hermetic 边界 / 数据分类）：`computation-constraints.md`
- 数据、隐私、目录与存储：`data-and-privacy.md`
- 推荐英雄、站位、模型字段与条件匹配：`recommendation.md`
- 数字层、加成聚合与评估维度 / Web Worker、推图预估、输出合同与 UI：`simulator.md` / `computation-runtime.md`

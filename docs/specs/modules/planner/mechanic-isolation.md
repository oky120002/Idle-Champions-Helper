# 加成机制隔离架构

## 目标

高内聚低耦合：一个机制 / provider / resolver / dimensionFactor 一个文件 + 一个测试。隔离后每个单元可独立单测、不易出错；新机制加文件 + 测试即可、新英雄自动可用。计算器入参由外部构建「英雄启用了哪些加成」，计算器纯函数算结果。

## 四种同构隔离模式

四种隔离模式结构同构——`{识别, 匹配, 解析/贡献}` + 派发 + 单测；上下文经接口注入（避循环依赖 + 测试 mock）。

| 模式 | 阶段 | 职责 | 位置 | 状态 |
|---|---|---|---|---|
| EffectResolver | build | effect_string → `HeroAbilitySignal` | `scripts/data/effect-resolvers/` | 已实现 |
| MechanicResolver | runtime | signal → 乘数（`resolveSignalMultiplier` 拆分） | `src/domain/planner/mechanics/` | 计划 |
| DimensionFactor | scoring | 维度聚合（damage/gold/crit/vuln/survival） | `src/domain/planner/scoring/` | 部分实现 |
| BonusProvider | 加成来源 | profile / scoring 贡献 | `src/domain/simulator/buffs/` | 计划 |

## 模式 1：EffectResolver（已实现）

build 期把官方 effect_string 解析为结构化 signal。`resolverDispatch.ts` 的 `normalizeEffectSignal` 是入口：signalPreset 短路 → 数值解析（`resolveNumericValue`）→ 派发表首匹配 → unsupported。派发表各 resolver 处理的 effect 名族互斥，顺序不改变结果；新增机制登记一行即可。

```text
scripts/data/effect-resolvers/
  resolverShared.ts       共享类型（EffectResolveContext / EffectSignalResult / SignalBucket）
                          + 共享 helper（makeUnsupported / buildSimplePoolSignal / resolveBucket /
                          resolveCountRelation / parseTagQualifierFromArg / resolveNumericValue）
  dpsResolver.ts          DPS 池（global_dps_multiplier_mult / hero_dps_* per-target/per-tagged/per-crusader/per-col-behind）
  adjacentResolver.ts     adjacent_* 邻位 buff
  goldResolver.ts         金币池（gold_multiplier_mult / gold_mult_per_tagged_crusader_mult）
  critResolver.ts         暴击池（chance/damage × global/hero，表驱动）
  survivalResolver.ts     生存池（health/healing/damage_reduction，表驱动）
  vulnerabilityResolver.ts 易伤池（动态 monster tag + 条件性 tag 表）
  speedResolver.ts        速度/冷却池（attack_speed/cooldown，表驱动）
  tagResolver.ts          tag_* 标签 buff
  resolverDispatch.ts     normalizeEffectSignal + 派发表
```

边界：buff_upgrade 展开（`collectEffectEntries` / `resolveBuffUpgradeSeed` / `analyzeBuffUpgradeWrappers`）仍在 `scripts/data/effect-helpers.ts`——它消费 EffectResolver 产出的 base signal 派生 wrapper signal，属 entry 收集层而非解析层。`effect-helpers.ts` re-export `normalizeEffectSignal`，外部调用方（build-models / signal-coverage / feat-catalog）零改动。

### 测试

每个 resolver 一个 `.test.ts`（`resolverTestFixtures.ts` 提供共享 `buildResolveContext`），覆盖：

- 等价类：effect 名族 → kind / amountFunc(add|mult|null) / bucket(carry|support)。
- qualifier：per_target_crusader 位置关系、per_tagged 标签计数、per_crusader filter_targets 目标限定。
- 边界：value=0 / 负值原样透传；缺 qualifier → unsupported；不匹配名 → null。

回归守护：`scripts/data/signalCoverage.test.ts`（解析总量不变）+ `build-models.test.ts`（collectEffectEntries 端到端）+ `effect-helpers.test.ts`（normalizeEffectSignal dispatch 入口）。

## 模式 2：维度因子（部分实现）

`steadyStateScoring.ts` 的维度聚合因子隔离到 `src/domain/planner/scoring/`，每个有独立聚合逻辑的因子一个文件 + 单测：

```text
src/domain/planner/scoring/
  poolAggregation.ts       mergePools（同 dimension:scope addPercent 相加/multFactor 相乘）
                          + productOfPoolMultipliers（pool 间乘积）；damage/survival/gold 共用
  critFactor.ts            computeCritFactor（1+chance×(dmg−1) 期望公式，基线归一）+ crit 常量
  vulnerabilityFactor.ts   computeVulnerabilityFactor（(1+Σadd/100)×Πmult）+ isVulnerabilityMatched
                          （active + monsterTags 与场景 enemyTypes 条件匹配）
```

`steadyStateScoring.ts` 保留 `scoreFormation`（主循环编排）+ `scoreTeamGold`（team-gold 模式）+ 全部 public 类型，从 `scoring/` import 因子。

**偏差（相对原计划「dimensionFactor 接口 + damage/gold/crit/vulnerability/survival 各一文件」）**：

- 不引入 `DimensionFactor` 统一接口：damage/survival/gold 是 pool 聚合的应用（无独立逻辑），crit/vuln 是公式因子——两类形状不同，强塞统一接口会掩盖差异（且 contribution 拆解跨维度，接口泄漏）。按各自自然形态落地。
- 不建 damageFactor/survivalFactor 文件：它们 = `productOfPoolMultipliers(pool)`，无独立逻辑，建空壳是无效层级。
- `scoreTeamGold` 留 `steadyStateScoring`：抽出会与 ScoringInput/ScoringResult/DEFAULT_CARRY_LEVEL 循环依赖（需额外 scoringTypes 迁移），且已由 `steadyStateScoring.test.ts` 端到端覆盖，成本高于收益。

### 测试

- `critFactor.test.ts`：期望公式（无 crit→1 / chance add / damage mult / 混合 / global=hero chance / active 才计入），精确值 + 基线归一。
- `vulnerabilityFactor.test.ts`：add/mult 聚合 + **两个 +100% 易伤 = 3（原累乘 bug 算成 4）回归** + add/mult 混合 + isVulnerabilityMatched（无条件/单 tag 命中/未命中/多 tag OR/非 active）。
- `poolAggregation.test.ts`：同 key addPercent 相加/multFactor 相乘、不同 key 独立、合并交换律、pool 间乘积、空 Map→1。

回归守护：`steadyStateScoring.test.ts`（scoreFormation 端到端，含 crit/vuln/team-gold/globalBuff/projection）+ `placementFit.test.ts`（103 案例）+ `references/damageReferenceVerification.test.ts`（明斯克 golden，偏差不退化）。

## 复用（不动）

`HeroAbilitySignal` 字段（依赖建模已完整）/ `STACK_COUNT_RESOLVERS` / `applyHeroAbilityPatch` / `applyFeatsToProfile` + `selectFeatSignals` / `compute/plannerCompute`（worker 健康样板）。

## 关联

- 机制抽象阈值（`>10` 升级策略注册表是 MechanicResolver 的升级路径）：`dps-mechanic-abstraction.md`
- build 管线规则（解析层 amountFunc 约定 / build 改动重跑 / 增量跳过）：`docs/specs/guidelines/data-normalization.md`

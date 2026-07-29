# 加成机制隔离架构

## 目标

高内聚低耦合：一个机制 / provider / resolver / dimensionFactor 一个文件 + 一个测试。隔离后每个单元可独立单测、不易出错；新机制加文件 + 测试即可、新英雄自动可用。计算器入参由外部构建「英雄启用了哪些加成」，计算器纯函数算结果。

## 四种同构隔离模式

四种隔离模式结构同构——`{识别, 匹配, 解析/贡献}` + 派发 + 单测；上下文经接口注入（避循环依赖 + 测试 mock）。

| 模式 | 阶段 | 职责 | 位置 | 状态 |
|---|---|---|---|---|
| EffectResolver | build | effect_string → `HeroAbilitySignal` | `scripts/data/effect-resolvers/` | 已实现 |
| MechanicResolver | runtime | signal → 乘数（`resolveSignalMultiplier` 拆分） | `src/domain/planner/mechanics/` | 计划 |
| DimensionFactor | scoring | 维度聚合（damage/gold/crit/vuln/survival） | `src/domain/planner/scoring/` | 计划 |
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

## 复用（不动）

`HeroAbilitySignal` 字段（依赖建模已完整）/ `STACK_COUNT_RESOLVERS` / `applyHeroAbilityPatch` / `applyFeatsToProfile` + `selectFeatSignals` / `compute/plannerCompute`（worker 健康样板）。

## 关联

- 机制抽象阈值（`>10` 升级策略注册表是 MechanicResolver 的升级路径）：`dps-mechanic-abstraction.md`
- build 管线规则（解析层 amountFunc 约定 / build 改动重跑 / 增量跳过）：`docs/specs/guidelines/data-normalization.md`

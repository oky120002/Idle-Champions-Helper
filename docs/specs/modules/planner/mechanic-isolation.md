# 加成机制隔离架构

## 目标

高内聚低耦合：一个机制 / provider / resolver / dimensionFactor 一个文件 + 一个测试。隔离后每个单元可独立单测、不易出错；新机制加文件 + 测试即可、新英雄自动可用。计算器入参由外部构建「英雄启用了哪些加成」，计算器纯函数算结果。

## 四种同构隔离模式

四种隔离模式结构同构——`{识别, 匹配, 解析/贡献}` + 派发 + 单测；上下文经接口注入（避循环依赖 + 测试 mock）。

| 模式 | 阶段 | 职责 | 位置 |
|---|---|---|---|
| EffectResolver | build | effect_string → `HeroAbilitySignal` | `scripts/data/effect-resolvers/` |
| MechanicResolver | runtime | signal → 乘数（`resolveSignalMultiplier` 拆分） | `src/domain/planner/mechanics/` |
| DimensionFactor | scoring | 维度聚合（damage/gold/crit/vuln/survival） | `src/domain/planner/scoring/` |
| BonusProvider | 加成来源 | effect_def 解引用 / hero_dps / globalBuff / 装备 / 装配 | `src/domain/buffs/` |

四模式均按各自自然形态落地，**不引入统一接口 / 注册表**——各模式输出形态根本不同（pool 聚合 / 公式因子 / 数值 / per-hero map / per-carry 列表），强塞统一接口会掩盖差异（决策依据 ADR 0008）。机制总数未达升级线（`dps-mechanic-abstraction.md` 阈值 4：>10 才升级策略注册表），保持字段分支分发。

## 模式 1：EffectResolver

build 期把官方 effect_string 解析为结构化 signal。`resolverDispatch.ts` 的 `normalizeEffectSignal` 是入口：signalPreset 短路 → 数值解析（`resolveNumericValue`）→ 派发表首匹配 → unsupported。派发表各 resolver 处理的 effect 名族互斥，顺序不改变结果；新增机制登记一行即可。

```text
scripts/data/effect-resolvers/
  resolverShared.ts       共享类型（EffectResolveContext / EffectSignalResult / SignalBucket）
                          + 共享 helper（makeUnsupported / buildSimplePoolSignal / resolveBucket /
                          resolveCountRelation / parseTagQualifierFromArg / resolveNumericValue）
  dpsResolver.ts          DPS 池（global_dps_multiplier_mult / hero_dps_* per-target/per-tagged/per-crusader/per-col-behind）
  goldResolver.ts         金币池（gold_multiplier_mult / gold_mult_per_tagged_crusader_mult）
  critResolver.ts         暴击池（chance/damage × global/hero，表驱动）
  survivalResolver.ts     生存池（health/healing/damage_reduction，表驱动）
  vulnerabilityResolver.ts 易伤池（动态 monster tag + 条件性 tag 表）
  speedResolver.ts        速度/冷却池（attack_speed/cooldown，表驱动）
  resolverDispatch.ts     normalizeEffectSignal + 派发表
```

边界：buff_upgrade 展开（`collectEffectEntries` / `resolveBuffUpgradeSeed` / `analyzeBuffUpgradeWrappers`）在 `scripts/data/effect-helpers.ts`——它消费 EffectResolver 产出的 base signal 派生 wrapper signal，属 entry 收集层而非解析层。`effect-helpers.ts` re-export `normalizeEffectSignal`，外部调用方（build-models / signal-coverage / feat-catalog）零改动。

### 测试

每个 resolver 一个 `.test.ts`（`resolverTestFixtures.ts` 提供共享 `buildResolveContext`），覆盖：

- 等价类：effect 名族 → kind / amountFunc(add|mult|null) / bucket(carry|support)。
- qualifier：per_target_crusader 位置关系、per_tagged 标签计数、per_crusader filter_targets 目标限定。
- 边界：value=0 / 负值原样透传；缺 qualifier → unsupported；不匹配名 → null。

回归守护：`scripts/data/signalCoverage.test.ts`（解析总量不变）+ `build-models.test.ts`（collectEffectEntries 端到端）+ `effect-helpers.test.ts`（normalizeEffectSignal dispatch 入口）。

## 模式 2：DimensionFactor

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

设计取舍：不引入 `DimensionFactor` 统一接口——damage / survival / gold 是 pool 聚合的应用（无独立逻辑，= `productOfPoolMultipliers(pool)`），crit / vuln 是公式因子，两类形状不同；强塞统一接口掩盖差异、为 pool 聚合建空壳文件是无效层级。`scoreTeamGold` 留 `steadyStateScoring`（抽出会与 `ScoringInput` / `ScoringResult` / `DEFAULT_CARRY_LEVEL` 循环依赖，已由 `steadyStateScoring.test.ts` 端到端覆盖）。

### 测试

- `critFactor.test.ts`：期望公式（无 crit→1 / chance add / damage mult / 混合 / global=hero chance / active 才计入），精确值 + 基线归一。
- `vulnerabilityFactor.test.ts`：add / mult 聚合 + 两个 +100% 易伤 = 3（非 4）+ add / mult 混合 + isVulnerabilityMatched（无条件 / 单 tag 命中 / 未命中 / 多 tag OR / 非 active）。
- `poolAggregation.test.ts`：同 key addPercent 相加 / multFactor 相乘、不同 key 独立、合并交换律、pool 间乘积、空 Map→1。

回归守护：`steadyStateScoring.test.ts`（scoreFormation 端到端，含 crit / vuln / team-gold / globalBuff / projection）+ `placementFit.test.ts`（103 案例）+ `references/damageReferenceVerification.test.ts`（明斯克 golden，偏差不退化）。

## 模式 3：MechanicResolver

`placementFit.ts` 的 `resolveSignalMultiplier`（signal → 乘数）+ `STACK_COUNT_RESOLVERS`（叠层计数 dispatch）隔离到 `src/domain/planner/mechanics/`，解锁直接单测：

```text
src/domain/planner/mechanics/
  signalMultiplier.ts      resolveSignalMultiplier（字段分支分发）+ percentToMultiplier/invertEffectMultiplier
                          + DEFAULT_MANUAL_STACK_COUNT
  stackCountResolver.ts    STACK_COUNT_RESOLVERS（stackFunc → 计数来源 mini-DSL）+ 计数 helper
```

`placementFit.ts` 保留 `evaluatePlacementFit`（阵型合法性 + pool 聚合主循环），import resolveSignalMultiplier，re-export STACK_COUNT_RESOLVERS / DEFAULT_MANUAL_STACK_COUNT 保持外部零改动。

设计取舍：不引入 MechanicResolver 注册表——`dps-mechanic-abstraction.md` 阈值 4 明确机制总数 >10 才把字段分支升级为策略注册表，当前 7 机制属过度工程。模式核心价值是机制可测性——`resolveSignalMultiplier` 有直接单测覆盖路径分支与 buff_upgrade modifier 折算（22× 高估回归 bug 的发现与守护靠此单测）。

### 测试

- `signalMultiplier.test.ts`：applyManually 守卫 / plain-percent / dynamic-stack-multiply（manualStackCount 缺省=1000 + 溢出降级）/ bonusScaleOfSignal 折叠用 base.value 非聚合倍率（22× 高估回归：base mult 4 时修饰=2 非 4）/ 依赖三态（生效·multiplier≤1·不可解析）/ formation-count amountFunc add·mult 等价类 / 未知 stackFunc·amountFunc 降级。
- `stackCountResolver.test.ts`：keys 契约（与 scoringSupportSync 守护一致）/ per_crusader 计数匹配英雄 / excludeSelf / 缺上下文→null。

回归守护：`placementFit.test.ts`（103 案例，行为零变化）+ `steadyStateScoring.test.ts` + 明斯克 golden（偏差不退化）+ `championReferenceVerification.test.ts`（机制 id 三处一致，代码注释 leg 现扫描 placementFit.ts + mechanics/ + effect-helpers.ts）。

## 模式 4：BonusProvider

加成来源隔离到 `src/domain/buffs/`：从外部 catalog + 用户存档装配 scoring 入参的外部加成，与 simulator 公式层分离。simulator/ 只保留纯公式（DPS / 生存 / 怪物曲线 / 大数），不含 provider。

```text
src/domain/buffs/
  effectDefinitionDps.ts     effect_def,<id> 运行时解引用（消费 effect-definitions.json）
                            + parseEffectKind / resolveEffectKeyValue
  externalHeroDpsMult.ts     collectHeroDpsContributions（effect_def hero_dps per-carry + filter 解析）
  patronPerkGlobalBuff.ts    patron perk actual level 的 global_dps add pool + collectActivePatronPerkEffects
  blessingGlobalBuff.ts      blessing actual level 的 global_dps add pool + collectActiveBlessingEffects
                            + combineGlobalBuffMultipliers（多 global_dps 源合并同 pool）
  equipmentMult.ts           装备加成五通道 + buff_upgrade wrapper 元数据（hero_dps/health/global_dps/gold/crit 加性 + wrapper）
```

`buffs/` 作 `simulator/` 兄弟目录（非嵌套 `simulator/buffs/`）：simulator 公式层与 buffs provider 层单向依赖，buffs → {effects, abilities} 的语义解析是合法方向；simulator 对 buffs/ 无依赖（纯公式层，仅 baseDps / survivalCalculation 对 abilities/abilityModel 的 type-only import）。`hermeticBoundary.test.ts` 第三规则守护：simulator 非测试文件不得 import `../effects/` 或 `../abilities/signalSemantics`（公式不解析 effect 语义）。

装配下沉：`buildScoringBonusInputs`（`src/domain/planner/scoringBonusInputs.ts`）是唯一装配点，从 `profileSnapshot` + 各 catalog 编排 provider 输出，按通道填入 `ScoringInput`（装备 map / globalBuff 合并 / externalHeroDps 列表 / equipmentBuffs wrapper）。属编排逻辑而非 provider 逻辑，集中恰当。

设计取舍：不引入统一 `BonusProvider` 接口——provider 输出形态根本不同：patron / blessing → `number`（global_dps add pool）、equipment → `Map<heroId, number>` 或 `Map<heroId, EquipmentBuff[]>`（per-hero）、externalHeroDps → `HeroDpsContribution[]`（per-carry 条件）。统一 `contribute() → ProviderContribution` 需多形态 contribution（`{globalPool?, perHero?, perCarry?}`），是接口泄漏（与模式 2 拒绝 DimensionFactor 同理）。两条消费路径也不同：外部加成走 `ScoringInput` 字段，feat / 专精 / 装备 buff wrapper 走 profile-patch（改 heroById），单一接口跨不了。crit / vuln 是 scoring 维度因子（模式 2 的 `scoring/`），非加成来源，不进 buffs/。

### 测试

- 每个 provider 一个 co-located `.test.ts`，随模块落 buffs/。
- `scoringBonusInputs.test.ts`：装配契约（null profile→全默认 / 空 catalog→默认 / patron global_dps→globalBuff / effect_def hero_dps→externalHeroDps / type1 active 过滤透传 / owned loot→equipment map）。
- `hermeticBoundary.test.ts` 第三规则：simulator 不得 import effects/ 或 abilities/signalSemantics。

回归守护：`test:simulator`（glob 含 `src/domain/simulator/` + `planner/` + `buffs/` + smoke）+ 明斯克 golden（`references/damageReferenceVerification`，偏差不退化）。

## 关联

- 决策依据：`docs/decisions/0008-planner-mechanic-isolation-no-unified-abstraction.md`（四模式不引入统一接口 / 注册表）
- 机制抽象阈值（`>10` 升级策略注册表是 MechanicResolver 的升级路径）：`dps-mechanic-abstraction.md`
- build 管线规则（解析层 amountFunc 约定 / build 改动重跑 / 增量跳过）：`docs/specs/guidelines/data-normalization.md`

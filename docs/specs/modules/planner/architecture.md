# 自动阵型计划器架构

## 系统定位

planner 是最佳阵型自动推算工具的核心模块：在用户当前拥有英雄、装备、feat、传奇、专精与场景限制下，自动推算最优上场英雄与站位。按本地优先、可解释、可验证原则，输出可追溯的推算结果与加成拆解。

## 计算原则

planner 的根本目标是帮用户找到「当前英雄 × 当前阵型」最优配置，最大化输出（carry-dps）/ 金币（team-gold）效益。以下原则是所有 planner 开发的硬约束。

### 投影模式（约束②）

阵型模拟器本质是「阵型内 signal 聚合器」，外部全局加成（祝福 / 赞助者）不属于阵型。加入参开关 `aggregateProjection`：

- `'absolute-dps'`（默认）：`objectiveValue` = baseDamage × levelCurve × globalBuff × heroDpsPool × damagePool × crit × vuln。globalBuff / heroDpsPool 是 ability 池与外部加成（patron / blessing / 装备）同 key 加法合并后的 unified 池；damagePool 为残余非 global / hero 池。绝对量未校准，作 BUD 校准回归基线。
- `'formation-buff'`：`objectiveValue` = 阵型内 ability 聚合因子（globalBuff × heroDpsPool × damagePool × crit × vuln，池为 ability-only 不含外部加成），**不含** baseDamage / levelCurve / 外部加成。外部加成注入只发生在 absolute-dps。

命名锁：**禁止复用 `ComputationMode`**——该名已用于 beam-search 候选裁剪（`computationMode.ts`，`full|p90|…|p50`），两者正交。

### 外部加成入参契约（约束③）

计算器不管调用方登没登录，只看入参是否传入。**未传的加成入参按其语义的数学单位元回退，贡献 0 加成（等价跳过该能力）**，绝不臆造数值：

| 语义 | 入参 | 未传时回退 | 为何是此值 |
|---|---|---|---|
| multiplier（1+Σ/100） | `globalBuffMultiplier` / `equipmentAdjustmentByHero` / `equipmentHealthByHero` | **1** | 乘法单位元；`steadyStateScoring.ts` 内 `(mult−1)×100` 折算为 0% addPercent |
| addPercent（Σ%） | `equipmentGlobalDpsByHero` / `equipmentGoldByHero` | **0** | 加法单位元；`sumPlacedEquipmentAddPercent` 空 map → 返回 0 |
| 列表 / 对象 | `externalHeroDpsContributions` / `equipmentCritByHero` / `equipmentBuffsByHero` | **空** | 空数组 / undefined → 循环不执行 / 判空跳过 |

multiplier 类回退 1 **不是「加 1」**——代码统一 `(mult−1)×100` 折算成 addPercent，1 折算为 0%；addPercent 类回退 0；列表类回退空。三者殊途同归：**未传 = 0 贡献 = 不进 pool = 跳过该能力加成**。

是否传由调用方决定（UI / 测试 mock）。计算器**永不读取登录态、永不直接读取 user profile**——祝福 / favor / patron 已由 `userProfileNormalizer` 保留进 `UserProfileSnapshot`，由适配层 `buildScoringBonusInputs`（`scoringBonusInputs.ts`）聚合成各加成入参传入。

> 非加成数值的特殊默认（近似 / 模式选择，非「跳过」）：`heroLevels ?? 1`（未拥有英雄按 1 级保守估算，levelCurve=rate^1，保留英雄间增长率差异）、`manualStackCount ?? 1000`（动态层数假设，area≈100 上限，UI 可覆盖）、`aggregateProjection ?? 'absolute-dps'`（主模式）。依据见 `simulator.md`。

### 加成建模正确性原则

1. **精确优先**：每个已建模的加成来源按 IC 真实叠加语义算对——同 effect key（如 `global_dps_multiplier_mult` / `hero_dps_multiplier_mult`）的所有来源（技能 / 装备 / patron / blessing）加法叠加（unified 池），不独立相乘。
2. **不接受负负得正**：高估 bug 与低估缺口互相抵消不可接受——修 bug 后即使总偏差变大（暴露真实缺口），也优于错误抵消。
3. **宁可不准，不可错**：未建模来源明确标注「没算」（可接受）；错误建模（如条件加成剥成无条件 = 过度生效）不可接受。带未解析条件的 effect 一律保守丢弃，不臆断。
4. **劣后分类**：条件性攻击加成（种族 / 年龄 / 性别 / 小队等）属锦上添花，待主体加成正确性收敛后再做。

### Hermetic 边界

`src/domain/planner/` + `src/domain/simulator/` + `src/domain/abilities/` 是 hermetic 模块：

- **永不 import** `src/data` / `src/app` / `src/components` / `src/pages`。
- **永不主动获取数据**（非测试代码零 `readFileSync` / `fetch` / `indexedDB` / `loadCollection`）。唯一非域依赖是 `decimal.js`。
- 所有数据经适配层 `usePlannerCollections`（唯一调 `loadCollection` 处）→ 装入 `PlannerCollections` → 经 `runner.updateCollections()` 喂入。

由 `src/domain/planner/hermeticBoundary.test.ts` 守护，违规即 CI fail。

### 数据分类铁律

计算器消费的数据严格分两类：

- **系统基础数据**（不可变游戏规则：技能解锁等级、buff 机制定义、英雄基础属性 / cost 曲线、patron perk 定义、feat / 专精定义、装备目录、怪物 / BUD 曲线）：**不是 per-call 入参**。启动时加载进 `PlannerCollections`（`usePlannerCollections` 负责加载与缓存）。
- **动态状态**（随游戏开展变动：当前英雄等级、当前阵型、场景 / 层数、patron 选择、祝福量、feat / 专精选择、manualStackCount）：**才是 per-call 入参**。

例如「等级解锁门控」：解锁等级是基础数据（build 把 `required_level` 烘进 `HeroAbilitySignal.requiredLevel`），英雄当前等级是动态入参（`heroLevels`）；计算器按 `requiredLevel <= heroLevel` 过滤 signal。

## 入参契约

下表登记全部入参的代码消费状态。`consumed` = 已接入评估链路。

**A. 基础数据（`PlannerCollections`，启动加载 / 缓存，非 per-call）**

| 字段 | 状态 |
|---|---|
| `plannerHeroes` / `plannerScenarios` | consumed（`updateCollections` 缓存） |
| `featCatalog` / `specializationCatalog` | consumed（`applyActiveFeats` / `applyActiveSpecializations` 按玩家选择注入 profile） |
| signal 解锁等级 `required_level` | consumed（烘进 `HeroAbilitySignal.requiredLevel`） |
| loot-catalog / effect-definitions / patron-perks catalog | consumed（`buildScoringBonusInputs` 装配外部加成） |
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

- 数据、隐私、目录与存储：`data-and-privacy.md`
- 推荐英雄、站位、模型字段与条件匹配：`recommendation.md`
- 数字层、加成聚合与评估维度 / Web Worker、推图预估、输出合同与 UI：`simulator.md` / `computation-runtime.md`

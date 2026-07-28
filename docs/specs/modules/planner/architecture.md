# 自动阵型计划器架构

## 系统定位

planner 是个人成长导向阵型决策台的核心模块：在用户当前拥有英雄、装备、feat、传奇、专精与场景限制下，自动推荐较优的上场英雄与站位。不做黑盒全自动最优解，按本地优先、可解释、可验证原则，输出可追溯的推荐结果与加成拆解。

## 计算原则

planner 的根本目标是帮用户找到「当前英雄 × 当前阵型」最优配置，最大化 DPS 队 / 金币队 / 速度队三种效益（见根 `README.md`「根本目标」）。以下原则是所有 planner 开发的硬约束，不准偏离。

### 投影模式（约束②）

阵型模拟器本质是「阵型内 signal 聚合器」，外部全局加成（恩赐祝福 / 赞助者）不属于阵型。因游戏只给全量数据、无纯阵型数据，加入参开关 `aggregateProjection`：

- `'formation-buff'`（默认）：`objectiveValue` = 阵型内 signal 聚合因子（damagePool × crit × vuln），**不含** baseDamage / levelCurve / 外部加成。对照止于阵型倍率。
- `'absolute-dps'`：`objectiveValue` = baseDamage × levelCurve × damagePool × crit × vuln × globalBuff × equipmentAdj。绝对量未校准（baseDamage / BUD 未校准），仅作 BUD 校准回归基线。

命名锁：**禁止复用 `ComputationMode`**——该名已用于 beam-search 候选裁剪（`computationMode.ts`，`full|p90|…|p50`），两者正交。

### 外部加成入参契约（约束③）

计算器不管调用方登没登录，只看入参 `globalBuffMultiplier` 是否非 undefined：传了算、没传默认 1（`steadyStateScoring.ts` scoreFormation 内 `?? 1`）。是否传由调用方决定（UI 开关 / 测试 mock）。计算器**永不读取登录态、永不直接读取 user profile 的 blessing/favor**——blessing/favor 已由 `userProfileNormalizer` 保留进 profile（`blessings` / `favor` 字段），按约束③计算器不直接读，由适配层聚合成 `globalBuffMultiplier` 传入（生产侧接入 phased；oracle 度量回路已建，见 `damageReferenceVerification`）。

### Hermetic 边界（审计结论）

`src/domain/planner/` + `src/domain/simulator/` 是 hermetic 模块：

- **永不 import** `src/data` / `src/app` / `src/components` / `src/pages`（域不向外层依赖）。
- **永不主动获取数据**（非测试代码零 `readFileSync` / `fetch` / `indexedDB` / `loadCollection` / `loadVersion`）。唯一非域依赖是 `break_eternity.js`。
- 所有数据经适配层 `usePlannerCollections`（唯一调 `loadCollection` 处）→ 装入 `PlannerCollections` → 经 `runner.updateCollections()` 喂入。

由 `src/domain/planner/hermeticBoundary.test.ts` 守护，违规即 CI fail。

### 数据分类铁律

计算器消费的数据严格分两类，决定「加载方式」vs「入参方式」：

- **系统基础数据**（不可变游戏规则：技能解锁等级、buff 机制定义、英雄基础属性 / cost 曲线、patron perk 定义、专长定义、装备目录、怪物 / BUD 曲线…）：**不是 per-call 入参**。启动时一次性加载或用到时按需缓存，进 `PlannerCollections` 数据供给通道。适配层（`usePlannerCollections` / data-client）负责加载与缓存。
- **动态状态**（随游戏开展变动：当前英雄等级、当前阵型、当前场景 / 层数、patron 选择、祝福量、专长 / feat / familiar 选择、manualStackCount…）：**才是 per-call 入参**（`PlannerEvaluateInput`）。

例如「等级解锁门控」：解锁等级是**基础数据**（build 把 `required_level` 烘进 `HeroAbilitySignal`），英雄当前等级是**动态入参**（`heroLevels`，已有）；计算器按 `requiredLevel <= heroLevel` 过滤 signal，**不引入新入参**。

### 入参契约（冻结清单）

下表一次性登记全部入参，避免每次开发都「发现某参数没传」。`consumed`=已消费；`phased`=已登记待实现；nullable→可不传，非空→设默认。

**A. 基础数据（加载 / 缓存进 PlannerCollections，非 per-call 入参）**

| 字段 | 状态 |
|---|---|
| `variants` / `plannerHeroes` / `plannerScenarios` | consumed（`updateCollections` 缓存） |
| signal 解锁等级 `required_level` | **phased**（raw + champion-details 有，`HeroAbilitySignal` 未带，待 build 烘进） |
| `global-buffs.json`（patron perk 定义） | consumed（已落盘） |
| loot-catalog / 专长定义 / 怪物·BUD 曲线 | consumed（组件在） |

**B. 动态状态（per-call 入参 PlannerEvaluateInput）**

| 字段 | 状态 |
|---|---|
| `placements`（当前阵型）/ `variant`（场景 / objectiveArea / topology）/ `heroLevels`（每英雄当前等级） | consumed |
| `scoringMode` / `candidateMode` / `computationMode` / `beamWidth` / `lockedCarryHeroId` / `lockedSlots` | consumed |
| `manualStackCount`（当前层数假设） | consumed |
| `globalBuffMultiplier`（外部加成）/ `equipmentAdjustmentByHero` | domain consumed、**phased** UI 接入 |
| `aggregateProjection`（模式开关） | consumed（本轮新增） |
| patron 选择 / blessing·favor 量 | **phased**（适配层聚合成 `globalBuffMultiplier` 传入，非直接入参） |
| `perHeroSpecialization` / feat·familiar / modron 状态 | **phased**（待接入评分） |

**后续目标**（服务根本目标但尚未实现，登记在此防重复发现）：speed `ScoringMode`；等级解锁门控（基础数据侧 build 烘 unlock + 消费侧过滤）；绝对伤害 BUD 校准；`globalBuffMultiplier` 生产侧聚合接入（patron 选择 + blessing/favor 量 → 适配层算乘数；oracle 度量回路已建，见 `damageReferenceVerification`）+ UI 透传；`equipmentAdjustmentByHero` UI 接入；perHeroSpecialization / feat / familiar / modron 动态状态接入评分。

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

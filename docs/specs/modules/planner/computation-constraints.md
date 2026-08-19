# 计算约束

planner 开发的硬约束。修改评分逻辑前先读。结构概览见 `architecture.md`，规范细节见 `simulator.md`。

## 投影模式（约束②）

阵型模拟器本质是「阵型内 signal 聚合器」，外部全局加成（祝福 / 赞助者）不属于阵型。加入参开关 `aggregateProjection`：

- `'absolute-dps'`（默认）：`objectiveValue` = baseDamage × levelCurve × globalBuff × heroDpsPool × damagePool × crit × vuln。globalBuff / heroDpsPool 是 ability 池与外部加成（patron / blessing / 装备）同 key 加法合并后的 unified 池；damagePool 为残余非 global / hero 池。绝对量未校准，作 BUD 校准回归基线。
- `'formation-buff'`：`objectiveValue` = 阵型内 ability 聚合因子（globalBuff × heroDpsPool × damagePool × crit × vuln，池为 ability-only 不含外部加成），**不含** baseDamage / levelCurve / 外部加成。外部加成注入只发生在 absolute-dps。

命名锁：**禁止复用 `ComputationMode`**——该名已用于 beam-search 候选裁剪（`computationMode.ts`，`full|p90|…|p50`），两者正交。

## 外部加成入参契约（约束③）

计算器不管调用方登没登录，只看入参是否传入。**未传的加成入参按其语义的数学单位元回退，贡献 0 加成（等价跳过该能力）**，绝不臆造数值：

| 语义 | 入参 | 未传时回退 | 为何是此值 |
|---|---|---|---|
| multiplier（1+Σ/100） | `globalBuffMultiplier` / `equipmentAdjustmentByHero` / `equipmentHealthByHero` | **1** | 乘法单位元；`steadyStateScoring.ts` 内 `(mult−1)×100` 折算为 0% addPercent |
| addPercent（Σ%） | `equipmentGlobalDpsByHero` / `equipmentGoldByHero` | **0** | 加法单位元；`sumPlacedEquipmentAddPercent` 空 map → 返回 0 |
| 列表 / 对象 | `externalHeroDpsContributions` / `equipmentCritByHero` / `equipmentBuffsByHero` / `legendaryContributions` | **空** | 空数组 / undefined → 循环不执行 / 判空跳过 |

multiplier 类回退 1 **不是「加 1」**——代码统一 `(mult−1)×100` 折算成 addPercent，1 折算为 0%；addPercent 类回退 0；列表类回退空。三者殊途同归：**未传 = 0 贡献 = 不进 pool = 跳过该能力加成**。

是否传由调用方决定（UI / 测试 mock）。计算器**永不读取登录态、永不直接读取 user profile**——祝福 / favor / patron 已由 `userProfileNormalizer` 保留进 `UserProfileSnapshot`，由适配层 `buildScoringBonusInputs`（`scoringBonusInputs.ts`）聚合成各加成入参传入。

> 非加成数值的特殊默认（近似 / 模式选择，非「跳过」）：`heroLevels ?? 1`（未拥有英雄按 1 级保守估算，levelCurve=rate^1，保留英雄间增长率差异）、`manualStackCount ?? 1000`（动态层数假设，area≈100 上限，UI 可覆盖）、`aggregateProjection ?? 'absolute-dps'`（主模式）、`dynamicSpeedOverrides`（动态速度英雄 areaSkip 假设，默认见 `DYNAMIC_SPEED_DEFAULTS`）。依据见 `simulator.md`。

显式传入但不满足取值合同的等级、基础伤害、聚合倍率、信号类型、池乘数和动态层数不走上述默认；它们代表上游数据或调用方契约损坏，计算器必须直接抛异常。只有字段未传入，或数据源明确定义了缺省哨兵（如 `numTargets=0` 表示未知，按单目标近似）时，才进入兼容回退。

## 取值口径（冻结 2026-08-10）

计算器入参的取值遵循以下口径，所有功能模块（DPS / 金币 / 速度 / 生存）统一适用：

1. **计算器只接收 UI 当前值**——不直接读取用户数据，不自动消费任何外部数据源。
2. **UI 面板初始值 = 内置默认值**（如 `DYNAMIC_SPEED_DEFAULTS`、`manualStackCount ?? 1000`）。
3. **用户数据的作用 = 一个「载入我的数据」按钮**：点击后替换 UI 面板值为用户数据中的值，仅此而已。
   - 全有或全无：载入时，用户数据中**有的字段类型**全部使用用户数据（可能为空值）；用户数据中**没有的字段类型**保持当前 UI 值（内置默认）。
   - 不合并、不混用——不是「用户数据覆盖默认值然后混合」，而是「按钮一次性替换面板」。
4. **三个独立维度**：
   - **默认值来源**：内置默认 vs 用户数据载入（按钮触发）
   - **UI 可调性**：是否有 UI 控件——由 UI 设计决定，与入参无关
   - **入参可调性**：所有入参在代码层面都可调整——区别只是是否暴露 UI 控件

示例：Briv 的 areaSkip 假设——内置默认 25%，UI 可手调，用户数据（存档中的冲刺堆叠）未来可通过按钮载入替换面板值。三者独立。

## 加成建模正确性原则

1. **精确优先**：每个已建模的加成来源按 IC 真实叠加语义算对——同 effect key（如 `global_dps_multiplier_mult` / `hero_dps_multiplier_mult`）的所有来源（技能 / 装备 / patron / blessing）加法叠加（unified 池），不独立相乘。
2. **不接受负负得正**：高估 bug 与低估缺口互相抵消不可接受——修 bug 后即使总偏差变大（暴露真实缺口），也优于错误抵消。
3. **宁可不准，不可错**：未建模来源明确标注「没算」（可接受）；错误建模（如条件加成剥成无条件 = 过度生效）不可接受。带未解析条件的 effect 一律保守丢弃，不臆断。
4. **劣后分类**：条件性攻击加成（种族 / 年龄 / 性别 / 小队等）属锦上添花，待主体加成正确性收敛后再做。

## Hermetic 边界

`src/domain/planner/` + `src/domain/simulator/` + `src/domain/abilities/` 是 hermetic 模块：

- **永不 import** `src/data` / `src/app` / `src/components` / `src/pages`。
- **永不主动获取数据**（非测试代码零 `readFileSync` / `fetch` / `indexedDB` / `loadCollection`）。唯一非域依赖是 `decimal.js`。
- 所有数据经适配层 `usePlannerCollections`（唯一调 `loadCollection` 处）→ 装入 `PlannerCollections` → 经 `runner.updateCollections()` 喂入。

由 `src/domain/planner/hermeticBoundary.test.ts` 守护，违规即 CI fail。

## 数据分类铁律

计算器消费的数据严格分两类：

- **系统基础数据**（不可变游戏规则：技能解锁等级、buff 机制定义、英雄基础属性 / cost 曲线、patron perk 定义、feat / 专精定义、装备目录、怪物 / BUD 曲线）：**不是 per-call 入参**。启动时加载进 `PlannerCollections`（`usePlannerCollections` 负责加载与缓存）。
- **动态状态**（随游戏开展变动：当前英雄等级、当前阵型、场景 / 层数、patron 选择、祝福量、feat / 专精选择、manualStackCount）：**才是 per-call 入参**。

例如「等级解锁门控」：解锁等级是基础数据（build 把 `required_level` 烘进 `HeroAbilitySignal.requiredLevel`），英雄当前等级是动态入参（`heroLevels`）；计算器按 `requiredLevel <= heroLevel` 过滤 signal。

# planner 流水线集成契约审计（历史轮次 + fail-fast 收口）

度量基准日：2026-08-10（分支 `opencode/dev3`）。本审计与前三轮正交：守护**模块间接缝**（A 产出 → B 消费）而非单模块内行为。

## 1. 审计范围与方法

**范围**：planner 多级流水线六条接缝（buildModels → evaluatePlacementFit → scoreFormation → breakdown / scoringBonusInputs → beamSearch → recommendationEngine / scripts/data normalization → build → planner）。

**方法**：codegraph 追每条接缝上下游 → 对照已有测试判定「已守护/未守护」→ 对未守护的补结构断言 → 契约变异（篡改上游数据，记录下游行为分类）→ 金标回归。

**测试产物**：`src/domain/planner/integrationContract.test.ts`（27 测试），接入 `unit` glob + `test:simulator`。

## 2. 六条接缝评估

| # | 接缝 | 守护前状态 | 本轮补充 | 变异分类 |
|---|------|-----------|---------|---------|
| 1 | buildModels → hero-abilities.json → plannerHeroes | smoke 只验不崩溃+蔚特例 | 全量结构契约（标量字段+signal+gainProfile+forcedHero 引用一致性） | 见 §3 |
| 2 | evaluatePlacementFit → pools → scoreFormation | 手搓 unit（poolAggregation.test） | 真实数据 pool 不变量 + totalMultiplier=Π(poolMultiplier) | 见 §3 |
| 3 | scoreFormation → SimulationBreakdown → UI | 手搓因子之积（4 组 fixture） | **真实多英雄阵型**因子之积 + breakdown.pools 不变量 + contributions kind 合法 | 无变异（因子之积测试本身即契约守护） |
| 4 | scoringBonusInputs → scoreFormation（同 key 加法） | 装配测试 | 同 key 加法契约 3 组（global+external / hero+equip / equip+contribution） | 见 §3 |
| 5 | beamSearch → recommendationEngine | 不变量守护（确定性/seat 唯一/单调性） | 结构透传（字段不丢失）+ locked 正确 + 降序 + 重复 seat 行为 | 见 §3 |
| 6 | scripts/data normalization → build → planner | build-models 合成测试 | 全量 scenarios 结构契约（slotTopology 自洽图 + damageSourcePattern 合法 + viabilityContext 完整） | 无变异（结构断言即变异守护） |

## 3. 契约变异实验结果（第四轮历史快照）

> 本节记录第四轮当时的实测行为；当前处置以 §10 为准，避免把历史静默行为误读为现行合同。

| 接缝 | 变异 | 下游行为 | 分类 |
|------|------|---------|------|
| 1 | `baseDamage ≤ 0` | computeCarryDps:31 guard 校正为 1，carryDps 有合法值但 baseDamage 被替换 | **静默校正**（已知，锁现状） |
| 1 | `carrySignals = undefined` | collectSignals spread TypeError | **fail-fast** |
| 1 | `signal.kind` 非法 | DIMENSION_BY_KIND 查不到 → dimensionFilter 过滤 → signal 静默丢弃 | **静默跳过**（无 warning） |
| 2 | `pool.addPercent = NaN` | productOfPoolMultipliers 返回 NaN → 传播到 damageAggregate | **静默错误**（无 guard） |
| 4 | `globalBuffMultiplier = NaN` | NaN → addPercent=NaN → poolMultiplier=NaN → **computeCarryDps:33 `Number.isFinite` guard 校正为 1** → 加成被静默吞掉，carryDps 有合法值 | **静默错误**（隐性 guard 掩盖根因） |
| 5 | 重复 seat 英雄 | expandCandidates `usedSeats.has` 去重 → 重复英雄被跳过 | **静默跳过**（合理行为，无 warning） |

### 关键发现：computeCarryDps:33 隐性 guard（已由 §10 收口）

`baseDps.ts:33`：`const aggregate = Number.isFinite(damageAggregate) && damageAggregate > 0 ? damageAggregate : 1`

此 guard 设计意图是防止 NaN/非正 aggregate 传播。但它也**静默吞掉**了上游数据损坏的信号——当 `globalBuffMultiplier=NaN`（或其他上游 NaN 传播）时，加成被替换为 1，carryDps 仍有合法值，无任何 warning 或诊断。

**影响**：上游数据损坏（NaN/Infinity/非正数）在 carryDps 输出处不可见；debug 时只能看到「carryDps 偏低」而非「某上游值为 NaN」。与 baseDamage≤0 的 guard（:31）同构——两个隐性校正都在同一函数内。

**第四轮处置**：当时暂锁现状，认为 guard 是防御性设计；本轮已完成 NaN 传播影响评估，并在 §10 改为评分边界 fail-fast。

## 4. 金标基线（第四轮历史快照）

测试文件末段 `金标基线：真实数据推荐结果`：对 4 个有区分度的 scenario 子集（不同阵型大小 + forced/plain）跑 `buildPlannerRecommendation`（all-hypothetical + p50），断言：
- blocker = null（不被 block）
- result 非空，carryHeroId 非空且在 hero pool 中
- log10(objectiveValue) 在合理范围 (0, 60)

与 `signal-coverage-baseline.json` 不重叠（信号计数 vs 推荐结果结构合法性）。

## 5. 数据级发现

- **forcedHero 不在 hero pool**：scenario `2008` 的 forcedHero `179` 不在 `hero-abilities.json` 中（restrictions 文本解析限制 / 未发布英雄）。`recommendationEngine.filterAndSortCandidateHeroes` 遍历 `plannerHeroes`，`forcedHeroSet.has(hero.heroId)` 永不匹配 → 强制英雄被静默跳过。总数 ≤5 个（锁现状），增长说明数据管线漂移。

## 6. 第四轮纳入与排除（历史快照）

**纳入**：六条接缝结构断言 + 变异分类 + 金标回归。

**排除（本轮不处理）**：
- 生产代码修复：第四轮当时未处理变异暴露的静默错误路径；本轮已收口数值聚合、signal kind 和相关 profile 契约，forcedHero 缺失仍按数据源兼容边界保留并由数量门槛守护。
- 金标值精度钉死：当前断言 log10 在 (0, 60) 宽范围（level=1 全英雄），未钉死具体 carryHeroId / log10 到小数位。原因：hero-abilities.json 随游戏版本更新会变；钉死精确值需配套 baseline 更新流程（参照 signal-coverage-baseline.json），后续按需升级。

## 7. 教训

- **隐性 guard 是双刃剑**：computeCarryDps:33 的 `Number.isFinite` guard 防 NaN 传播但掩盖上游 bug。变异实验暴露了这条隐藏路径——NaN 不会在结果中体现，只会表现为「加成被吞掉」。
- **结构契约 ≠ snapshot**：对全量真实数据做字段存在性/类型/枚举校验，比 snapshot 更精准地守护接缝——不因数据增量误报，只报结构漂移。
- **手搓 fixture 与真实数据的维度差**：前三轮手搓 fixture 的因子之积测试（4 组）验证了计算正确性，但无法发现「真实 hero-abilities.json 中某 signal.kind 非法」或「scenarios.json 中 adjacentSlotIds 自洽性」——真实数据端到端守护补充了这个维度。

## 8. 流程集成续章（第五轮）

度量基准日：2026-08-10（分支 `opencode/dev3`）。本轮与第三轮（§1-7）正交：守护**编排链的动态流转**——分支路径、参数穿透、blocker 状态转换、用户锁往返、Top K 去重，而非静态数据契约。

**测试产物**：`src/domain/planner/recommendationEngine.flow.test.ts`（14 测试），接入 `unit` glob + `test:simulator`。

### 六落点覆盖判定

| # | 落点 | 守护问题 | 判定 |
|---|------|---------|------|
| 1 | 编排分支路径 | 5 路径（null / missing-profile / missing-formation / insufficient / no-legal / 正常）互斥、优先级正确 | ✅ 补 6 测试（null scenario / missing-formation 三变体 / blocker 优先级 / 确定性） |
| 2 | 参数穿透 | 4 参数穿透到评估层产生可观测差异 | ✅ 补 3 测试（scoringMode / computationMode / aggregateProjection 各 1 决策表断言） |
| 3 | blocker 状态转换 | 模式切换下 blocker 消失 | ✅ 补 1 测试（insufficient → all-hypothetical 正常） |
| 4 | 用户锁往返 | lockedSlots / lockedCarryHeroId 端到端 | ✅ 补 2 测试（lockedSlots 保持 / lockedCarryHeroId 全 Top K 穿透） |
| 5 | 可行性过滤 | 合法但 area 不足的阵型被淘汰 | ✅ 已充分覆盖（recommendationEngine.test.ts survival/armor/hits/damageModifier 四变体） |
| 6 | Top K 去重 | 同 carry 去重 + 截断 + 降序 | ✅ 补 2 测试（≤3 截断 / carryHeroId 互异 + 降序） |

### 关键发现

- **无编排缺陷**：5 条退出路径互斥且优先级正确（missing-profile > missing-formation > insufficient-owned-heroes > no-legal-recommendation）。`resolvePlannerScenario` 先检查 profile 再检查 scenario，保证 missing-profile 优先于 missing-formation。
- **参数穿透验证**：4 参数均在评估层产生可观测差异——scoringMode（carry-dps vs team-gold 不同 objectiveValue）、computationMode（100+ 英雄 p50 裁剪改变候选池 → 至少 1 项差异）、aggregateProjection（absolute-dps 含 baseDamage/levelCurve 量级远大于 formation-buff，后者 areaEstimate=null）。
- **blocker 状态可逆**：模式切换（owned-only → all-hypothetical）下，insufficient-owned-heroes blocker 消失，推荐正常生成。
- **用户锁全局穿透**：lockedCarryHeroId 影响所有 Top K 结果的 carryHeroId（不仅 top1），证明评分层全路径消费该参数。

### 排除（本轮不处理）

- 生产代码修改：未发现编排缺陷或参数未穿透问题。
- 可行性过滤（落点 5）：第四轮已充分覆盖，不重复。

## 10. 第六轮：异常输入 fail-fast 收口

### 审计结论

本轮重新检查了 planner 集成测试、runtime edge 测试及 simulator 共享计算边界。结论不是“所有回退都删除”：

- 必填或已提供但损坏的值必须抛异常：`baseDamage`、英雄等级、伤害/生命聚合值、池乘数、非法 `signal.kind`、非法 `requiredLevel`、损坏 override、显式非法攻击间隔/目标数、显式非法动态层数。
- 合法业务兼容继续保留：未传入加成的单位元、缺失 cost/health 曲线的 MVP 近似、未建模/手动触发/未注册叠层机制的 warning 降级、旧阵型未知英雄 warning、官方 `numTargets=0` 缺省哨兵按单目标估算、重复 seat 的候选过滤。

### 已修复接缝

| 接缝 | 旧行为 | 当前行为 | 回归测试 |
|---|---|---|---|
| profile → DPS | `baseDamage≤0` 回退 1，Infinity 继续传播 | 基础伤害非正或非有限直接抛异常 | `steadyStateScoring.invariants.test.ts`、`baseDps.test.ts` |
| signal → dimension/gain | 非法 `kind` 被过滤或收益画像跳过 | 直接抛异常 | `integrationContract.test.ts`、`abilityModel.test.ts` |
| pool → aggregate | NaN 传播到最终结果，或被 carry guard 置零 | 池字段/乘积非有限或负值直接抛异常 | `integrationContract.test.ts`、`poolAggregation.test.ts` |
| external bonus → score | NaN/负聚合附 warning 并跳过 carry | 直接抛异常 | `steadyStateScoring.test.ts`、`integrationContract.test.ts` |
| profile snapshot → level | NaN 等级静默得到零结果 | 评分入口直接抛异常 | `recommendationEngine.runtimeEdge.test.ts` |
| profile override → resolved profile | 缺 heroId 的条目静默不匹配 | 直接抛异常 | `recommendationEngine.runtimeEdge.test.ts` |
| simulator → area/BUD | baseHealth、health pool、攻击参数显式非法时回退默认 | 直接抛异常；业务哨兵/缺省仍按合同回退 | `survivalCalculation.test.ts`、`budCalculation.test.ts` |

### 全项目摸排的保留项

`areaEstimation` 的 `healthDrainRate≥1 → 零生命`、`signalMultiplier` 对未建模机制/堆叠溢出的 warning 降级、资源加载失败后的空集合/错误态，以及未知英雄的用户数据兼容均有明确业务语义，不属于本轮必须抛异常的契约损坏。worker 的 `catch` 只负责把异常转换为 `ok:false` 返回，不吞掉异常。

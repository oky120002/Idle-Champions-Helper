# 业务正确性审计（planner 推荐引擎 + 模拟器 + 信号语义）

度量基准日：2026-08-01（分支 `opencode/dev1`，commit `c377707d`）。本文件是轮 1 业务正确性审计的 canonical 来源；P1+ 整改项随 commit 更新「进度」列。体例沿用 `test-suite-audit.md`：现状度量 → P0 → 按 ROI 排序的整改清单。

## 1. 审计范围与方法

**范围**：`src/domain/planner/**`（recommendationEngine / steadyStateScoring / placementFit / beamSearchRanking / formationLegality / mechanics / scoring / variantConstraints）、`src/domain/simulator/**`（baseDps / bud / survival / monsterStats / areaEstimation）、`src/domain/{abilities,buffs,effects}/**`（信号语义、feat/专精注入、外部加成 provider）。

**方法**：codegraph 追主流程调用链 → 对照 `docs/specs/modules/planner/**`（requirements / architecture / simulator / dps-mechanics / mechanic-isolation）核查口径 → 用真实 `hero-abilities.json` 数据验证信号分布假设 → 核实近期机制重构（dps-mechanic-abstraction / mechanic-isolation / feat-specialization-injection / hero-signal-target-qualifier）无回归。

**P0 清零**：本轮未发现 P0（明确 bug / 错误推荐 / 数据损坏）。近期机制重构的两个 P0 修复均在位（见 §3 验证清单）。核心发现一项 P1（外部加成池分裂，§2）。

## 2. P1 — 外部加成与池内同 key ability 加成相乘（IC 语义偏差）

**现象**：`scoreFormation`（`steadyStateScoring.ts:193`）把两类外部加成作为**独立乘因子**并入 carryDps，而非并入对应的 ability 池做加法：

```
carryDps = baseDps × levelCurve × damagePool × crit × vuln × globalBuff × heroDpsPool
```

- `damagePool`（`productOfPoolMultipliers(sharedPools)`）含 ability 源 `damage:global`（globalDpsMultiplier 信号）+ `damage:hero`（heroDpsMultiplier 信号）。
- `globalBuff`（外部 patron/blessing 的 `global_dps_multiplier_mult`，`scoringBonusInputs.ts` 装配）单独相乘。
- `heroDpsPool`（`equipmentAdjustment + externalHeroDpsAddPercent/100`，装备 + patron/blessing 的 `hero_dps_multiplier_mult`）单独相乘。

**IC 语义**：同一 effect key（`global_dps_multiplier_mult` / `hero_dps_multiplier_mult`）的所有来源——ability（自身 + 支援）+ 装备 + patron perk + blessing——在 IC 里**加法叠加**成单一 stat（`1 + Σ%/100`），非各自独立乘。

**证据：这是疏忽而非刻意权衡**：
- `steadyStateScoring.ts:317` 注释自己写「IC 同 key effect 加法叠加，非各自独立乘」——但只对 `equipmentAdjustment + ext%/100`（heroDpsPool 内部）做了加法，把 ability 源 hero_dps 拆到 `damage:hero` 池相乘，自相矛盾。
- `computeVulnerabilityFactor`（`scoring/vulnerabilityFactor.ts`）已修过同类 bug（「原一律 Π 累乘把两个 +100% 易伤算成 4，正确 3」→ 改加法）。同一语义原则（同池同 key 加法）在 vuln 落地了，却未外推到外部加成。
- `equipmentMult.ts` 顶部注释「作 equipmentAdjustment 直接乘 carryDps（loot 未进 damagePool，此处补全）」描述了机制（loot 乘 carryDps）但未提 IC 同 key 应加法——loot 因数据架构（loot-catalog 外部、不在 hero-abilities.json）被外置成乘因子。

**影响**：
- **绝对值**：当 ability 池与外部加成都非平凡时，乘法分裂高估 carryDps。明斯克实测（`planner-calculator-normalization` 记忆）：`damagePool 483 × globalBuff 91 × heroDpsPool 49 ≈ 10^6.34`；IC 加法正确值显著更低（global/hero 各自 `1+(ability%+ext%)/100`，非 `(1+ability%)×(1+ext%)`）。但当前整体偏差仍是 -31 数量级（10^31 欠估，大头来自未建模的 vulnerability/modron/成就/药水/gem/feat/legendary），此高估**部分补偿**了欠估，故被 golden 测试（回归守护非精度标尺，ADR 0015）掩盖。
- **排名**：高估因子 `=(1+A)(1+E)/(1+A+E)`（A=ability 池%、E=外部池%）随 carry 的 ability 自增益与装备而变——ability 自增益大 + 装备好的 carry 被系统性高估。数据：6114 条 `heroDpsMultiplier` 自增益信号、3213 条 `globalDpsMultiplier` 支援信号，说明 ability 池普遍非平凡 → 排名扭曲真实存在。

**根因（数据架构）**：pool 模型（`sharedPools`）由 `evaluatePlacementFit` 从 ability 信号构建；外部加成（装备/patron/blessing）经 `ScoringInput` 字段传入，无法注入池，被追加为独立乘因子。这是「外部数据不在 ability profile 内」的结构性约束的直接结果。

**修复方向（不在本轮动手，登记 P1）**：在 `scoreFormation` 的 support 循环后、`productOfPoolMultipliers` 前，把外部加成百分比**注入对应池的 addPercent**（heroDpsPool 的 equip+ext% → `damage:hero` 池；globalBuff 的 patron/blessing global_dps% → `damage:global` 池），使同 key 加成加法叠加。这是 scoreFormation 内的局部改动（非跨文件），但须同步：
1. `simulator.md` DPS 公式（`hero_dps_pool × equipment_adjustment` → 合并进 pool）。
2. `steadyStateScoring.test.ts:495-566`（乘法模型被编码进测试，须改加法断言）。
3. `breakdown.factors` 契约（heroDpsPool/globalBuff 不再独立因子，并入 damagePool；UI `PlannerBreakdown` 消费须同步）。

**关键约束——不可单独修**：乘法分裂当前**部分补偿** 10^31 欠估；单独改加法会让 golden 偏差更负（移除补偿误差）。必须与「补全未建模来源」（vulnerability 生效口径 / modron grid / 成就 / legendary 等，见 architecture.md「未接入能力」）**协同推进**——先有未建模源补足欠估，再改池分裂防爆过冲。

| 项 | 动作 | ROI | 影响面 | 进度 |
|----|------|-----|--------|------|
| 外部加成池分裂 | 外部 global_dps/hero_dps 注入对应池 addPercent（加法），同步 spec/test/breakdown | 中高（修 IC 语义偏差 + 排名扭曲，但被欠估掩盖） | scoreFormation 局部 + simulator.md + steadyStateScoring.test + PlannerBreakdown | **已收口** `c62f1970`（A1 Phase A）：外部加成注入 ability 池副本（`steadyStateScoring.ts:384-389` unifiedPools），同 key 全源加法；偏差 l1 -32.7→-33.2（停止负负得正，符合「不接受负负得正」原则） |
| spec/TODO 漂移修正 | `simulator.md` 公式 + `equipmentMult` 注释 + TODO `atd_3cb8df390e`（仍提已删的 `theoreticalLootMult/ownedEquipMult` 只收 global_dps，实际 3849d295 已改收 hero_dps） | 低（文档准确性） | docs + TODO | **已收口** `ae0e7355`（atd_3cb8df390e：假设装备配置落地，equipmentMult hero_dps 口径对齐） |

## 2.1 P1 — gain profile 预算与实际评分池路由漂移（bonusScaleOfSignal）

**现象**：`aggregateGainByDimension`（`abilityModel.ts`，供 `computeHeroGainProfile` → `applyComputationMode` 候选裁剪）是实际评分（`placementFit.ts` + `signalMultiplier.ts`）的镜像预算，文档化不变量要求「数学须与 pool 聚合一致」。但 `bonusScaleOfSignal`（buff_upgrade wrapper 联动）的实际评分贡献 = `base.value × wrapper.value / 100`，gain profile 旧实现直接 `+= signal.value`（忽略 base）→ base.value>100 时严重低估。

**影响**：默认 p50 模式每席位取前 50% 候选；被低估的强候选（ability-source wrapper base.value>100）被误裁，beam search 永不试到。实测重建后部分英雄 damage gain 46→69、32→56（之前被大幅低估）。base.value=100 时巧合一致（100×v/100=v），掩盖系统性。

**根因**：`applyComputationMode`（`recommendationEngine.ts:528`）在 feat/专精/装备 wrapper 注入（lines 532-535）**之前**执行，用 build-time 烘进 `hero-abilities.json` 的 gainProfile；新增 signal 机制只改实际评分路径、漏改 gain profile 镜像。

**修复**：`aggregateGainByDimension` 对 `bonusScaleOfSignal` 折算 `effectiveValue = base.value × value / 100`（addPercent / multFactor 两分支对称，`abilityModel.ts`）；补 `abilityModel.test.ts` 逐 signal 用例（base=300/add、base=200/mult）；`FORCE_DATA_REBUILD=1` 重跑 `buildModels` 重建 hero-abilities.json gainProfile（27 处变化）。全 1137 unit + signal-coverage + schema 校验通过。详见 `modeling-pitfalls.md` 陷阱 5。

## 3. 验证安全（已核查无 bug，防重复审计）

| 区域 | 核查结论 |
|------|----------|
| heroDpsMultiplier 跨英雄 buff 位置 | 数据验证：`target≠null && positionQualifier=null` 的 heroDpsMultiplier 信号 **0 个**（legacy「buff [F] for [F]」均带显式 `targets`，position 正确设置）。`resolvePositionRelation` 对 heroDpsMultiplier 默认 `'self'` 不致漏分。937e68c4 修复到位 |
| feat/专精注入 | `applyFeatsToProfile`/`applySpecializationsToProfile` 均用 `appendHeroAbilitySignals`（非 `applyHeroAbilityPatch`），按 bucket 路由，**不做 scoringMode 维度预过滤**。两个 P0 修复（6d363819 替换语义 + 7b8a9226 维度过滤）均在位 |
| crit/vuln factor | `computeCritFactor`（base crit 归一抵消，文档化设计）+ `computeVulnerabilityFactor`（add/mult 加法聚合，已修累乘 bug）正确 |
| resolveSignalMultiplier / stack 计数 | `STACK_COUNT_RESOLVERS` 8 种 stackFunc 分发完整；`countQualifiedHeroes`/`countUpgradeTargets` 按 qualifier + position 计数正确；`applySignalPercent` 的 buff_upgrade 折算用 `base.value`（非聚合倍率）避 4^N 高估（13944ac8 修复在位）；dynamic-stack-multiply 溢出有守卫 |
| monsterStats / areaEstimation | `monsterHealthAt` 分段累积（2.031/3.031/4.531）正确；`monsterDpsAt` boss spike 累乘（含 151 非 150 的序列修正）正确；survival 用 dps 近似单次伤害为文档化缺口（base_speed=50 语义未确认） |
| formationLegality / beamSearch | seat 冲突 / banned / forced / locked 检查完整；beamSearch `lockedPlacements` 正确并入 initial candidate（`placements: {...lockedPlacements}`），不与搜索槽冲突 |
| computeEquipmentMult | 收 `hero_dps_multiplier_mult` loot，`1 + Σ(base×(1+enchant/250))/100`，enchant 缩放正确（1/250 反推自明斯克实测） |

## 4. P2 — 边缘项（本轮不展开）

- **userLocked ∩ scenarioLocked 容量过扣**：`recommendationEngine.ts:435` `availableCapacity = slotTopology.length − max(occupied, locked) − userLockedSlotSet.size` 假设用户锁槽与场景锁槽不相交；若重叠（UI 应阻止锁场景锁槽，且 `checkFormationLegality` 会报 `lockedSlot` 违规）则容量多扣 1、少填 1 英雄。UI 守护 + legality 兜底，影响小。
- **crit base 归一化**：`computeCritFactor` 无 crit 信号时返回 1（base crit 1.025 抵消），carryDps 恒少 base crit 2.5%。文档化设计、全 carry 均匀，不影响排名。
- **team-gold 位置受限 gold**：50 条 `globalGoldMultiplier` 信号中仅 1 条带 position（多比 `self`，`gold_multiplier_mult,30`），自评 `carry=support` 时 `'self'` 命中正确计入。非 bug。

## 5. 轮 1 收口

- **P0 清零**：本轮无 P0。
- **P1 登记**：外部加成池分裂（§2）+ spec/TODO 漂移，均带明确动作与「须协同」约束。
- **验证安全**：§3 七项核心区域核查无 bug；近期四个机制重构无回归。


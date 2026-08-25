# planner 数字层、加成聚合与评估维度

## GameNumber

引入 `decimal.js`，只在 `src/domain/simulator/gameNumber.ts` 直接 import。业务代码只用 wrapper：`parseGameNumber`、`formatGameNumber`、`multiplyGameNumbers`、`divideGameNumbers`、`powerGameNumber`、`addGameNumbers`、`compareGameNumbers`、`log10GameNumber`、`sortGameNumbers`。

性能策略：

- 排序和 beam search 优先比较 `log10` 或 wrapper compare，不构造巨型十进制字符串。
- 加法使用集中阈值，初始阈值 15 个数量级；小项不影响 3 位游戏显示时直接忽略。
- 显示层默认 `1.50e92` 风格；不用 JS `number` 承载最终伤害。
- 核心数值类型必须覆盖超过 `Number.MAX_VALUE` 的游戏数值范围。

## 英雄等级

英雄等级默认取自存档 `ownedHeroes.level`（`recommendationEngine.ts` 构造 `heroLevels` 传入 `scoreFormation`）。未拥有英雄（all-hypothetical 候选）按 `DEFAULT_CARRY_LEVEL = 1`。

支持两种外部覆盖（`PlannerRecommendationOptions.heroLevelOverride` + `goldBudget`，UI 金币/等级互斥控件驱动）：
- **金币预算模式**：全局金币值（GameNumberValue）→ worker 用 `computeAffordableLevel`（`baseCost × (rate^X-1)/(rate-1)` 等比数列求和 + 二分搜索）对每个英雄换算可达等级 → 构建 `heroLevelOverride` Map。
- **全局等级模式**：统一等级 → worker 反算 `computeMaxGoldForLevel`（最贵英雄累计费用）作为 `goldBudget`。

覆盖等级同时驱动专精门控：等级 < `requiredLevel` 的专精不注入信号（`applySpecializationsToProfile` `heroLevel` 参数）。

## 加成聚合与 DPS 公式

加成按 pool 结构聚合——顶级 pool = `kind`（能力维度），pool 内 `amountFunc=add` 走线性累加（`Σ percent`）、`amountFunc=mult` 或 `stacksMultiply=true` 走乘方（`Π multiplier`），pool 间乘法。`mult` 仅占 2.8%，`add` 是主体。

carry-dps 模式的真实 DPS 公式：

```
hero_final_dps = base_dps × level_curve
  × global_dps_pool           // unified：ability + patron/blessing 同 key global_dps_multiplier_mult 加法（1+Σ/100）→ Π(mult)
  × hero_dps_pool             // unified：ability + 装备 + patron/blessing 同 key hero_dps_multiplier_mult 加法（1+Σ/100）
  × crit_factor               // 1 + Σ(crit_chance)·(crit_damage_mult−1)
  × vulnerability_pool        // 按怪物 tag 条件匹配，Σ(add) → Π(mult)
```

`global_dps_pool` / `hero_dps_pool` 是 **unified 池**——ability 源（英雄技能）与外部源（patron / blessing / 装备 / 传奇装备）同属一个 IC effect key，按 IC 语义**同 key 全来源加法**（`1 + Σ(all value)/100`），非「ability 池 × 外部池」相乘。`scoreFormation` 把外部加成注入 ability 池副本（`mergePools` 同 key addPercent 相加、保留 multFactor）实现全源加法。

**传奇装备效果**（`legendaryEffects.ts`）：支持存档驱动和无存档假设，owned-aware + placement-aware + count-aware。简单 global_dps（无 per_crusader）合入 `equipmentGlobalDpsByHero`；per_crusader global_dps 和条件 hero_dps 走 `LegendaryContribution` 在 `aggregateExternalDamagePools` 中按拥有者是否在阵型 + 阵型匹配英雄数求值。等级缩放 `base × level`（线性）。无存档假设按目录 `heroIds` 反向索引合成全英雄全槽贡献；锻造建议复用相同目录，按当前阵型标签匹配和计数估算贡献并稳定输出前五名。

**加成源唯一性不变式**：unified 池「全源加法」的前提是每个源**只计一次**。装备源 effect（loot / legendary）只走 owned-aware 通道：加性 kind（hero_dps / global_dps / gold / health / crit，`equipmentMult.ts`）+ `buff_upgrade` wrapper（`equipmentBuffSignals.ts` `applyEquipmentBuffsToProfile`：owned loot + loot-catalog → 按 target upgradeId 反查 direct base → 构造 wrapper 注入 profile，与 feat / 专精同层）。build 管线**不得**把装备源信号烘进 base profile 的 scored signals **或 spec catalog**——`buildHeroModels` 过滤 loot / legendary / feat 不进 base，`specialization-catalog` build 同构过滤 `specializationDerived` 的 loot / legendary / feat 源。所有 wrapper 消费路径都必须接 sourceBucket 过滤。违反此不变式 → 双重计数（陷阱与防范纪律见 `modeling-pitfalls.md`）。

`HeroAbilitySignal.unit: 'percent'|'flat'|'boolean'`（默认 percent；`buff_upgrade_add_flat_amount` 是 flat）。

特殊 pool（不进常规 add / mult 聚合）：`formation_effect`、`static_dps_only`、`manual_bonus_calc`、`not_buffable`。

`static_dps_mult` fallback：`upgrade.static_dps_mult`（CNE 静态 dps 乘数近似 1.25–5）由 `collectRawEffectEntries` 读取；其 effect 未产出可解析 signal（复杂机制如 `target_attacking_monsters_hero_dps_mult`）的 upgrade，fallback 生成 `heroDpsMultiplier` mult signal（`value=(staticDpsMult−1)×100`，carrySignals self-buff）。upgrade 已有可解析 signal 时不 fallback，防重复。

## 评估维度

planner 当前支持的评估维度（`HeroAbilityDimension` + `DIMENSION_BY_KIND`）：

| 维度 | 进 carryDps | 说明 |
|------|:-----------:|------|
| damage | 是 | global / hero DPS multiplier、adjacent support、tagged champion multiplier。主目标量载体。 |
| gold | 独立模式 | `team_gold_find = BASE_GOLD × global_gold_pool × hero_gold_pool`，全队聚合（非单一 carry），走 `team-gold` scoringMode 分支；装备 `gold_multiplier_mult`（placement-aware per-hero）并入 gold:global 池。 |
| crit | 是 | `crit_factor = 1 + total_chance × (total_damage_mult − 1)`；默认 chance=2.5% / damage=100% 来自 `default_crit_info`，per-hero 可被 `set_base_crit_chance` 覆盖（归一基线）。装备 `buff_base_crit_*_mult`（hero-scope mult，per-carry）经 computeCritFactor 第三参注入（非池聚合）。 |
| vulnerability | 是 | 按场景怪物 tag 条件性匹配（`scenario.enemyTypes`）；add / mult 分流聚合，与 damage pool 一致。 |
| survival | 推图约束 | `effectiveHealth = baseHealth × healthLevelCurve × health_pool`；ability health + 装备 `health_mult`（hero-scoped per-carry）+ `damage_reduction_mult` 玩家侧减伤并入 health_pool。不进 carryDps，作为推图预估的存活约束。 |
| speed | 否 | `attack_speed_mult` / `reduce_attack_cooldown` 等解析进 pool，但不进 carryDps（hero_dps 按秒模型，speed 精确建模依赖 BUD / cooldown）。 |

### team-speed 评分模式

`team-speed` 是独立评分模式（`ScoringMode = 'team-speed'`），不走 carryDps 路径——`objectiveValue = speedMultiplier`（区域推进效率因子）。7 类静态速度效果 + 1 类动态假设（areaSkip）按 IC 语义聚合：

| 类别 | 因子公式 | 代表英雄 |
|------|----------|----------|
| questProgress | `Π(1+chance/100×(mult−1)) / (1−Σ(chance/100×reduction/100))` | Havilar, BBEG, Sentry, Hew Maan |
| spawnSpeed | `1+Σ(value/100)` | Deekin, Widdle |
| extraEnemies | `1+Σ(value/100)` | Ezmerelda, Minsc |
| timeScale | `1+Σ(value/100)`，cap 10 | Shandie |
| transitionSpeedup | `1+Σ(value/100)`，cap 5 | Diana |
| simultaneousSpawn | 二值 1.5 | Vi |
| preSpawn | 二值 1.2 | Lark, Anson |
| areaSkip | `1+Σ(value/100)` | Briv(25%), Lae'zel(18%), Thellora(15%), Halsin(11%) |

阵型级因子 = 各类别因子之积。三层缩放：装备 buff_upgrade（`applyEquipmentBuffsToSpeedEffects`）+ 阵型效果（`applyFormationSpeedEffects`，如 Hew Maan 相邻人类查表）+ 专精注入（`applySpecializationsToProfile` 合并 speedEffects）。动态英雄 areaSkip 使用 `DYNAMIC_SPEED_DEFAULTS` 默认值，可经 `dynamicSpeedOverrides` 入参覆盖。

`evaluatePlacementFit` 按 `dimension` 显式过滤 signal——非伤害 pool 不泄漏进 carryDps，damage signal 不进 team_gold_find。

`manualStackCount`（dynamic-stack-multiply 机制，如蔚「出言不逊」）：`stacksMultiply=true` **且无 stackFunc** 的纯动态层数 signal 按 `percentToMultiplier(value)^manualStackCount` 乘算，层数由 UI「动态层数假设」输入透传（默认 `DEFAULT_MANUAL_STACK_COUNT=1000`）。`stacksMultiply=true` **带 stackFunc** 的 signal（如 hero32 `per_mithral_hall_stacks`）层数源是 stackFunc 而非 area-based manual——走 stackFunc 计数路径（注册的按阵型计数、未注册的不计入目标值），不进 manualStackCount 短路（误进则 (1+value/100)^1000 灾难高估）。formation-count 等实时数英雄的机制不受影响。机制清单见 `dps-mechanics.md`。

未进目标值、只标记的效果：随机触发、击杀过程、逐区时间线、敌人实时状态、临时 buff、同时期互斥或无法静态判断的效果。未知 effect 必须进入 `warnings` 和 `unsupportedSignals`，不静默忽略。

## 候选池和公平假设

候选模式：

- `owned-only`：只使用账号快照中已拥有英雄，按真实装备、feat、传奇、专精和已保存阵型信息计算。
- `all-hypothetical`：包含未拥有英雄，默认使用公平投影假设。

未拥有英雄公平基线：同 seat 已拥有英雄足够时用同 seat 中位装备 / feat / 传奇假设；同 seat 不足时用账号全局中位数；空账号或数据不足时退回 `no-equipment/no-feat`，并强制显示 assumption。

## 搜索和评估

合法性先于评估：seat 冲突、banned champions、forced champions、locked / occupied slots、formation layout mismatch。

deterministic beam search。默认参数由领域常量集中管理（不写死 UI）：每个 seat 保留 Top N、主 DPS Top N、beam width、result count。结果排序稳定，同分用 deterministic tie-breaker。

搜索单位是**完整阵型**，不是逐槽位贪心；无论手动锁定 carry 还是自动枚举，完整阵型搜索时都必须有且仅有一个主 C 位。

## 推图层数预估 + 可行性约束

`estimateMaxArea`（`areaEstimation.ts`）取 killableArea 与 survivableArea 的 min 作为推图极限。每个约束都是关于层数的单调函数，墙 = min(所有约束)。

```
killableArea   = max area where BUD ≥ monsterHealthAt(area) × segmentMultiplier
survivableArea = max area where effectiveHealth × (1 − drainRate) ≥ monsterDpsAt(area) × enemyDamageMult
estimatedArea  = min(killableArea, survivableArea, MAX_AREA)
```

可行性约束（`ViabilityContext`，经 `scenario.viabilityContext` 传入，`restrictions-parser.ts` 从变体描述文本解析）：

| 约束 | 字段 | 模型 | 命中变体 |
|------|------|------|----------|
| 护甲 | `armor: SegmentConfig` | 吞吐量等效门槛 HP × segments（每段门槛 HP/N 始终 ≤ HP，不构成绑定约束；吞吐量惩罚是根因） | 27 |
| 命中型 | `hitsBased: SegmentConfig` | 同护甲吞吐量模式（需 N 次命中，可叠加） | 2 |
| 伤害削减 | `damageModifier: number` | BUD × damageModifier（0.01 = 减 99%） | 19 |
| 敌人强化 | `enemyDamageMult: number` | monsterDpsAt × mult | 3 |
| 持续掉血 | `healthDrainRate: number` | effectiveHealth × (1 − rate)（每秒掉血降低有效生命；rate ≥ 1 = 无法存活）；随机目标爆发不折算，保留 warning | 12 |

机制警告（`projectMechanicsToScenario`，从 mechanics 结构化标记映射，不改面积预估）：永久死亡（`perma_death`/`perma_unavailable`）、不回血（`only_heal_on_revive`/`skip_area_change_heal`）、暴击门控（`debuff_until_crit`，全英雄有基础 2.5% 暴击率故不改变预估）。

beam search 过滤（`scorePlannerFormationWithLegality`）：`minSurvivableArea` 选项检查整体预估 `area = min(killableArea, survivableArea)`——统一覆盖所有约束（护甲/命中型吞吐量、damageModifier 击杀削减、survival 生存），不达标的阵型返回 SCORE_ZERO。`AreaBound` 按绑定约束区分 `bud`/`survival`/`armor`/`hits-based`/`max-area`。

## 伤害来源位置限制（K4）

部分变体限制只有特定位置的英雄能造伤害。两层方案：

- **系统解析**（层 1，`scenario.damageSourcePattern`）：从 restrictions 文本解析位置模式（same-column / adjacent / not-adjacent / within-slots / front-columns / behind-columns），carry 不在有效位置 → DPS 归零（SCORE_ZERO）。模式依赖参考英雄位置，评分时按 placements 动态求值；`includeReference` 严格遵循原文是否明确包含参考英雄自身，前后列模式只包含严格前方/后方列，不把参考英雄所在列整体放宽。
- **UI 手动标记**（层 2，`userDamageDisabledSlots`）：用户标记不可造伤害的槽位，carry 落在这些槽位 → DPS 归零。默认全部可打（用户只做减法）。

## 计算模式（性能优化）

beam search 对「每个槽位 × 每个候选英雄」都跑一次全阵型求值，全英雄 worst case 一次推荐约 8s。计算模式通过「预计算收益 + 按席位裁剪候选」减少求值次数。

**预计算收益**（build 期 `computeHeroGainProfile`，写进 `hero-abilities.json` 的 `gainProfile`）：

- 每英雄各维度收益 = `(1+ΣaddPercent/100)×ΠmultFactor`，self 从 `carrySignals`、support 从 `supportSignals` 聚合（数学同 `placementFit` 的 pool 聚合，`DIMENSION_BY_KIND` 分维度）。
- 上界近似：假设所有 signal 命中、stack count=1、忽略 qualifier——只用于排序裁剪，精确限制匹配仍在 `scoreFormation` 做。裁剪决定「试不试谁」，不决定「算成多少」。
- `applyHeroAbilityPatch` 应用 override 后重算 `gainProfile`。

**运行时裁剪**（`applyComputationMode`，pure function）：

- 按席位分组，每组按 `compositeGain = max(self 复合, support 复合)` 降序（`OBJECTIVE_DIMENSIONS`：carry-dps 取 damage / crit / vulnerability，team-gold 取 gold）。
- 取前 `MODE_FRACTION` 比例（`full` / `p90` / `p50` = 1.0 / 0.9 / 0.5），每席位至少 1 个；forced 英雄（场景强制 + 用户锁 carry + 用户锁槽）无条件保留；保留原始顺序保证确定性。
- 挂在 `buildPlannerRecommendation` 候选过滤后、`beamSearch` 前；`evaluateFormation` 不裁剪（用户已显式指定阵型）。

选项：`PlannerRecommendationOptions.computationMode`（默认 `p50`）；UI `PlannerComputationMode` 选择器三档切换。

实测（`pnpm run simulate:benchmark`，全英雄 worst case / ~50 英雄）：`full` 8.2s / 2.2s，`p90` 7.6s / 2.2s（只快 ~7%），`p50` 4.4s / 1.1s（约减半）。默认 `p50` 把真实体感压到 1 秒级；要精度一键切 `full`。

降搜索宽度不是可靠加速——benchmark 实测 `beamWidth=4` 多数 variant 无损但偶发 objectiveValue 塌方、`≤3` 候选多的 variant 直接崩溃。默认保守留 8，可经 `PlannerRecommendationOptions.beamWidth` 覆盖。

增量求值经深入调研确认**严格等价下不可行**：632 个 count-dependent signal（`per_crusader` / `per_hero_attribute` / `per_tagged_crusader_mult` / `per_target_crusader` / `per_upgrade_targets`，分布在 96% 英雄）的 multiplier 依赖整队计数，加入英雄会改变已有 `(carry,support)` 对结果——严格增量须对已有对反向更新并传播到所有 carry，每步 Ω(N²)，与全量同级。性能优化改走 Web Worker 卸载（见 `computation-runtime.md`）。

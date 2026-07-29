# planner 模拟器、搜索与性能

## GameNumber

引入 `decimal.js`，只在 `src/domain/simulator/gameNumber.ts` 直接 import。业务代码只用 wrapper：`parseGameNumber`、`formatGameNumber`、`multiplyGameNumbers`、`divideGameNumbers`、`powerGameNumber`、`addGameNumbers`、`compareGameNumbers`、`log10GameNumber`、`sortGameNumbers`。

性能策略：

- 排序和 beam search 优先比较 `log10` 或 wrapper compare，不构造巨型十进制字符串。
- 加法使用集中阈值，初始阈值 15 个数量级；小项不影响 3 位游戏显示时直接忽略。
- 显示层默认 `1.50e92` 风格；不用 JS `number` 承载最终伤害。
- 核心数值类型必须覆盖超过 `Number.MAX_VALUE` 的游戏数值范围。

## 基线算法

默认基线是「最后专精 + 金币预算」：

```text
extractLastSpecializationUnlockLevel(champion upgrades)
estimateAffordableLevel(cost curve, gold budget, favor/blessing context)
baselineLevel = max(lastSpecializationLevel, affordableLevel if affordable)
```

金币预算不足以达到最后专精时，结果标记 `below-baseline`，UI 显示为不可靠候选。固定 1 级只用于 parser 与 fixture smoke test；不提供默认 100 级模式。

## 加成聚合与 DPS 公式

加成按 pool 结构聚合——顶级 pool = `kind`（能力维度），pool 内 `amountFunc=add` 走线性累加（`Σ percent`）、`amountFunc=mult` 或 `stacksMultiply=true` 走乘方（`Π multiplier`），pool 间乘法。`mult` 仅占 2.8%，`add` 是主体。

carry-dps 模式的真实 DPS 公式：

```
hero_final_dps = base_dps
  × global_dps_pool           // Σ(add) → Π(mult)
  × hero_dps_pool
  × Π(formation_effects)      // formation_effect 特殊 pool
  × Π(static_dps_mults)       // upgrade.static_dps_mult 近似
  × crit_factor               // 1 + Σ(crit_chance)·(crit_damage_mult−1)
  × vulnerability_pool        // 按怪物 tag 条件匹配，Σ(add) → Π(mult)
  × global_buff_pool          // patron-perks
  × equipment_adjustment      // owned 装备 / 理论基线 比
```

`HeroAbilitySignal.unit: 'percent'|'flat'|'boolean'`（默认 percent；`buff_upgrade_add_flat_amount` 是 flat）。

特殊 pool（不进常规 add/mult 聚合）：`formation_effect`、`static_dps_only`、`manual_bonus_calc`、`not_buffable`。

`static_dps_mult` fallback：`upgrade.static_dps_mult`（CNE 静态 dps 乘数近似 1.25–5）由 `collectRawEffectEntries` 读取；其 effect 未产出可解析 signal（复杂机制如 `target_attacking_monsters_hero_dps_mult`）的 upgrade，fallback 生成 `heroDpsMultiplier` mult signal（`value=(staticDpsMult−1)×100`，carrySignals self-buff）。upgrade 已有可解析 signal 时不 fallback，防重复。

## 评分维度

planner 当前支持的评分维度（`HeroAbilityDimension` + `DIMENSION_BY_KIND`）：

| 维度 | 进 carryDps | 说明 |
|------|:-----------:|------|
| damage | 是 | global/hero DPS multiplier、adjacent support、tagged champion multiplier。主评分载体。 |
| gold | 独立模式 | `team_gold_find = base_gold × global_gold_pool × hero_gold_pool`，全队聚合（非单一 carry），走 `team-gold` scoringMode 分支。 |
| crit | 是 | `crit_factor = 1 + total_chance × (total_damage_mult − 1)`；默认 chance=2.5%/damage=100% 来自 `default_crit_info`。BUD 机制下期望值低估，MVP 可接受。 |
| vulnerability | 是 | 按场景怪物 tag 条件性匹配（`scenario.enemyTypes`）；add/mult 分流聚合，与 damage pool 一致。 |
| survival | 推图约束 | `effectiveHealth = baseHealth × health_pool`；`damage_reduction_mult` 玩家侧减伤。不进 carryDps，作为推图预估的存活约束。 |
| speed | 否 | `attack_speed_mult`/`reduce_attack_cooldown` 等解析进 pool，但不进 carryDps（hero_dps 按秒模型，speed 精确建模依赖 BUD/cooldown）。 |
| global-buff | 是 | patron-perks 的 `patronPerkMult`（无条件全局 DPS）；blessings 因 definitions 无效果定义且 snapshot 丢弃 favor/blessings，不可做。 |
| equipment | 是（调整比） | `equipmentAdjustment = ownedEquipMult / theoreticalLootMult`，非侵入缩放理论上界到玩家实际装备。MVP 只算 `global_dps_multiplier_mult`。 |

`evaluatePlacementFit` 按 `dimension` 显式过滤 signal——非伤害 pool 不泄漏进 carryDps，damage signal 不进 team_gold_find。

`manualStackCount`（dynamic-stack-multiply 机制，如蔚「出言不逊」）：`stacksMultiply=true` 的 signal 按 `percentToMultiplier(value)^manualStackCount` 乘算，层数由 UI「动态层数假设」输入透传（默认 `DEFAULT_MANUAL_STACK_COUNT=1000`）。仅影响动态层数类 signal；formation-count 等实时数英雄的机制不受影响。机制清单见 `dps-mechanics.md`。

未进评分、只标记的效果：随机触发、击杀过程、逐区时间线、敌人实时状态、临时 buff、同时期互斥或无法静态判断的效果。未知 effect 必须进入 `warnings` 和 `unsupportedSignals`，不静默忽略。

## 候选池和公平假设

候选模式：

- `owned-only`：只使用账号快照中已拥有英雄，按真实装备、feat、传奇、专精和已保存阵型信息计算。
- `all-hypothetical`：包含未拥有英雄，默认使用公平投影假设。

未拥有英雄公平基线：同 seat 已拥有英雄足够时用同 seat 中位装备/feat/传奇假设；同 seat 不足时用账号全局中位数；空账号或数据不足时退回 `no-equipment/no-feat`，并强制显示 assumption。

## 搜索和评分

合法性先于评分：seat 冲突、banned champions、forced champions、locked/occupied slots、formation layout mismatch。

deterministic beam search。默认参数由领域常量集中管理（不写死 UI）：每个 seat 保留 Top N、主 DPS Top N、beam width、result count。结果排序稳定，同分用 deterministic tie-breaker。

搜索单位是**完整阵型**，不是逐槽位贪心；无论手动锁定 carry 还是自动枚举，完整阵型搜索时都必须有且仅有一个主 C 位。

## 计算模式（性能优化）

beam search 对「每个槽位 × 每个候选英雄」都跑一次全阵型评分，全英雄 worst case 一次推荐约 8s。计算模式通过「预计算收益 + 按席位裁剪候选」减少评分次数。

**预计算收益**（build 期 `computeHeroGainProfile`，写进 `hero-abilities.json` 的 `gainProfile`）：

- 每英雄各维度收益 = `(1+ΣaddPercent/100)×ΠmultFactor`，self 从 `carrySignals`、support 从 `supportSignals` 聚合（数学同 `placementFit` 的 pool 聚合，`DIMENSION_BY_KIND` 分维度）。
- 上界近似：假设所有 signal 命中、stack count=1、忽略 qualifier——只用于排序裁剪，精确限制匹配仍在 `scoreFormation` 做。裁剪决定「试不试谁」，不决定「算成多少」。
- `applyHeroAbilityPatch` 应用 override 后重算 `gainProfile`。

**运行时裁剪**（`applyComputationMode`，pure function）：

- 按席位分组，每组按 `compositeGain = max(self 复合, support 复合)` 降序（`OBJECTIVE_DIMENSIONS`：carry-dps 取 damage/crit/vulnerability/global-buff，team-gold 取 gold）。
- 取前 `MODE_FRACTION` 比例（`full`/`p90`/`p50` = 1.0/0.9/0.5），每席位至少 1 个；forced 英雄（场景强制 + 用户锁 carry + 用户锁槽）无条件保留；保留原始顺序保证确定性。
- 挂在 `buildPlannerRecommendation` 候选过滤后、`beamSearch` 前；`evaluateFormation` 不裁剪（用户已显式指定阵型）。

选项：`PlannerRecommendationOptions.computationMode`（默认 `p50`）；UI `PlannerComputationMode` 选择器三档切换。

实测（`npm run simulate:benchmark`，全英雄 worst case / ~50 英雄）：`full` 8.2s / 2.2s，`p90` 7.6s / 2.2s（只快 ~7%），`p50` 4.4s / 1.1s（约减半）。默认 `p50` 把真实体感压到 1 秒级；要精度一键切 `full`。

降搜索宽度不是可靠加速——benchmark 实测 `beamWidth=4` 多数 variant 无损但偶发 objectiveValue 塌方、`≤3` 候选多的 variant 直接崩溃。默认保守留 8，可经 `PlannerRecommendationOptions.beamWidth` 覆盖。

增量评分经深入调研确认**严格等价下不可行**：632 个 count-dependent signal（`per_crusader`/`per_hero_attribute`/`per_tagged_crusader_mult`/`per_target_crusader`/`per_upgrade_targets`，分布在 96% 英雄）的 multiplier 依赖整队计数，加入英雄会改变已有 `(carry,support)` 对结果——严格增量须对已有对反向更新并传播到所有 carry，每步 Ω(N²)，与全量同级。性能优化改走下方 Web Worker 卸载。

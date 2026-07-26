# planner 模拟器、搜索与性能

## GameNumber

引入 `break_eternity.js`，只在 `src/domain/simulator/gameNumber.ts` 直接 import。业务代码只用 wrapper：`parseGameNumber`、`formatGameNumber`、`multiplyGameNumbers`、`divideGameNumbers`、`powerGameNumber`、`addGameNumbers`、`compareGameNumbers`、`log10GameNumber`、`sortGameNumbers`。

性能策略：

- 排序和 beam search 优先比较 `log10` 或 wrapper compare，不构造巨型十进制字符串。
- 加法使用集中阈值，初始阈值 15 个数量级；小项不影响 3 位游戏显示时直接忽略。
- 显示层默认 `1.50e92` 风格；不用 JS `number` 承载最终伤害。
- 支持超过 `Number.MAX_VALUE` 的数值，避免后续换核心数值类型。

## 基线算法

默认基线是「最后专精 + 金币预算」：

```text
extractLastSpecializationUnlockLevel(champion upgrades)
estimateAffordableLevel(cost curve, gold budget, favor/blessing context)
baselineLevel = max(lastSpecializationLevel, affordableLevel if affordable)
```

金币预算不足以达到最后专精时，结果标记 `below-baseline`，UI 显示为不可靠候选。固定 1 级只用于 parser 与 fixture smoke test；不提供默认 100 级模式。

## 加成聚合与 DPS 公式

加成按 pool 结构聚合——顶级 pool = `kind`（能力维度），pool 内 `amountFunc=add` 走线性累加（`Σ percent`）、`amountFunc=mult` 走乘方（`Π multiplier`），pool 间乘法。`mult` 仅占 2.8%，`add` 是主体。

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

未进评分、只标记的效果：随机触发、击杀过程、逐区时间线、敌人实时状态、临时 buff、动态堆叠、同时期互斥或无法静态判断的效果。未知 effect 必须进入 `warnings` 和 `unsupportedSignals`，不静默忽略。

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

## Web Worker 计算卸载

beam search 同步跑主线程（`usePlannerPageModel` 的 `useMemo` 直接调 `buildPlannerRecommendation`），p50 ~1s / full ~8s 期间 UI 完全冻结——连 loading 都画不出。改走「卸载」：不改算法、不改结果，只改在哪跑。

**架构**：

- 数据加载留主线程（`usePlannerCollections` 不变）：UI 需要 `variants`（场景列表）+ `championById`（英雄名）渲染选择器。
- 计算移 worker：`buildPlannerRecommendation` / `evaluateFormation` 原封 import 进 worker，算法代码零改动。
- 缓存边界：worker init 时缓存 `plannerHeroes + plannerScenarios`（~17.5M，一次性 postMessage），之后通信只传 `selectedVariant + profileSnapshot + options/placements`。`variants` 不进 worker——engine 只用 UI 已解析的 `selectedVariant`。

**通信协议**：

```
UI → worker:
  init     { collections:{plannerHeroes,plannerScenarios}, collectionsVersion }   # collections ready 后一次
  recommend{ collectionsVersion, variant, profileSnapshot, options, requestId }
  evaluate { collectionsVersion, variant, profileSnapshot, placements, options, requestId }
worker → UI:
  ready    # worker import 完成（收到即可发 init）
  result   { requestId, ok:true, result } | { requestId, ok:false, error }
```

**取消与防抖**：worker 单线程无法中断同步 JS 计算。UI 端 debounce（~150ms）合并连续输入 + `requestId` 递增，只接受最新 requestId 的结果（旧的丢弃）。连续改选项时旧任务跑完自然丢弃，CPU 浪费换实现简单。

**loading**：worker 天然异步，计算中结果区显示 loading 占位。

**测试策略**：抽象 `PlannerComputeRunner` 接口（`init`/`recommend`/`evaluate`），`SyncPlannerComputeRunner`（测试，直接调 engine 函数）+ `WorkerPlannerComputeRunner`（生产，postMessage）；hook 注入 runner，单测用 Sync 覆盖 loading 翻转 / requestId 丢弃 / debounce；client 单测 mock `Worker` 验证协议。

**边界**：worker 启动 + 首次 collections 传输一次性开销 ~50-100ms，相比 1-8s 计算可忽略；GitHub Pages 静态站原生支持 module worker（`import.meta.env.BASE_URL` 兼容）；主线程 + worker 各持一份 collections（~17.5M×2），静态站可接受。

## 推图层数预估

`src/domain/planner/areaEstimation.ts` + `src/domain/simulator/monsterStats.ts`：二分查找 `max area where BUD（或 carryDps）>= monster_stat(area)`，结合 survival 约束（effectiveHealth 不足 monster_damage 时限制推图层数）。

怪物 stats 是全局 game rule（`game_rule_defines.rule_name=="monster_base_stats"`），按 per-area stepped curve 逐层复合累积：`stat(area) = base × Π_{a=2..area} curve_lookup(a)`。生命每层 ~2× 是 IC 指数墙核心；dps 增长缓慢（每 50 层 1.75×）。HP（击杀时间）是推图层数主要约束，survival 在推图初期决定后长期稳定。数据源字段与缩放公式见 `data-source-confirmations.md`。

**绝对值校准边界**：公式结构来自官方数据，但绝对值未与真实游戏实测对照。推图预估的「第 X 层」是绝对量，依赖 BUD 实测校准（见 `bud-verification.md`）才能采信；校准前仅供方向参考，UI 标注「未校准」。相对比较（高 BUD 阵型预估层数 > 低 BUD）不受影响。

## 辅助指标

- **BUD**：`BUD = max over placed heroes of (heroDps × attackCooldown)`。慢攻击（高 cooldown）英雄单次伤害更高，更易成为 BUD setter。carryDps 当前不含攻速，用作 heroDps 时与「真·每秒」存在系统性偏差；BUD 作为 speed 感知辅助指标并行计算。详见 `bud-verification.md`。
- **click damage**：`click_damage = BUD × click_seconds`（派生自 BUD，MVP 近似；click_seconds 换算关系在当前 definitions 未找到）。辅助参考值展示，**不参与阵型评分/排序**。
- **modron**：从 `game-rules.max_modron_auto_reset_area` 评估 reset 节奏，UI 展示「建议 modron reset 第 X 层」辅助信息。
- **ult/主动技能 buff**（`ability_defines`，10 英雄，id===hero_id 对齐）：normalize 层提取到 `champion-details.ability`，按 modron 自动施放节奏折算 uptime——`uptime = duration / base_cooldown`（modron 满级），ult buff 有效值 = `value × uptime`，进对应 pool。modron 未满级时 uptime=0，ult buff 不进 pool（保守不计）。

## 输出合同

`PlannerResult.breakdown`（`SimulationBreakdown`，JSON 可序列化）承载每位英雄加成拆解：

- `carryHeroId` / `carrySlotId` / `carryLevel`：核心输出位。
- `baseDps` / `levelCurve` / `carryDps`：加成前基线、增长率、最终 DPS（游戏记数法字符串，可超 `Number.MAX_VALUE`）。
- `factors`：`damagePool` / `crit` / `vulnerability` / `globalBuff` / `equipmentAdjustment`（`carryDps = baseDps × 各因子之积`）。
- `pools`：damage 维度聚合池（`dimension:scope`，`addPercent`/`multFactor`/`poolMultiplier`）。
- `contributions`：每位支持位的 active signal 拆解（`signalKind`/`multiplier`/`reasonCode`/`rawEffect`）。

`evaluateFormation` 合法性违规（seat 冲突 / banned / locked / `only_allow_crusaders` 白名单外）与未拥有英雄的 level 1 回退作为 warning 附加，仍出拆解（强制英雄豁免未拥有/白名单检查）。

完整推荐结果字段以 `src/domain/planner/recommendationTypes.ts` 代码为准。

## UI 工作台

planner 页面是工作台，不是 landing page。

**自动计划页（`/planner`）**：

- profile 状态：无快照、快照年龄、warnings、手动刷新入口、删除入口。
- scenario 区：variant 搜索、formation layout、限制摘要。
- candidate 区：owned-only / all-hypothetical。
- baseline 区：金币预算、最后专精状态、below-baseline warning。
- 推荐模式：carry-dps / team-gold（`PlannerScoringMode`）；计算模式 full / p90 / p50（`PlannerComputationMode`，默认 p50）。
- C 位指定 + 锁槽（`PlannerCarryLock` / `PlannerSlotLock`）：所有英雄候选，不限 dps 角色。
- result 区：Top 3-5（`PlannerTopLineups`），用 `FormationBoardCanvas` 渲染棋盘 + carry 标记 + `objectiveValue`（游戏记数法）+ 推图层数预估 + survival 约束 + `PlannerBreakdown` 加成拆解（按英雄 top-N，超 3 折叠）。
- save 区：把有效结果保存到 formation preset，或导入阵型编辑器（写 formationDraft，跳转 /formation）。

**自配评估页（`/planner/evaluate`）**：基于 `evaluateFormation` 的「可编辑阵型棋盘按 exact 阵型评估」工作台——用户摆阵型 → `evaluateFormation` 重算 → breakdown 渲染。支持槽位锁（锁定槽位不可变，`<select>` 禁用、拖拽覆盖与拖出移除均被拒）、「算剩余最优」（`buildPlannerRecommendation` 半自动补全未锁槽位）、「回填到自动计划」（路由 state 带 `lockedSlotsFromEvaluate` + `variantIdFromEvaluate`）。切场景清锁与已摆阵型。

`FormationBoardCanvas`（纯渲染：slots + placements + championById + carrySlotId）从 formation 编辑器抽取复用；`HeroPicker`（搜索 + 按 seat 分组 + 头像）双模式——picker 模式（传 `onChange`，点击选择，供移动端）与拖拽源模式（英雄卡 `draggable` 写 dataTransfer，供桌面槽位 drop）。

## 测试覆盖

- 数字：`1.50e92`、`4.08e167`、`1e1000`、加法阈值、排序稳定性。
- 模拟器：最后专精、金币预算、effect parser、unsupported warning、各维度 pool 聚合。
- Planner：候选池、合法性、稳态评分、beam search、计算模式裁剪、evaluateFormation。
- UI：profile 状态、场景选择、结果卡、保存 preset、loading 翻转 / requestId 丢弃 / debounce。

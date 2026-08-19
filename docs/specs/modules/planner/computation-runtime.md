# planner 计算运行时与输出

## Web Worker 计算卸载

beam search 同步跑主线程会冻结 UI，改走「卸载」：不改算法、不改结果，只改在哪跑。

**架构**：

- 数据加载留主线程（`usePlannerCollections` 不变）：UI 需要 `variants`（场景列表）+ `championById`（英雄名）渲染选择器。
- 计算移 worker：`buildPlannerRecommendation` / `evaluateFormation` 原封 import 进 worker，算法代码零改动。
- 缓存边界：worker init 时缓存 `plannerHeroes + plannerScenarios`（一次性 postMessage），之后通信只传 `selectedVariant + profileSnapshot + options/placements`。`variants` 不进 worker——engine 只用 UI 已解析的 `selectedVariant`。

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

**取消与防抖**：worker 单线程无法中断同步 JS 计算。UI 端 debounce（~150ms）合并连续输入 + `requestId` 递增，只接受最新 requestId 的结果（旧的丢弃）。

**loading**：worker 天然异步，计算中结果区显示 loading 占位。

**测试策略**：抽象 `PlannerComputeRunner` 接口（`updateCollections` / `recommend` / `evaluate`），`SyncPlannerComputeRunner`（测试，直接调 engine 函数）+ `WorkerPlannerComputeRunner`（生产，postMessage）；hook 注入 runner，单测用 Sync 覆盖 loading 翻转 / requestId 丢弃 / debounce；client 单测 mock `Worker` 验证协议。

**边界**：worker 启动 + 首次 collections 传输一次性开销相比 1-8s 计算可忽略；GitHub Pages 静态站原生支持 module worker（`import.meta.env.BASE_URL` 兼容）。

## 推图层数预估

`src/domain/simulator/areaEstimation.ts` + `src/domain/simulator/monsterStats.ts`：二分查找 `max area where BUD（或 carryDps）>= monster_stat(area)`，结合 survival 约束（effectiveHealth 不足 monster_damage 时限制推图层数）。

```
killableArea    = max area where BUD ≥ monsterHealthAt(area) × segmentMultiplier
survivableArea  = max area where effectiveHealth × (1 − drainRate) ≥ monsterDpsAt(area) × enemyDamageMult
estimatedArea   = min(killableArea, survivableArea, MAX_AREA)
```

`segmentMultiplier` / `drainRate` / `enemyDamageMult` 来自变体可行性上下文（`ViabilityContext`，经 `scenario` 参数传入）。普通变体全 null → 行为与旧公式一致。约束模型细节见 `simulator.md`。

怪物 stats 是全局 game rule（`monster_base_stats.rule`），按 per-area stepped curve 逐层复合累积，内联在 `monsterStats.ts`（非运行时加载 game-rules.json）。数据源字段与缩放公式见 `docs/research/data/planner/monster-and-area-scaling.md`。

**绝对值校准边界**：BUD 用 best carry 的 `heroDps × attackCooldown` 近似阵型 BUD（`budCalculation.ts`，carry 通常设 BUD；阵型级 max-over-heroes 精确化待 BUD 校准）。公式结构来自官方数据，绝对值未与实测对照，预估的「第 X 层」依赖 BUD 校准才闭环——校准前 UI 标注「未校准」。校准证据见 `docs/research/data/planner/bud-calibration.md`。

**量纲缺口**：`monsterDpsAt` 当前由 raw `base_dps` + `dps_growth_rate_curve` 担任，survival 的精确判据是单次伤害（`base_speed`=50 语义 per-second vs per-hit 未确认），故 survival 以「怪物伤害随层数缩放」近似。

## 输出合同

`PlannerResult.breakdown`（`SimulationBreakdown`，JSON 可序列化）承载 best carry 的加成拆解：

- `carryHeroId` / `carrySlotId` / `carryLevel`：核心输出位。
- `baseDps` / `levelCurve` / `carryDps`：加成前基线、增长率、最终 DPS（游戏记数法字符串，可超 `Number.MAX_VALUE`）。
- `factors`：`damagePool` / `crit` / `vulnerability` / `globalBuff` / `heroDpsPool`（`carryDps = baseDps × 各因子之积`）。`globalBuff` / `heroDpsPool` 是 unified 池——ability 源与外部加成（patron / blessing / 装备）同 key 加法合并后的单一池因子；`damagePool` 为残余非 global / hero 池。作单一因子外露以保证因子之积可复现 carryDps。
- `pools`：damage 维度聚合池（`dimension:scope`，`addPercent` / `multFactor` / `poolMultiplier`）。
- `contributions`：每位支持位的 active signal 拆解（`signalKind` / `multiplier` / `reasonCode` / `rawEffect`）。

`PlannerResult.viability`（`ViabilityAssessment`）：活跃约束标识（`activeConstraints`，如 `['armor', 'health-drain']`）+ 绑定约束（`boundBy`，来自 areaEstimate）。普通变体 activeConstraints 为空。

外部加成未传入时按乘法单位元 `1` 处理；显式伤害聚合值为 `0` 时保留零结果。外部 `effect_def` 的 `$replace` 数值若乘积溢出，解析层按非法值丢弃——这是未建模/不可表达规则的业务降级。进入评分器的必填基础伤害、等级、伤害/生命聚合值、信号类型、池乘数和已提供的运行时假设若为 NaN、Infinity 或违反取值边界，统一直接抛异常，经 worker 返回 `ok:false`；不再跳过 carry、置零或附 warning 掩盖上游契约损坏。

兼容边界必须有业务语义：未传入的可选加成使用数学单位元；未提供攻击目标数（`null`/`undefined`，以及官方数据使用的 `0` 哨兵）按单目标近似；未建模或手动触发机制继续 warning + 不计入目标值。显式损坏的 override、等级和数值字段不属于这些兼容路径。

`evaluateFormation` 合法性违规（seat 冲突 / locked / `only_allow_crusaders` 白名单外）与未拥有英雄的 level 1 回退作为 warning 附加，仍出拆解（强制英雄豁免未拥有 / 白名单检查）。

完整推荐结果字段以 `src/domain/planner/recommendationTypes.ts` 代码为准。

## UI 工作台

planner 页面是工作台，不是 landing page。

**自动计划页（`/planner`）**：

- profile 状态：无快照、快照年龄、warnings、手动刷新入口、删除入口。
- scenario 区：variant 搜索、formation layout、限制摘要。
- candidate 区：owned-only / all-hypothetical。
- 推荐模式：carry-dps / team-gold（`PlannerScoringMode`）；计算模式 full / p90 / p50（`PlannerComputationMode`，默认 p50）。
- C 位指定 + 锁槽（`PlannerCarryLock` / `PlannerSlotLock`）：所有英雄候选，不限 dps 角色。
- 可行性控件：`PlannerSurvivableArea`（生存阈值，null=仅报告，输入数字=启用过滤）、`PlannerDamageSlots`（手动标记不可造伤害槽位，K4 层 2）。
- result 区：Top 3-5（`PlannerTopLineups`），用 `FormationBoardCanvas` 渲染棋盘 + carry 标记 + `objectiveValue`（游戏记数法）+ 推图层数预估 + survival 约束 + 可行性约束摘要（`ViabilityAssessment`）+ `PlannerBreakdown` 加成拆解。
- save 区：把有效结果保存到 formation preset，或导入阵型编辑器（写 formationDraft，跳转 /formation）。

**自配评估页（`/planner/evaluate`）**：基于 `evaluateFormation` 的「可编辑阵型棋盘按 exact 阵型评估」工作台——用户摆阵型 → `evaluateFormation` 重算 → breakdown 渲染。支持槽位锁、「算剩余最优」（`buildPlannerRecommendation` 半自动补全未锁槽位）、「回填到自动计划」。切场景清锁与已摆阵型。

`FormationBoardCanvas`（纯渲染：slots + placements + championById + carrySlotId）从 formation 编辑器抽取复用；`HeroPicker`（搜索 + 按 seat 分组 + 头像）双模式——picker 模式（点击选择，供移动端）与拖拽源模式（英雄卡 `draggable` 写 dataTransfer，供桌面槽位 drop）。

## 未接入的辅助指标

ult buff（`ultUptime.ts`）、click damage（`clickDamage.ts`）、modron reset（`modronInfo.ts`）的折算函数已实现但**零生产调用**，不进目标值 / 排序 / 输出合同。接入后 ult buff 按 modron 自动施放 uptime 折算、click damage 由 BUD 派生、modron reset 给出层数建议。

## 测试覆盖

- 数字：`1.50e92`、`4.08e167`、`1e1000`、加法阈值、排序稳定性。
- 模拟器：effect parser、unsupported warning、各维度 pool 聚合、baseDps / survival / bud / area 公式。
- Planner：候选池、合法性、稳态求值、beam search、计算模式裁剪、evaluateFormation。
- UI：profile 状态、场景选择、结果卡、保存 preset、loading 翻转 / requestId 丢弃 / debounce。

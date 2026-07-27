# planner 计算运行时与输出

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

怪物 stats 是全局 game rule，按 per-area stepped curve 逐层复合累积。数据源字段与缩放公式见 `docs/research/data/planner/monster-and-area-scaling.md`。

**绝对值校准边界**：公式结构来自官方数据，绝对值校准证据见 `docs/research/data/planner/bud-calibration.md`。校准前 UI 标注「未校准」。

## 辅助指标

- **BUD**：`BUD = max over placed heroes of (heroDps × attackCooldown)`。慢攻击英雄单次伤害更高，更易成为 BUD setter；校准证据见 `docs/research/data/planner/bud-calibration.md`。
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

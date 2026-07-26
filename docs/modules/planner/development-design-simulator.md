# Planner 模拟器与搜索设计

## GameNumber

引入 `break_eternity.js`，但只在 `src/domain/simulator/gameNumber.ts` 中直接 import。业务代码只用 wrapper：

- `parseGameNumber`
- `formatGameNumber`
- `multiplyGameNumbers`
- `divideGameNumbers`
- `powerGameNumber`
- `addGameNumbers`
- `compareGameNumbers`
- `log10GameNumber`
- `sortGameNumbers`

性能策略：

- 排序和 beam search 优先比较 `log10` 或 wrapper compare，不构造巨型十进制字符串。
- 加法使用集中阈值，初始阈值为 15 个数量级；小项不会影响 3 位游戏显示时直接忽略。
- 显示层默认 `1.50e92` 风格；不要用 JS `number` 承载最终伤害。
- 需要现在就支持超过 `Number.MAX_VALUE` 的普通科学计数和更后期数值，避免后续再换核心数值类型。

## 基线算法

默认基线是“最后专精 + 金币预算”：

```text
extractLastSpecializationUnlockLevel(champion upgrades)
estimateAffordableLevel(cost curve, gold budget, favor/blessing context)
baselineLevel = max(lastSpecializationLevel, affordableLevel if affordable)
```

如果金币预算不足以达到最后专精，结果标记 `below-baseline`，并在 UI 中显示为不可靠候选。固定 1 级只作为 parser 与 fixture smoke test；不提供默认 100 级模式。

## 模拟范围

第一版计算可预计算的稳态伤害：

- global DPS multiplier
- hero DPS multiplier
- adjacent support
- tagged champion multiplier
- 明确可投影的位置或阵营条件

第一版只标记、不计入评分：

- 随机触发
- 击杀过程
- 逐区时间线
- 敌人实时状态
- 临时 buff
- 动态堆叠
- 同时期互斥或无法静态判断的效果

未知 effect 必须进入 `warnings` 和 `unsupportedEffects`，不能静默忽略。

## 候选池和公平假设

候选模式：

- `owned-only`：只使用账号快照中已拥有英雄，按真实装备、feat、传奇、专精和已保存阵型信息计算。
- `all-hypothetical`：包含未拥有英雄，默认使用公平投影假设。

未拥有英雄公平基线：

- 同 seat 已拥有英雄足够时，使用同 seat 中位装备/feat/传奇假设。
- 同 seat 不足时，使用账号全局中位数。
- 空账号或数据不足时，退回 `no-equipment/no-feat`，并强制显示 assumption。

## 搜索和评分

合法性先于评分：

- seat 冲突
- banned champions
- forced champions
- locked/occupied slots
- formation layout mismatch

第一版使用 deterministic beam search。默认参数由领域常量集中管理，不写死在 UI 中：每个 seat 保留 Top N、主 DPS Top N、beam width、result count。结果排序必须稳定，同分使用 deterministic tie-breaker。

## 模拟/UI 分离与 JSON 输出契约

模拟引擎全部在 `src/domain/planner/` + `src/domain/simulator/` + `src/domain/abilities/`，零 React/UI 依赖。脱离 webUI 直接调用同样能完成模拟并以 JSON 输出。

两个纯函数入口（共享 `resolvePlannerScenario` 做 variant→scenario 与 blocker 解析）：

- `buildPlannerRecommendation(variant, collections, profile, options)`：beam search 找 Top K 最佳阵型。
- `evaluateFormation(variant, collections, profile, placements, options)`：评估用户指定的单一阵型（不搜索），输出该阵型的完整拆解。UI 调整英雄后重算、CLI 指定阵型均走这里；合法性违规（seat 冲突 / banned / locked / `only_allow_crusaders` 白名单外）与未拥有英雄的 level 1 回退作为 warning 附加，仍出拆解（强制英雄豁免未拥有/白名单检查）。

`PlannerResult.breakdown`（`SimulationBreakdown`，JSON 可序列化）承载每位英雄加成拆解：

- `carryHeroId` / `carrySlotId` / `carryLevel`：核心输出位
- `baseDps` / `levelCurve` / `carryDps`：加成前基线、增长率、最终 DPS（游戏记数法字符串，可超 `Number.MAX_VALUE`）
- `factors`：`damagePool` / `crit` / `vulnerability` / `globalBuff` / `equipmentAdjustment`（`carryDps = baseDps × 各因子之积`）
- `pools`：damage 维度聚合池（`dimension:scope`，`addPercent`/`multFactor`/`poolMultiplier`）
- `contributions`：每位支持位的 active signal 拆解（`signalKind`/`multiplier`/`reasonCode`/`rawEffect`）

CLI 证明（"丢 UI 输出 JSON"）：`npm run simulate -- recommend|evaluate`（`scripts/simulator/simulate.ts`）读 `public/data/v1/*.json` → `resolvePlannerModel` → 引擎 → stdout JSON。无 `--profile` 时合成"全英雄已拥有（level 1）"快照演示完整链路；真实使用传账号快照路径。

## 计算模式（性能优化·阶段 18）

beam search 对「每个槽位 × 每个候选英雄」都跑一次全阵型评分，全英雄 worst case 一次推荐 ~8s。计算模式通过「预计算收益 + 按席位裁剪候选」减少评分次数。

**预计算收益**（build 期，`computeHeroGainProfile`，写进 `hero-abilities.json` 的 `gainProfile`）：

- 每英雄各维度收益 = `(1+ΣaddPercent/100)×ΠmultFactor`，self 从 `carrySignals`、support 从 `supportSignals` 聚合（数学同 `placementFit` 的 pool 聚合，`DIMENSION_BY_KIND` 分维度）。
- 上界近似：假设所有 signal 命中、stack count=1、忽略 qualifier——只用于排序裁剪，精确限制匹配仍在 `scoreFormation` 做。裁剪决定「试不试谁」，不决定「算成多少」。
- `applyHeroAbilityPatch` 应用 override 后重算 `gainProfile`（不 stale）。

**运行时裁剪**（`applyComputationMode`，pure function）：

- 按席位分组，每组按 `compositeGain = max(self 复合, support 复合)` 降序（`OBJECTIVE_DIMENSIONS`：carry-dps 取 damage/crit/vulnerability/global-buff，team-gold 取 gold；英雄可当 carry 或 support，取两侧最大保住任一角色强的）。
- 取前 `MODE_FRACTION` 比例（`full`/`p90`/`p50` = 1.0/0.9/0.5），每席位至少 1 个；forced 英雄（场景强制 + 用户锁 carry + 用户锁槽）无条件保留；保留原始顺序保证确定性。
- 挂在 `buildPlannerRecommendation` 候选过滤后、`beamSearch` 前；`evaluateFormation` 不裁剪（用户已显式指定阵型）。

**选项**：`PlannerRecommendationOptions.computationMode`（默认 `p50`）；UI `PlannerComputationMode` 选择器三档切换。

**实测**（`npm run simulate:benchmark`，全英雄 worst case / ~50 英雄）：`full` 8.2s / 2.2s，`p90` 7.6s / 2.2s（只快 ~7%，砍 10% 杯水车薪），`p50` 4.4s / 1.1s（约减半）。默认 `p50` 把真实体感压到 1 秒级；要精度一键切 `full`。

**结构性加速调研结论**（阶段 18 同期）：
- `scoreFormation` 三维 `evaluatePlacementFit` 合并为单次（`dimension` 数组）：行为等价、代码更干净，但性能边际——贵的 qualifier 匹配本就在维度过滤 `continue` 之后、每信号仅一次，3× 冗余仅在便宜的迭代开销。
- beam search 宽度（`beamWidth`，默认 8，可经 `PlannerRecommendationOptions.beamWidth` 覆盖）：benchmark 扫描实测 `width=4` 多数 variant 无损但偶发 objectiveValue 塌方、`width≤3` 候选多的 variant 直接崩溃（log10 比 -4）。**降搜索宽度不是可靠加速**——降的是搜索质量，不是单次成本。默认保守留 8。
- 真正可靠的加速是 computationMode 候选裁剪（少评分次数）。**增量评分经深入调研确认严格等价下不可行**（详见下节「Web Worker 计算卸载」动机）：632 个 count-dependent signal（`per_crusader`/`per_hero_attribute`/`per_tagged_crusader_mult`/`per_target_crusader`/`per_upgrade_targets`，分布在 157/164=96% 英雄）的 multiplier 依赖整队计数（`countQualifiedHeroes`/`countUpgradeTargets` 对 `input.placements` 整体遍历），加入英雄会改变已有 `(carry,support)` 对结果——简单增量（只 merge 新对）数学不等价；严格增量须对已有对反向更新并传播到所有 carry，每步 Ω(N²)（与全量同级），~N 倍达不到。改走「计算卸载到 Web Worker」。

## Web Worker 计算卸载（阶段 19·性能优化）

### 动机

beam search 同步跑在 React 渲染主线程（`usePlannerPageModel` 的 `useMemo` 直接调 `buildPlannerRecommendation`），p50 ~1s / full ~8s 期间 UI 完全冻结——连 loading 都画不出（主线程被占，React 来不及渲染）。增量评分不可行（见上），改走「卸载」：不改算法、不改结果，只改在哪跑。

### 架构

- **数据加载留主线程**（`usePlannerCollections` 不变）：UI 需要 `variants`（场景列表）+ `championById`（英雄名）渲染选择器。
- **计算移 worker**：`buildPlannerRecommendation` / `evaluateFormation` 原封 import 进 worker，算法代码零改动。
- **缓存边界**：worker init 时缓存 `plannerHeroes + plannerScenarios`（~17.5M，一次性 postMessage），之后通信只传 `selectedVariant + profileSnapshot + options/placements`（小）。`variants` 不进 worker——engine 只用 UI 已解析的 `selectedVariant`（见 `resolvePlannerScenario`）。

### 通信协议

```
UI → worker:
  init     { collections:{plannerHeroes,plannerScenarios}, collectionsVersion }   # collections ready 后一次
  recommend{ collectionsVersion, variant, profileSnapshot, options, requestId }
  evaluate { collectionsVersion, variant, profileSnapshot, placements, options, requestId }
worker → UI:
  ready    # worker import 完成（收到即可发 init）
  result   { requestId, ok:true, result } | { requestId, ok:false, error }
```

### 取消与防抖

worker 单线程无法中断同步 JS 计算。UI 端 debounce（~150ms）合并连续输入 + `requestId` 递增，只接受最新 requestId 的结果（旧的丢弃）。连续改选项时 worker 消息队列堆积、旧任务跑完自然丢弃，CPU 浪费换实现简单；实测若卡顿再升级为 terminate/recreate。

### loading

worker 天然异步，计算中结果区显示 loading 占位（转圈）。这是体感核心——之前同步阻塞连「算中」反馈都给不了。

### 测试策略

- 抽象 `PlannerComputeRunner` 接口（`init`/`recommend`/`evaluate`）：`SyncPlannerComputeRunner`（测试，直接调 engine 函数）+ `WorkerPlannerComputeRunner`（生产，postMessage）。
- hook 注入 runner：单测用 Sync（不真起 worker），覆盖 loading 翻转 / requestId 丢弃 / debounce。
- client 单测 mock `Worker`，验证协议、缓存命中、requestId 丢弃。
- 现有 src + data 测试全绿（算法零改动，结果不变）。

### 边界

- worker 启动 + 首次 collections 传输一次性开销（~50-100ms structuredClone），相比 1-8s 计算可忽略。
- GitHub Pages 静态站原生支持 module worker（`new Worker(new URL('./plannerCompute.worker.ts', import.meta.url), { type: 'module' })`，`import.meta.env.BASE_URL` 兼容）。
- 内存：主线程 + worker 各持一份 collections（~17.5M×2），静态站可接受。

## UI 和测试

Planner 页面是工作台，不是 landing page。

- profile 状态：无快照、快照年龄、warnings、手动刷新入口、删除入口。
- scenario 区：variant 搜索、formation layout、限制摘要。
- candidate 区：owned-only、all-hypothetical。
- baseline 区：金币预算、最后专精状态、below-baseline warning。
- result 区：Top 3-5，显示游戏记数法目标值（`objectiveValue`）、slot assignments、核心解释和 unsupported warnings。
- save 区：把有效结果保存到现有 formation preset。

测试覆盖：

- 数字：`1.50e92`、`4.08e167`、`1e1000`、加法阈值、排序稳定性。
- 模拟器：最后专精、金币预算、effect parser、unsupported warning。
- Planner：候选池、合法性、稳态评分、beam search。
- UI：profile 状态、场景选择、结果卡、保存 preset。

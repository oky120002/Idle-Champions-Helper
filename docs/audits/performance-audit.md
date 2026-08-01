# 性能与资源剖面审计（轮 8）

度量基准日：2026-08-01（分支 `opencode/dev1`，commit `2e98e72b`）。
透镜：**真实交互响应**——对照 CLAUDE.md「零预算静态站」判是否影响真实交互，非纸面理论复杂度。每条结论均有实测证据（计时 / 调用计数 / bundle 体积 / gzip 传输），禁止纯推测。测量工具：`npm run simulate:benchmark`（既有）+ 临时 probe（计数器仪表化，测完即移除）+ `vite build` + `gzip -c`。

## 1. 实测数据总表

| 维度 | 实测值 | 判定 |
|---|---|---|
| entry JS（gzip） | index 7.3 + vendor-react-dom 57.2 + app-i18n 3.4 + shared-champion-core 1.7 ≈ **~72kB** | 健康 |
| planner 路由增量（gzip，lazy） | PlannerPage 8.3 + usePlannerCompute 31.4 + shared-page-ui 8.4 + shared-filters 7.9 + worker ≈ **~76kB** | 健康 |
| CSS（gzip） | 31.1kB | 健康 |
| hero-abilities.json 是否进 bundle | **否**（public/ 运行时 fetch） | 健康 |
| 路由懒加载 | 13 页全 `React.lazy`（`App.tsx:23-35`） | 健康 |
| planner 首屏 fetch（9 源） | 17.8MB raw / **1.0MB gzip 传输** | 健康（一次性） |
| 推荐 p50（默认）wall-clock | median **1.87s** worst-case；10 槽 2.28s；realistic 40-60 持有 **0.2-0.43s** | 见 §2 |
| 推荐 full wall-clock | median 3.57s；10 槽 3.8s | 见 §2 |
| `scoreFormation` 调用次数 | full 10 槽 **7135**；p50 **3630**（worst-case 164 英雄） | 见 §2 |
| 单次 `evaluateFormation` | **0.5ms**（30 次中位） | 健康 |
| Worker init 序列化 | payload 6.6MB；`structuredClone` **32ms 一次性** | 健康（见 §3） |
| `decimal.js` log10 生产调用 | **0**（仅测试用） | 健康（见 §2） |
| 重渲染 memo 边界 | runner/variant/options/profileSnapshot 全 `useMemo`，selector 全 `useCallback` | 健康（见 §5） |

测量脚本：既有 `scripts/simulator/benchmark.ts`（`npm run simulate:benchmark`）测 wall-clock；临时 probe（计数器注入 `scoreFormation` 首行 + `structuredClone` 计时，测完 revert + 删除，未入仓）。

## 2. 评分热路径

**实测方法**：临时在 `steadyStateScoring.ts` `scoreFormation` 首行注入 `globalThis.__scoreFormationCount` 计数器，跑真实数据（164 英雄 / 1413 场景，全英雄已拥有 worst-case）3 个代表性 variant，测完 `git checkout` revert。

| 计算模式 | variant(slots) | scoreFormation 调用 | wall-clock | 每次 |
|---|---|---|---|---|
| full | 4 (9槽) | 4350 | 1.20s | 0.28ms |
| full | 143 (10槽) | **7135** | **3.81s** | 0.53ms |
| full | 347 (10槽) | 7135 | 3.80s | 0.53ms |
| p90 | 143 (10槽) | 6614 | 3.99s | 0.60ms |
| p50（默认）| 143 (10槽) | **3630** | **2.28s** | 0.63ms |
| p50 | 4 (9槽) | 2230 | 0.69s | 0.31ms |

**持有量缩放**（full mode, variant=4, 9 槽）：

| owned | 调用 | wall-clock |
|---|---|---|
| 20 | 544 | 0.16s |
| 40 | 1076 | 0.32s |
| 60 | 1491 | 0.43s |
| 100 | 2230 | 0.62s |
| 164 | 4350 | 1.33s |

**结论**：
- 调用次数随 (候选英雄 × 槽 × beamWidth) 增长，持有量近似线性缩放——**真实玩家（40-60 英雄）亚秒级**，仅 worst-case 全英雄 + full 模式才到 3.8s。
- **默认 p50 模式**（`recommendationEngine.ts:40` `?? 'p50'`）已把 worst-case 砍半到 ~1.9s median；p50/p90 经 `applyComputationMode` 按席位收益裁剪候选，是有效的内置节流。
- 内层已优化：`steadyStateScoring.ts:251` 一次跑 damage/crit/vulnerability 三维度（注释自述 ~3× 加速）；`beamSearchRanking.ts:50-54` 收口复用最后一轮评分，不重复评分最终候选。
- **`decimal.js` log10 非瓶颈**：`log10GameNumber`（`gameNumber.ts:149`，`.log(10)` 慢 1000×）生产调用方 **0 个**（全仓非测试仅 `recommendationEngine.ts:30` 一处注释引用）；beamSearch 排序用的 `compareGameNumbers` 走 `.lt/.gt`（`gameNumber.ts:153-157`）。memory 说法核实属实。

**对照零预算**：推荐是 CPU-bound 同步搜索，已卸载 Worker（主线程不冻）+ 150ms debounce + requestId 丢弃旧回包（`usePlannerCompute.ts:11,52-56`）。worst-case 2-4s 等待是穷举式 beam search 的固有成本，非缺陷；realistic 持有量亚秒级。**可接受**。

## 3. Worker 序列化与卸载

**实测**：`structuredClone({plannerHeroes, plannerScenarios})`（worker init 等价载荷）JSON 序列化 **6.6MB**，clone 计时 median **32.3ms**（5 次，min 31.3 / max 40.9）。

- `plannerCompute.ts:12` 注释自述「~17.5M」指**内存对象图**（V8 对象/Decimal 开销），序列化后 6.6MB；`postMessage` 真实开销以 `structuredClone` 的 **32ms** 为准。
- init 一次性（collections 变才重发，`usePlannerCompute.ts:40-42`），之后 recommend/evaluate 只传小载荷（variant + profileSnapshot + options/placements），**复用率极高**。
- Worker 不可用环境（jsdom/SSR）降级 `SyncPlannerComputeRunner`（`plannerCompute.ts:186-191`）。

**结论**：序列化**非瓶颈**——32ms 一次性，远小于单次推荐计算的 1-4s。卸载收益（主线程不冻）远大于序列化成本。

## 4. 首屏加载链与 bundle

**加载链**（`usePlannerCollections.ts:67-78`）：`loadVersion()` → `Promise.all` 9 源（variants / plannerModel[hero-abilities+scenarios] / profile / champions / loot-catalog / patron-perks / effect-definitions / feat-catalog / specialization-catalog），all-or-nothing，无流式/分批。

| 源 | raw | gzip | 压缩比 |
|---|---|---|---|
| hero-abilities | 7.0MB | 235KB | 30× |
| variants | 4.6MB | 440KB | 11× |
| scenarios | 4.6MB | 250KB | 19× |
| 余 6 源合计 | 1.6MB | ~70KB | — |
| **合计** | **17.8MB** | **1.0MB** | — |

**结论**：
- **gzip 传输仅 1.0MB**（结构化重复数据压缩比极高）——网络成本对零预算站完全可接受，典型连接 <1s。
- 真实成本是 `JSON.parse(17.8MB)` + `resolveHeroAbilityProfiles` 主线程处理（一次性，~数百 ms 量级）。
- `memoryCache`（Map，`client.ts:4`）保证**会话内不重复加载**；刷新后由 IndexedDB 持久缓存命中（C2，`loadCollectionAtVersion` 按 `${version}:${name}` key 缓存 raw collection，省网络重下 + 17.8MB 重 parse；resolve 仍每次执行，见 §6#1）。
- `version.json` `cache:'no-store'`（`client.ts:42`）被 memoryCache 架空：会话内不重查版本（轮 7 已记 P2；实为合理设计——每次完整页面加载仍 honor no-store，会话内一致用旧版本+旧 collection）。
- bundle 健康：hero-abilities 不进任何 chunk；`vite.config.ts` `manualChunks` 分割 vendor/share；路由级 `React.lazy`。

## 5. 重渲染与 memo

`usePlannerPageModel.ts`：`runner`（:50）/ `selectedVariant`（:55）/ `options`（:66，显式注释「必须 memoize」）/ `effectiveProfileSnapshot`（:82）全 `useMemo`；全部 selector `useCallback`。`usePlannerCompute.ts:71-73` deps 含 options/placements，引用稳才不触发重算——调用方 memoize 已满足。**健康**。

## 6. P0 / P1 / P2 登记

### P0 — 无

无正确性 bug / 错误推荐 / 数据损坏 / 类型红 / 用户可见故障。性能 profile 健康：worst-case 推荐有 Worker 卸载 + debounce，realistic 持有量亚秒级，首屏 gzip 1.0MB。

### P1（登记，不当轮动手）

| # | 项 | 动作 / ROI / 影响面 / 决策点 |
|---|---|---|
| 1 | ✅ collection IndexedDB 持久缓存（C2，2026-08-01 收口） | **已落地**：`loadCollectionAtVersion`（`client.ts`）在 memoryCache 与 fetch 间插 IDB 层（新 `dataCollections` store，DB v5→v6），按 `${version}:${name}` key 缓存**raw** `DataCollection<T>`（fetchJson 后、resolve 前，plain JSON 可结构化克隆）。读出走 zod 校验（具名 champions/adventures/variants/patrons 深校验 + 其余信封校验，复用 D2 schema 与 C1 `parseStoredRecord` 哲学）；腐蚀当 miss 回退 fetch 并清坏键；IDB 不可用自动降级 fetch（零回归）。**失效**：version.current 变更 → key 变 → 天然失效（旧 key 惰性忽略）。**未做**：缓存 resolved（可另省 resolve ~数百 ms，但 hero-abilities resolve 产物含 Decimal 实例，结构化克隆丢原型方法，需另设计序列化，ROI 不抵复杂度，暂缓）。 |

### P2（当轮处置）

| # | 项 | 处置 |
|---|---|---|
| 1 | `plannerCompute.ts:12` 注释「~17.5M」混淆内存图 vs 序列化体积 | 当轮修正：区分内存对象图与 6.6MB 序列化载荷，避免高估 postMessage 成本 |
| 2 | `version.json` no-store 被 memoryCache 架空 | 轮 7 已记，本轮复确认仍存在；实为合理设计（见 §4），不重复登记 |

## 7. 对照零预算总判

| 透镜问题 | 实测回答 | 判定 |
|---|---|---|
| 评分热路径影响交互？ | worst-case 2-4s（全英雄+full），默认 p50 ~1.9s，realistic 亚秒；Worker 不冻 UI | 可接受 |
| Worker 序列化拖累？ | 32ms 一次性 init，复用率极高 | 非瓶颈 |
| 7.2MB 全量 fetch 必要？ | gzip 仅 1.0MB 传输；parse 17.8MB 一次性；memoryCache 会话内复用 | 可接受 |
| bundle/首屏过重？ | entry ~72kB + planner ~76kB gzip；路由全 lazy | 健康 |
| 重渲染失控？ | options/placements 全 memoize + debounce + requestId | 健康 |
| decimal.js 慢操作在热路径？ | log10 生产 0 调用 | 健康 |

**总判**：无 P0。P1 collection IndexedDB 持久缓存已收口（C2，§6#1）：raw 缓存省网络 + 17.8MB 重 parse，resolve 仍每次执行（resolved 缓存暂缓）。bundle / 路由分割 / memo / Worker 卸载 / debounce 均已就位，符合零预算静态站约束。

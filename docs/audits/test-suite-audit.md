# 测试套件深度审计与整改路线图

度量基准日：2026-07-31（分支 `opencode/dev2`，commit `6fd824db`）。本文件是整改决策与路线图的 canonical 来源；执行进度随各批次 commit 更新本文件「进度」列，不另起迁移跟踪。

## 1. 现状度量

| 维度 | 数值 |
|---|---|
| 用例总数 | **1194**（vitest 1164 = unit 906 + component 258；playwright e2e 30） |
| 测试文件 | 221（vitest 209 + e2e 12） |
| typecheck | ✅ 通过 |
| vitest 基线 | ✅ **1164/1164 全绿**（批 0 已修，见 §2） |

夹具：11 个 co-located 单元。引用密度：`user-profile/fixtures.ts` 20 处、`resolverTestFixtures` 8 处、`mechanic/scoringTestFixtures` 各 2 处。`scripts/fixtures/` 目录存在但 sync 系列测试未充分复用（见 §3-B）。

巨型文件（行/用例）：`placementFit.test.ts` 1531/40、`build-models.test.ts` 1200/19、`sync-illustrations.test.ts` 1064/6、`normalize.test.ts` 789/4、`sync-pets.test.ts` 777/4、`skelanim.test.ts` 720/8。

## 2. P0 — planner route 11 红回归（单根因）

**现象**：`plannerEvaluate.route.test.tsx`（7 失败）+ `plannerPage.route.test.tsx`（4 失败），全为 `Unable to find role="searchbox" name "搜索场景"`。

**Triage 结论**：
- 组件 a11y 实现正确（`PlannerScenarioSelection.tsx:149-157`：`<label htmlFor="planner-scenario-search">` + `<input type="search" role="searchbox">`）；组件级测试 `PlannerScenarioSelection.test.tsx` 通过 → **非 a11y 退化、非产品回归**。
- 根因在 route 集成层：`PlannerEvaluatePage.tsx:249` 有 `loadState === 'loading'` 门控，数据未就绪时不渲染 `<PlannerScenarioSelection>`；数据契约依赖 `usePlannerCollections` 返回的 `profileSnapshot && lootCatalog.length > 0`（`:56-65/:91`）。
- route 测试 mock 了 `loadCollection`（`vi.mock('../../data/client')`）+ `mockPlannerCollections()`（test:164）+ `fake-indexeddb/auto` + `resetDatabase`，但 mock 喂的数据未覆盖页面当前全部依赖 → `loadState` 停 loading → ScenarioSelection 不渲染。

**修复路径**：读 `src/pages/planner/usePlannerCollections.ts` 当前数据源（哪些经 `loadCollection`、哪些经 IndexedDB），对齐 route 测试 mock——补齐 `profileSnapshot`/`lootCatalog`/相关 catalog 的 mock 返回或 IndexedDB 种子，使 `loadState` 翻过 loading。只跑 2 个失败文件验证：`npx vitest run src/pages/planner/plannerEvaluate.route.test.tsx src/pages/planner/plannerPage.route.test.tsx`。

**为何优先**：11 红挡在所有整改前面——红色基线上无法区分新失败是新引入还是旧债。必须先回绿。

**✅ 已修复（批 0）**：确认根因 = route 测试 mock 过期。`usePlannerCollections` 的 `Promise.all` 已增长到 10 个数据源，而 `vi.mock('../../data/client')` 只 override 了 `loadCollection` 且 `mockPlannerCollections` 只喂 5 个 collection 名。缺口：
- `loadCollection('loot-catalog')` / `loadCollection('effect-definitions')` 命中 mock 的 `throw new Error('unexpected collection')`；
- `loadVersion()` + 3 个 `fetchJson`（`patron-perks.json`/`feat-catalog.json`/`specialization-catalog.json`）走 `...actual` 真实实现，jsdom 无 fetch 兜底直接抛。

任一拒绝 → `Promise.all` reject → `loadState='error'` → ScenarioSelection 不渲染。修复：route 测试 mock 追加 `loadVersion`/`fetchJson` 两个 override + `mockPlannerCollections` 补 loot-catalog/effect-definitions 空夹具与 3 个 fetchJson 路径返回。`loadResolvedPlannerModel`（全走 mocked loadCollection）与 `resolveUserProfileSnapshot`（真实 IndexedDB，空快照即可）无需改。两个 route 测试同构修补，未抽公共夹具（批 2 统一处理）。

## 3. 整改分类清单（P1+，按 ROI 排序）

### A. 拆分（巨型文件）
| 文件 | 行/用例 | 动作 |
|---|---|---|
| `placementFit.test.ts` | 1531/40 | 单 describe + 40 it，按信号家族拆主题文件（`.relations` / `.stacking` / `.counting` / `.upgrade`），被测单一无需改 |
| `build-models.test.ts` | 1200/19 | ✅ 首用例已拆三（abilities / scenarios / semantic overrides）+ 共享 `setupBuildModelsOutputs` helper（写全 fixture + 跑 buildModels 返回四输出）；`normalizeEffectSignal` 系列经评估**不**转 `it.each`（见 D） |

### B. 抽夹具（重复构造）
sync 系列「读取产物 + `JSON.parse`」重复内联，平均 130–180 行/用例：`sync-illustrations`（1064/6）、`sync-pets`（777/4）、`sync-animations`（533/3）、`normalize`（789/4）。动作：抽公共读取/构造到 `scripts/fixtures/`（已存在目录），各 sync 测试引用。

### C. 合并（过碎文件，谨慎）
最小文件多为合理的 prod-only 守护或单职责（`plannerProfileSourceLabelProd.test.ts` 9 行、`scoringSupportSync.test.ts` 14 行守护）。**默认不合并**——co-located 规范鼓励「被测-测试 1:1」，合并破坏导航。仅当多微文件覆盖同一被测且无独立语义时才合并。

### D. 抽象（同构用例 → it.each / helper）
- ~~`build-models.test.ts`：`normalizeEffectSignal` 五用例 → `it.each`~~ **评估后否决（批 1）**：五用例各测一个信号家族（gold/crit/health/vulnerability/speed），族内断言维度各异（`bucket` / `amountFunc` / `stackFunc` / `formationCountQualifier` / `monsterTags` / 非法值守卫），部分还需 `parseEffectPayload` 构造 effect——非"高度同构"。强制 `it.each` 统一表会丢族特定断言（无法表达"此族查 monsterTags、彼族查 formationCountQualifier"），多可选列表反而比显式更难读。保留 5 个家族用例原样：co-located 鼓励被测-测试 1:1，"不得损伤校验能力"优先于行数精简。
- `collectEffectEntries ...` 系列同质化 → 评估提取断言 helper。

### E. 模块化（夹具组织）
- `src/domain/user-profile/fixtures.ts` 命名过泛（规范 §5 要求 `*TestData`/`*Fixture` 等后缀）→ 重命名 `userProfileTestData.ts`（20 处引用同步）。
- `scripts/fixtures/` 作为 sync 系列共享源（见 B）。

## 4. 覆盖缺口

粗筛 **155 个**纯 `.ts` 逻辑模块无 co-located 测试，但**严重虚高**：多数 `useXxxPageModel`/`xxx-model.ts` 被对应 page route 测试间接覆盖。判定规则：

1. 纯计算函数（无 React、无 IO）且无 route 测试触及 → **真缺口**，优先补。
2. hook/model 被 route 测试覆盖 → 标「间接覆盖」，仅当逻辑复杂到 route 测难覆盖边界时补单测。
3. 纯数据（referenceData/types/index）→ 不补。

优先补测候选（执行时语义确认无 route 覆盖）：
- `src/domain/planner/placementSlotRelation.ts`（5.5KB，列关系计算）
- `src/domain/abilities/heroTargetingRelation.ts`（5.4KB，目标关系计算）
- `src/pages/pets/formatting.ts`（5.3KB，纯格式化）
- `src/features/skelanim-player/{walk-selection,browser-codec}.ts`（9.0/5.2KB）

## 5. 守护测试（规范 §6）对照

已配守护：`references/{damageReferenceVerification,championReferenceVerification}.test.ts` 覆盖聚合层与 buff_upgrade 双重计数（历史教训已闭环）。

执行阶段需逐项核对 §6 三类：
1. 跨边界 keys 同步（src 侧 scorer 与 scripts 侧脚本平行白名单）——`scoringSupportSync.test.ts` 已守一处，查其余。
2. 数据管线真实产物端到端守护（聚合层 pool/total/carryDps，非只中间信号）。
3. 因子之积 = 目标值的组合测试（多来源加法同 pool 场景）——`heroDpsPool` 已修，查同类未覆盖。

## 6. 整改路线图

每批一个 commit；每批收口：`npm run typecheck && npx vitest run` 全绿（重构类）或新测试接入运行器 glob（补测类）。

| 批次 | 目标 | 风险 | 进度 |
|---|---|---|---|
| 0（P0） | 修 planner route 11 红回绿 | 低（改测试 mock，不动产品） | ✅ 完成 |
| 1 | `build-models.test.ts` 重构（拆首用例；`it.each` 经评估否决） | 低（纯重构，行为不变） | ✅ 完成 |
| 2 | sync 系列抽公共夹具到 `scripts/fixtures/` | 中（重构 + 重跑） | ⏳ |
| 3 | `placementFit.test.ts` 按信号家族拆主题 | 中（40 用例分组迁移） | ⏳ |
| 4 | 补纯逻辑模块单测（§4 候选，语义确认后） | 低（纯新增） | ⏳ |
| 5 | §5 守护测试三类逐项核对补强 | 中（涉及真实产物） | ⏳ |

## 7. 风险与约束

- **批次 0 必须先行**：红色基线上做组织整改会混淆新旧失败。
- 重构类批次（1/2/3）遵守 `docs/specs/guidelines/testing.md`：co-located、命名、夹具纪律；迁移零残留（删旧测试连同夹具）。
- 补测类批次（4/5）TDD：先写覆盖目标行为的测试，跑红，再视情况补被测（多数被测已存在，只需补测）。
- 不为本审计新增测试目录；不扩大运行器 glob 除非新增目录。

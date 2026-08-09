# 测试套件深度审计与整改路线图

度量基准日：2026-07-31（分支 `opencode/dev2`，commit `6fd824db`）。本文件是整改决策与路线图的 canonical 来源；执行进度随各批次 commit 更新本文件「进度」列，不另起迁移跟踪。

## 1. 现状度量

| 维度 | 数值 |
|---|---|
| 用例总数 | **1228**（vitest 1198；playwright e2e 30；批 0-5 后） |
| 测试文件 | 221（vitest 209 + e2e 12） |
| typecheck | ✅ 通过 |
| vitest 基线 | ✅ **1198/1198 全绿**（批 0 修红 + 批 1 拆首测 +2 + 批 4 formatting +31 + 批 5 因子之积组合守护 +1） |

夹具：11 个 co-located 单元。引用密度：`user-profile/fixtures.ts` 20 处、`resolverTestFixtures` 8 处、`mechanic/scoringTestFixtures` 各 2 处。`scripts/fixtures/` 目录存在但 sync 系列测试未充分复用（见 §3-B）。

巨型文件（行/用例）：`build-models.test.ts` 1200/19（批 1 已拆首测）、`sync-illustrations.test.ts` 1064/6、`normalize.test.ts` 789/4、`sync-pets.test.ts` 777/4、`skelanim.test.ts` 720/8。`placementFit.test.ts` 1531/40 已按批 3 拆 6 主题。

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
| `placementFit.test.ts` | 1531/40 | ✅ 已拆 6 主题（`relations` 10 / `counting` 9 / `gating` 8 / `pools` 5 / `stacking` 4 / `upgrade` 4 用例）+ 共享 `placementFitTestFixtures.ts`（`createHero` + 3 scenario 模板）。原拟 4 信号家族，实证 13 用例属框架级（pool 聚合 5 / 门控过滤 8）不归任何家族 → 扩到 6 主题 |
| `build-models.test.ts` | 1200/19 | ✅ 首用例已拆三（abilities / scenarios / semantic overrides）+ 共享 `setupBuildModelsOutputs` helper（写全 fixture + 跑 buildModels 返回四输出）；`normalizeEffectSignal` 系列经评估**不**转 `it.each`（见 D） |

### B. 抽夹具（重复构造）
sync 系列「读取产物 + `JSON.parse`」重复内联，平均 130–180 行/用例：`sync-illustrations`（1064/6）、`sync-pets`（777/4）、`sync-animations`（533/3）、`normalize`（789/4）。原动作：抽公共读取/构造到 `scripts/fixtures/`。

**⚠️ 执行时复核（批 2 recon）——原框定需修正**：这些测试重复的是**读产物样板**（`readJson(path.join(outputDir, 'X.json')) as T`），非共享**输入数据**。`scripts/fixtures/` 现存的是共享输入 mock（`mock-definitions{,-zh}.json`，纯数据），把读 helper 放这里会混淆数据与代码。实测各文件：
- `sync-pets`：3 处重复读 `{ pets.json as PetsCollection, pet-animations.json as PetAnimationsCollection }` 同类型对 → 真 repeating，可抽 `readPetsOutput(outputDir)` helper。
- `normalize`：11 处读**不同**产物（champions/adventures/patrons/game-rules/effect-reference/patron-perks/trials/variants/enums/champion-details/version）+ 各自内联类型 → 非数据重复；至多抽 `readOutputJson<T>(dir, name)` 减 `path.join` 样板，边际收益。
- `sync-illustrations`（3 命中）/ `sync-animations`（1 命中）：重复度低，逐文件评估，可能不值得改。

重定 scope：批 2 = 抽**读 helper**（非 fixture 数据）到合适位置（就近或 `scripts/data/` 下 test-util），pets 优先；normalize/illustrations 仅边际收益时跳过。**勿强行套用"抽到 scripts/fixtures/"**——co-located 规范鼓励被测-测试 1:1，读样板轻度重复不构成拆分理由（见 CLAUDE.md AI-first 根目标 3 指标）。

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
- ✅ `src/pages/pets/formatting.ts`（144 行，纯格式化）— 批 4 已补 `formatting.test.ts`（31 用例覆盖 5 导出函数全分支）。确凿真缺口：调用方仅 `PetResultCard.tsx`（组件本身无测试），5 个纯函数分支密集（`buildAcquisitionLabel` 8+ 分支 × 双语）
- `src/domain/planner/placementSlotRelation.ts`（194 行，列关系计算）— **间接覆盖非缺口**：被 `placementFit.ts` + `mechanics/stackCountResolver.ts` 调用，`placementFit.relations.test.ts` 已覆盖关系逻辑
- `src/domain/abilities/heroTargetingRelation.ts`（155 行，目标关系计算）— 间接覆盖（`signalSemantics.ts` 调用 → buildModels 测试），边界复杂度待评估
- `src/features/skelanim-player/{walk-selection,browser-codec}.ts`（295/174 行）— 间接覆盖（`skelanim-canvas-model`/`asset-loader` 调用），边界待评估

## 5. 守护测试（规范 §6）对照

已配守护：`references/{damageReferenceVerification,championReferenceVerification}.test.ts` 覆盖聚合层与 buff_upgrade 双重计数（历史教训已闭环）。

**✅ 批 5 逐项核对结论**：
1. **跨边界 keys 同步**——全仓只 `SCORING_SUPPORTED_STACK_FUNCS`（scripts/signal-coverage.ts）一处平行白名单，`scoringSupportSync.test.ts` 已守 keys 集合；`signal-coverage.test.ts` 另守 `classifyScoringSupport` 行为对称（含 `stacksMultiply` 短路、`amountFunc` 判定，含 per_mithral_hall_stacks 回归用例）。keys + 行为两层均已闭环，无遗漏。
2. **真实产物端到端聚合**——`championReferenceVerification` 加载 built `hero-abilities.json` → `evaluatePlacementFit` 断言 pool 聚合 multFactor（善良榜样 16384 × 出言不逊 576）；`damageReferenceVerification` → `scoreFormation` 断言聚合层（objectiveValue / carryHeroId / 交叉位置 buff）。聚合层（非只中间信号值）已覆盖。
3. **因子之积 = 目标值**——补 `steadyStateScoring.test.ts`「全因子同时非默认」组合守护：damage/crit/vuln/globalBuff/heroDpsPool 五因子同时 ≠1，断言 `baseDps × Π factors = objectiveValue`（对照全精度 Decimal 非 2 位尾数显示串）。变异验证：去掉任一因子（如 heroDpsPool）测试即红。原 `:495` heroDpsPool 单因子测试与 `:445` damagePool 单因子测试因其余因子=1 而无法发现「因子漏乘/漏外露」非对称回归——heroDpsPool 曾是此形 bug（equipment/external 分列独立 × 因子，实际加法合并），组合守护补上此缺口。其余因子（damagePool/crit/vuln/globalBuff）均单来源聚合，无「多来源加法同池」同类风险。

## 6. 整改路线图

每批一个 commit；每批收口：`npm run typecheck && npx vitest run` 全绿（重构类）或新测试接入运行器 glob（补测类）。

| 批次 | 目标 | 风险 | 进度 |
|---|---|---|---|
| 0（P0） | 修 planner route 11 红回绿 | 低（改测试 mock，不动产品） | ✅ 完成 |
| 1 | `build-models.test.ts` 重构（拆首用例；`it.each` 经评估否决） | 低（纯重构，行为不变） | ✅ 完成 |
| 2 | sync 系列抽读 helper（recon 已修正 scope：非 fixture 数据，见 §B） | 低–中（pets 真重复；其余边际） | ⏳ recon 完成，待执行 |
| 3 | `placementFit.test.ts` 按信号家族拆主题（4→6：框架级用例单列 pools/gating） | 中（40 用例分组迁移） | ✅ 完成 |
| 4 | 补纯逻辑模块单测（§4 候选，语义确认后） | 低（纯新增） | ✅ 完成：formatting ✅（31）；批 6 深度复审收口 heroTargetingRelation（已覆盖）/skelanim（低 ROI 跳过）/placementSlotRelation（间接覆盖），见 §8 |
| 5 | §5 守护测试三类逐项核对补强 | 中（涉及真实产物） | ✅ 完成（三类均已闭环；唯一新补：因子之积全因子组合守护，见 §5.3） |
| 6 | §4 覆盖缺口函数级穷尽复审（155→真缺口仅 animation-audit + skelanim browser-codec/walk-selection） | 低（纯新增测试） | ✅ 完成（feedback +34、useAnimationAuditPageModel +15、browser-codec +4、walk-selection +9；详见 §8） |

## 7. 风险与约束

- **批次 0 必须先行**：红色基线上做组织整改会混淆新旧失败。
- 重构类批次（1/2/3）遵守 `docs/specs/guidelines/testing.md`：co-located、命名、夹具纪律；迁移零残留（删旧测试连同夹具）。
- 补测类批次（4/5）TDD：先写覆盖目标行为的测试，跑红，再视情况补被测（多数被测已存在，只需补测）。
- 不为本审计新增测试目录；不扩大运行器 glob 除非新增目录。

## 8. 批 6 — §4 覆盖缺口函数级穷尽复审（2026-08-01，分支 `opencode/dev1`）

§4「155 个纯 `.ts` 模块无 co-located 测试」的逐模块收口。方法论：208 个纯 `.ts` 模块（排除 .tsx/test/types/data/index）→ 154 无 co-located 测试 → 按「是否有任意测试文件 import」粗筛得 106 候选 → 逐模块读源码 + 查消费方测试，按 §4 三规则（纯计算无 route 触及=真缺口 / hook-model 被组件或 route 测试传递覆盖=间接 / 纯数据=不补）分类。

**结论：§4「严重虚高」判断成立，真缺口仅 animation-audit 一个页面（零测试），其余全覆盖或 trivial。**

### 8.1 已覆盖（批 4「待评估」项 + 粗筛误判收口）

| 模块 | 覆盖方式 |
|---|---|
| `abilities/heroTargetingRelation.ts`（159 行） | ✅ 直接测：`signalSemantics.test.ts:249-288` 有 `describe('normalizeExplicitTargeting')` ~30 case（22 项字符串映射 / distance 组合 / 5 类对象类型 / unsupported / heroes 白名单）。函数在消费方测试中被直接 import，模块级 import grep 漏判 |
| `planner/placementReasonCode.ts`（83 行） | ✅ 间接：`placementFit.{relations,gating,pools,counting}.test.ts` 断言 `reasonCode` 共 38 处，覆盖 30+ relation→reasonCode 映射 |
| `planner/placementSlotRelation.ts`（194 行） | ✅ 间接：`placementFit.relations.test.ts`（位置关系家族）+ `stackCountResolver` 测试 |
| `champion-detail/*`（11 个 helper：detail-json/effect-descriptor/effect-targets/specialization-column-model/upgrade-presentation-model/detail-derived-sections/navigation 等） | ✅ 传递：`championDetailPage.{content,interactions,navigation}.test.tsx` 渲染整页断言分区内容（专精/能力/装备/传奇/天赋/皮肤/故事 tab + 派生文本），任一 helper 断裂则断言红 |
| `champion-filters/*`（7 模块） | ✅ 跨目录 co-located：`champions/filterActionBuilder.test.ts` 测 filter-action-builder；`filterQueryState.test.ts` 测 query-state（传递覆盖 query.ts）；options/headerMetrics 由 `championsPage.filterState/filterInteractions.test.tsx` 组件测试传递覆盖 |
| `domain/formationLayout.ts` | ✅ 传递：`formationPage.layoutFilters.test.tsx` 等 |
| `rules/illustrationFilter.ts`（85 行 10 维过滤） | ✅ 传递：illustrations 页组件测试 |
| `planner/evaluatePlacementsStore.ts` | ✅ 传递：`plannerEvaluate.route.test.tsx` |

**教训**：模块级「是否有测试 import」严重高估缺口——纯函数常在消费方测试中被直接 import 测试（如 heroTargetingRelation 在 signalSemantics.test.ts）。覆盖判定必须降到**函数级** + 查消费方测试目录。

### 8.2 不补（trivial / 纯数据 / 纯类型 / hook-model 传递覆盖）

- `goldObjective.ts`（3 行纯函数，finite/>0 守卫）、`variantConstraints.ts`（纯 interface 无逻辑）。
- `mechanicHints.ts` / `animationAuditFilterLabels.ts`：exhaustive switch 标签映射，TypeScript 穷尽性保证无漏 case，无逻辑分支。
- 各 `useXxx.ts` hook / `*PageModel.ts` / `*Model.ts`：React 状态编排，被组件或 route 测试传递覆盖。
- `champion-tags/tag-labels/*`（7 文件）、`planner/references/*ReferenceData.ts`：纯数据/参照数据。

### 8.3 真缺口 ✅ 已补（animation-audit 页此前零测试）

| 新增测试 | 用例 | 覆盖 |
|---|---|---|
| `animation-audit/feedback.test.ts` | 34 | 8 导出全分支：`ANIMATION_AUDIT_FEEDBACK_TAGS` 契约 / `createEmpty` / `normalizeAnimationAuditFeedbackDraft`（空→null / note trim / tag 去重排序）/ `isMeaningfulAnimationAuditFeedback`（类型守卫）/ `toggleAnimationAuditFeedbackTag`（追加/移除/保 verdict-note）/ `buildAnimationAuditFeedbackPayload`（verdict→sequenceIndex 4 分支 + alternate 无候选回退 + 过滤空反馈 + 元信息快照）/ `readStoredAnimationAuditFeedback`（window 守卫 + malformed JSON/非对象/条目类型守卫/tag coerce/note 强制 / 空 draft 丢弃）/ `writeStoredAnimationAuditFeedback`（window 守卫 + JSON 落盘）。localStorage 防御解析用 `vi.stubGlobal('window')` 在 node 环境注入 |
| `animation-audit/useAnimationAuditPageModel.test.tsx` | 15 | 页面首个测试，`renderHook` 覆盖：3 个私有过滤谓词（matchesLevel flagged=非none/精确等级、matchesKind、matchesSearch 中英文/ID 大小写不敏感/空白透传）/ summary 按 level+kind 聚合 / 反馈状态（verdict/tag/note 写入、空 draft 删除不留壳、clear 单条/全清）/ feedbackSummary 计数 / visibleEntries 24 截断 + showAll + canShowMore / 加载成功与失败两态 |
| `features/skelanim-player/browser-codec.test.ts` | 4 | src 侧 `decodeSkelAnimBuffer` 端到端：自建 deflate 二进制夹具（轻量 raw bytes 纹理，无需 PNG）→ 解析全字段（sheet/texture/character/piece/frame 序号标注 + 多 sequence 顺序 + 缺失帧 null + 空字符串角色名）。覆盖 src 特有 `inflateContainer`（DecompressionStream→fflate 回退）+ parseInflatedBuffer 接线；与 scripts 侧 `skelanim-codec`（已测）同格式平行移植，本测补 src 运行时侧 |
| `features/skelanim-player/walk-selection.test.ts` | 9 | `resolveWalkSequenceSelection` 黑盒覆盖全分支：早返回 null（无 character / 全 null 帧）/ fallback（单序列=default、defaultFrameIndex 偏好帧、default 缺失回退 renderableMetrics[0]、viewport bounds pad+clamp 行为断言）/ 候选选择（高 motion 候选入选、motion 不高于 current 不入选、frameCount<=1 不入选）。bounds 断言锁 pad+clamp 行为而非具体调参常量，避免视觉调参误触测试 |

### 8.4 有意识跳过（ROI 不足）

- `animationAuditFilterLabels.ts`：见 §8.2（exhaustive switch 标签映射，无逻辑分支）。

### 8.5 度量

vitest **1297**（批 5 后 1235 + feedback 34 + hook 15 + browser-codec 4 + walk-selection 9）/ **221** 文件，全绿；typecheck ✅。e2e 30 不变。

## 9. 测试深度审计（轮 5）

行为覆盖与断言强度透镜（非组织整改），见独立文件 `test-depth-audit.md`（结论：深度健康，P0/P1 新增 0；澄清 `steadyStateScoring.test.ts:495` 非乘法模型编码；§2 回归用例跟随修复；交叉引用 signal-coverage 假门）。

## 10. 增量补强（2026-08-10，分支 `opencode/dev3`）

承接轮 5-8 审计基线，针对函数级复审后仍存的真缺口与断言偏弱项补测。

| 区域 | 缺口类型 | 补测 | commit |
|------|----------|------|--------|
| `lockedPlacements`（beam search 用户锁槽） | 真缺口（零覆盖，活跃生产功能） | 3 用例：锁定槽位恒在结果、seat 预留防同 seat 入阵、锁定英雄不重复放置 | `619adf5` |
| `lockedCarryHeroId`（scoring 用户锁 C 位） | 真缺口（零覆盖，活跃生产功能） | 3 用例：锁定弱 carry < 自由选择、锁定不在阵型→0、undefined/空向后兼容 | `619adf5` |
| `damageSourcePattern` 4/5 模式 | 真缺口（仅 same-column 有测，adjacent/not-adjacent/front-columns/behind-columns 零覆盖） | 4 用例 × valid/invalid 钉值（3 列拓扑夹具） | `9cad422` |
| `attributeRequirements` 候选过滤 | 真缺口（所有场景 `[]`，过滤路径从未被测） | 1 用例：STR 13+ 门槛排除不合格英雄 | `9cad422` |
| 复合属性门槛解析 | 已知缺陷修复（atd_5010068521） | 4 钉值测试 + 7 变体数据修正（`96a89ac`） | `96a89ac` |
| `applyHealthDrain drainRate≥1` | 过时 TODO（已修复+测试 areaEstimation.test.ts:185） | TODO 清理（`atd_d2d4ed72dc` 删除） | `96a89ac` |

度量：vitest 1581→**1596**（+15）；typecheck ✅；全绿。


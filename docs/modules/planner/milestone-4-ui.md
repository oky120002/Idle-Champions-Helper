# 里程碑 4·UI

- 作用：M4 执行步骤清单；产出用户可见可用。架构决策、16 阶段进度勾选、文档同步硬约束见 `evolution-plan.md` 总纲。
- 状态：阶段 15-16 已完成 [x]。

---

# 阶段 15：UI 接通（最后）

**目标**：objective 引擎 + 所有数据补全完成后，UI 接通让能力可见。
**风险**：复用 FormationBoardGrid 不能破坏 formation 编辑器（15.1 最复杂）。

### 15.1 抽 FormationBoardCanvas + 棋盘渲染 [x]
- **改动**：抽 `src/pages/formation/FormationBoardCanvas.tsx`（纯渲染：slots + placements + championById + carrySlotId）；`FormationBoardGrid.tsx` 改组装 Canvas + formation 专属控件；`PlannerResultCard.tsx` 用 Canvas 渲染 top1 + carryDps + carry 标记。
- **测试（先写）**：Canvas 组件测试；PlannerResultCard 渲染棋盘；formation 全量回归。
- **验证**：`npm run test:run` + `test:e2e`（formation 不破）+ 浏览器。
- **commit**：`feat(planner): 15.1 棋盘 Canvas 抽取与结果卡片复用`。

### 15.2 Top K + carryRanking + 推图预估展示 [x]
- **改动**：新建 `PlannerTopLineups.tsx`；消费 PlannerRecommendation；展示推图层数预估（10）+ survival 约束（5）。
- **测试**：组件测试覆盖 Top K 切换/carry 列表/预估展示。
- **验证**：`npm run test:run` + 浏览器。
- **commit**：`feat(planner): 15.2 Top K + carryRanking + 推图预估展示`。

### 15.3 候选模式控件 [x]
- **改动**：`usePlannerPageModel` 加 candidateMode；`buildPlannerRecommendation` 加 options；接通 hypotheticalBaseline；新建 `PlannerCandidateMode.tsx`。
- **测试**：两档切换改变 candidatePool；all-hypothetical 走 hypotheticalBaseline。
- **验证**：`npm run test:run` + 浏览器。
- **commit**：`feat(planner): 15.3 候选模式控件`。

### 15.4 C 位指定 + 锁槽控件 [x]
- **改动**：`usePlannerPageModel` 加 lockedCarryHeroId/lockedSlots；`buildPlannerRecommendation` 加 options；新建 `PlannerCarryLock.tsx`/`PlannerSlotLock.tsx`；所有英雄候选（不限 dps）。
- **测试**：指定 carry 时结果 carryHeroId 一致；锁槽不被替换。
- **验证**：`npm run test:run` + 浏览器。
- **commit**：`feat(planner): 15.4 C 位指定与锁槽控件`。

### 15.5 推荐结果导入阵型编辑器 [x]
- **改动**：`PlannerSavePreset.tsx` 旁加导入动作；写 formationDraft（复用 formationDraftStore）；跳转 /formation。
- **测试**：E2E planner → formation 导入。
- **验证**：`npm run test:e2e`。
- **commit**：`feat(planner): 15.5 推荐结果导入编辑器`。

### 15.6 浏览器手验闭环 [x]
- **验证**：`npm run dev`，/planner 跑通全链路；`npm run test:regression`。
- **commit**：无。

---

# 阶段 16：拖拽（最后）

**目标**：阵型编辑器桌面 HTML5 拖拽 + 移动端 HeroPicker 选择。
**边界**：移动端无原生触摸 DnD，沿用 tap-target + MobileEditor 内 HeroPicker 点击选择。

### 16.1 HeroPicker 选择器 [x]
- **改动**：新建 `src/pages/formation/HeroPicker.tsx`（搜索 + 按 seat 分组 + 头像），双模式：picker（传 `onChange`，点击选择 + 未放置 + 选中态，供 MobileEditor）与拖拽源（省略 `onChange`，英雄卡 `draggable` 写 dataTransfer，供桌面槽位 drop）。FormationBoardEditor 用拖拽源模式；Grid 保留原生 `<select>`（桌面直达 click）。seat 标签复用 `formatSeatLabel`，与其他消费方一致。
- **测试**：搜索过滤 / 按 seat 分组 / picker 模式选中 onChange / 拖拽源模式（不渲染未放置、英雄卡 draggable）/ trigger aria-expanded / Esc 关闭 / 外击关闭。
- **验证**：`npm run test:run`。
- **commit**：`feat(formation): 16.1 HeroPicker 选择器 + 16.2 拖拽 API`（双模式分离于 M4 第1轮审计）。

### 16.2 拖拽 API（HTML5 DnD） [x]
- **改动**：HeroPicker 英雄卡 `draggable=true` + `onDragStart` 写 `dataTransfer`；FormationBoardCanvas slot 加 `onDragOver`(preventDefault) + `onDrop`，新增 `onSlotDrop` prop（未传时不挂 handler，避免 planner 只读棋盘误接 preventDefault）；Grid 传 `onSlotDrop` → `handleAssignChampion`。
- **测试**：draggable 属性落到 DOM（jsdom 不实现 DataTransfer，写入由浏览器保证）；onSlotDrop 传/不传的 drop 契约。
- **验证**：`npm run test:run`。
- **commit**：同 16.1（合并提交）。

### 16.3 拖拽放入/替换/槽位间/拖出移除 [x]
- **改动**：`handleAssignChampion` 增「槽位间拖动原子清原 slot」——hero 已在别处则清原位，避免同英雄重复占 seat；空 championId 清槽；覆盖即替换。Canvas 已放置英雄 `summary-badge` 在可编辑模式（传 onSlotDrop）下 `draggable` 写 heroId，启用 slot→slot 与拖出移除。FormationBoardEditor 加移除 drop zone（反查 `selectedChampions` 复用 `handleAssignChampion` 清槽）。seat 冲突由既有 `conflictingSeats` 派生在棋盘渲染时实时提示（红色槽 + error 状态条）。
- **测试**：`formation-board-actions` 单测覆盖放入/清空/槽位间原子清原/替换；Canvas badge draggable 契约；E2E `formation-drag.spec.ts` 覆盖 HeroPicker→空槽 / slot→slot 原子清原 / slot→移除区（Playwright 用 DataTransfer 合成事件测接线）。
- **commit**：`feat(formation): 16.3 拖拽交互`（slot→slot + 拖出移除 + E2E 收口于 M4 第1轮审计）。

### 16.4 移动端 tap-target + 响应式收口 [x]
- **改动**：`responsive.css` ≤720px：`.hero-picker--source` 与移除区桌面专用（移动端 `display:none`）；MobileEditor 原生 `<select>` 换 HeroPicker picker 模式（搜索 + 分组 + 头像 + 点击选择，沿 tap-target 选槽流程）；slot/棋盘尺寸沿用 15 阶段。
- **测试**：HeroPicker 双模式单测；E2E `formation-mobile-layout.spec.ts`（MobileEditor 内 HeroPicker 选择 + 无横滑）。
- **commit**：`feat(formation): 16.4 移动端适配 + M4 收口`（MobileEditor 接 HeroPicker 于 M4 第1轮审计）。

### 16.5 浏览器手验 [x]
- **验证**：桌面拖拽主链路 + 移动端 HeroPicker；`npm run test:regression`。

---

## 模块化分离与 JSON 契约（第4轮审计·阵型模拟器）

**目标**：模拟计算与 UI 显示模块化区分；丢掉 webUI 直接调用引擎也能模拟并输出 JSON（阵型/站位/每位英雄加成/总 DPS）。UI 拿数据渲染，UI 调整英雄→引擎重算→渲染。

**审计结论**：依赖边界本就干净（`src/domain/planner/` 零 React 依赖）；真正缺口在"输出契约"——`evaluatePlacementFit` 已算出 pool/signal 拆解，却被 `scoreFormation` 压成字符串丢弃，`ScoringResult.objective` 是零消费者死输出。

**改动**：
- `steadyStateScoring`：`ScoringResult` 删死字段 `explanations`/`objective`，增结构化 `breakdown`（`SimulationBreakdown`：baseDps/factors/pools/contributions）；评分循环抽 `scoreSupportDimension` 闭包消除三维度重复调用。
- `recommendationTypes`：`PlannerResult` 增 `breakdown`（JSON 可序列化），`recommendationEngine` 透传。
- `recommendationEngine`：抽共享 `resolvePlannerScenario`（搜索与评估共用场景/blocker 解析）；新增 `evaluateFormation` 纯入口（评估指定阵型，合法性违规进 warning 仍出拆解）。删死文件 `objectiveModel.ts`。
- CLI 证明：`scripts/simulator/simulate.ts` + `npm run simulate`（recommend/evaluate），读 `public/data/v1` JSON → 引擎 → stdout JSON。
- UI：`PlannerBreakdown.tsx` 渲染 baseDps→carryDps 因子构成 + 按英雄 top-N 加成（超 3 折叠）；`PlannerResultCard` 接入。

**测试**：`steadyStateScoring.test.ts` breakdown 断言；`recommendationEngine.test.ts` evaluateFormation（不搜索/原样返回/seat 冲突 warning）；`PlannerBreakdown.test.tsx`（null 不渲染/因子/按英雄/折叠）；`beamSearchRanking.test.ts` mock 同步。验证 `test:run` + `build` + CLI 实跑双模式。

**编辑→重算闭环**：planner 已有锁槽/指定 carry（15.4）→ `buildPlannerRecommendation` 重搜 → 新 breakdown 渲染；自配评估页（`/planner/evaluate`）是基于 `evaluateFormation` 建的「可编辑阵型棋盘按 exact 阵型评估」UI——用户摆阵型 → `evaluateFormation` 重算 → breakdown 渲染，半自动「算剩余最优」复用 `buildPlannerRecommendation`。

---

## 自配评估页阶段 1-4（M4 后·引擎能力的 UI 接通）

`evaluateFormation` 引擎入口（第4轮审计）在 M4 收口时只有 CLI 消费；这套阶段把它接通成用户可见的「自摆阵型 → 看核心英雄 DPS」工作台。

- **阶段 1 骨架**：`PlannerEvaluatePage.tsx` + `/planner/evaluate` 路由；复用 `usePlannerCollections`（数据加载）与 `evaluatePlacementsStore`（跨路由保留玩家自摆阵型）。
- **阶段 2 可编辑棋盘**：复用 `FormationBoardCanvas` + `HeroPicker`（拖拽源）+ 槽位 `<select>`；`evaluateFormation` 经 `useMemo` 消费 placements → 重算 → 渲染。
- **阶段 3 锁/算剩余/回填**：槽位锁（`lockedSlots` 局部态）+「算剩余最优」（`buildPlannerRecommendation` 半自动补全）+「回填到自动计划」（路由 state 带 `lockedSlotsFromEvaluate` + `variantIdFromEvaluate`）。
- **阶段 4 评估渲染**：`PlannerBreakdown`（baseDps → carryDps 因子构成 + 按英雄加成来源）接入评估卡片。

**锁契约**：锁定槽位不可变——`<select>` 禁用、拖拽覆盖与拖出移除均被拒（避免锁残留导致「算剩余」复活已移除英雄）。切场景清锁与已摆阵型（slotId 随场景失效）。

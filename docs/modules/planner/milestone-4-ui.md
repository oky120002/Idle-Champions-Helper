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

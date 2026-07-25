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
- **改动**：新建 `PlannerTopLineups.tsx`/`PlannerCarryRanking.tsx`；消费 PlannerRecommendationSet；展示推图层数预估（10）+ survival 约束（5）。
- **测试**：组件测试覆盖 Top K 切换/carry 列表/预估展示。
- **验证**：`npm run test:run` + 浏览器。
- **commit**：`feat(planner): 15.2 Top K + carryRanking + 推图预估展示`。

### 15.3 候选模式控件 [x]
- **改动**：`usePlannerPageModel` 加 candidateMode；`buildPlannerRecommendation` 加 options；接通 hypotheticalBaseline；新建 `PlannerCandidateMode.tsx`。
- **测试**：三档切换改变 candidatePool；all-hypothetical 走 hypotheticalBaseline。
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

**目标**：阵型编辑器桌面 HTML5 拖拽。
**边界**：移动端无原生触摸 DnD，沿用 tap-target + MobileEditor 原生 select。

### 16.1 HeroPicker 选择器 [x]
- **改动**：新建 `src/pages/formation/HeroPicker.tsx`（搜索 + 按 seat 分组 + 头像 + 英雄卡 draggable 写 dataTransfer）；FormationBoardEditor 叠加 HeroPicker 作桌面拖拽源面板。Grid/MobileEditor 保留原生 `<select>`（桌面 click 直达、移动原生 a11y），HeroPicker 是叠加拖拽源，非替代。seat 标签复用 `formatSeatLabel`，与 FormationMobileEditor 一致。
- **测试**：搜索过滤 / 按 seat 分组 / 选中触发 onChange / trigger aria-expanded / Esc 关闭 / 外击关闭。
- **验证**：`npm run test:run`。
- **commit**：`feat(formation): 16.1 HeroPicker 选择器 + 16.2 拖拽 API`（16.1/16.2 合并提交）。

### 16.2 拖拽 API（HTML5 DnD） [x]
- **改动**：HeroPicker 英雄卡 `draggable=true` + `onDragStart` 写 `dataTransfer`；FormationBoardCanvas slot 加 `onDragOver`(preventDefault) + `onDrop`，新增 `onSlotDrop` prop；Grid 传 `onSlotDrop` → `handleAssignChampion`。
- **测试**：draggable 属性落到 DOM（jsdom 不实现 DataTransfer，写入由浏览器保证）。
- **验证**：`npm run test:run`。
- **commit**：同 16.1（合并提交）。

### 16.3 拖拽放入/替换/槽位间 [x]
- **改动**：`handleAssignChampion` 增「槽位间拖动原子清原 slot」——hero 已在别处则清原位，避免同英雄重复占 seat；空 championId 清槽；覆盖即替换。seat 冲突由既有 `conflictingSeats` 派生在棋盘渲染时实时提示（红色槽 + error 状态条）。
- **测试**：`formation-board-actions` 单测覆盖放入/清空/槽位间原子清原/替换保留他处。
- **已知边界**：拖出棋盘移除未实现——移除走槽位 select 或 HeroPicker 的「未放置」。E2E 拖拽主链路未补（Playwright HTML5 DnD 难稳定，核心逻辑由单测覆盖）。
- **commit**：`feat(formation): 16.3 拖拽交互`。

### 16.4 移动端 tap-target + 响应式收口 [x]
- **改动**：`responsive.css` ≤720px：HeroPicker 桌面专用（移动端 `display:none`——无触摸 DnD，由 MobileEditor 原生 select + tap-target 接管）；slot/棋盘尺寸与 tap-target 样式沿用 15 阶段。
- **已知边界**：MobileEditor 未接 HeroPicker——保留原生 `<select>`（移动原生 a11y 更稳，避免弹层嵌套）。桌面 HeroPicker click 落点为 `activeMobileSlot`（tap-target 桌面隐藏，默认锁在 `pickPreferredSlotId`），主交互为拖拽。
- **commit**：`feat(formation): 16.4 移动端适配 + M4 收口`。

### 16.5 浏览器手验 [x]
- **验证**：桌面拖拽主链路 + 移动端 tap-target；`npm run test:regression`。

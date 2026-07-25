# 里程碑 4·UI

- 作用：M4 执行步骤清单；产出用户可见可用。架构决策、16 阶段进度勾选、文档同步硬约束见 `evolution-plan.md` 总纲。
- 状态：阶段 15-16 待做 [ ]（最后执行）。

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

### 15.6 浏览器手验闭环
- **验证**：`npm run dev`，/planner 跑通全链路；`npm run test:regression`。
- **commit**：无。

---

# 阶段 16：拖拽（最后）

**目标**：阵型编辑器拖拽重做。
**边界**：移动端无原生 DnD，用 tap-target。

### 16.1 HeroPicker 选择器
- **改动**：新建 `src/pages/formation/HeroPicker.tsx`（搜索/分组/头像，替代 select）；FormationBoardGrid 改用 HeroPicker。
- **测试（先写）**：搜索过滤/分组/选中/灰显。
- **验证**：`npm run test:run` + 浏览器。
- **commit**：`feat(formation): 16.1 HeroPicker 选择器`。

### 16.2 拖拽 API（HTML5 DnD）
- **改动**：HeroPicker 英雄卡 draggable；FormationBoardGrid slot 设 drop target；drop 调 handleAssignChampion。
- **测试（先写）**：dragstart 设 dataTransfer；drop 触发 handleAssignChampion。
- **验证**：`npm run test:run` + 浏览器。
- **commit**：`feat(formation): 16.2 拖拽 API`。

### 16.3 拖拽放入/替换/移除/槽位间
- **改动**：放入/替换/槽位间拖动（原子清原 slot）/拖出移除；seat 冲突实时提示。
- **测试（先写）**：E2E 拖拽主链路 + seat 冲突。
- **验证**：`npm run test:e2e` + 浏览器。
- **commit**：`feat(formation): 16.3 拖拽交互`。

### 16.4 移动端 tap-target + HeroPicker 弹层
- **改动**：FormationMobileEditor 接 HeroPicker；responsive.css ≤720px。
- **测试**：移动端 tap → 弹出 → 选择。
- **验证**：Playwright mobile viewport。
- **commit**：`feat(formation): 16.4 移动端适配`。

### 16.5 浏览器手验
- **验证**：桌面 + 移动端手验拖拽主链路；`npm run test:regression`。
- **commit**：无。

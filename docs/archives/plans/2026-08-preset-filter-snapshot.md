# 方案存档筛选条件快照

**状态**: 已落地
**类型**: change
**范围**: presets
**创建日期**: 2026-08-07

## 目标

打通「英雄列表页筛选 → 阵型编辑页 → 方案存档 → 恢复方案」的筛选传递链路：用户在英雄列表页按 11 维筛选缩小候选池后，带着这套筛选进入阵型编辑页摆阵型，保存方案时把筛选条件快照进方案记录；下次恢复方案时还原当时的候选池视角。

## 背景

- 需求 `preset-integration-extensions.md §1` 指出当前方案只存阵容，不存筛选上下文，恢复时候选池回到全量。
- 现状摸查发现**衔接断裂**：丰富筛选在英雄列表页（`ChampionsFilterState` 11 维），但方案保存入口在阵型编辑页 / planner 页，两者状态完全隔离——阵型页 HeroPicker 只有一个搜索框，planner 只有候选模式二选一。
- 可复用基建已就绪：
  - `features/champion-filters/query-state.ts` — 跨页面筛选 query 编解码（`appendCommonFilterSearchParams` / `readCommonFilterState`，接受自定义 param keys）
  - `rules/championFilter.ts` — 过滤纯函数 `filterChampions(champions, filters)`
  - `FormationPreset` zod schema 用 `.loose()` passthrough — 加可选字段不 break 旧记录
- planner 页候选模式（owned-only / all-hypothetical）与英雄属性筛选正交，本期不做 planner 链路（planner 保存时 `filterSnapshot: null`）。

## 范围

- `src/domain/types/formation.ts` — `FormationPreset` 加 `filterSnapshot` 可选字段
- `src/domain/types/stored-record-schemas.ts` — zod schema 钉死 `filterSnapshot` 核心字段
- `src/pages/formation/useFormationFilterState.ts` — 新建，阵型页筛选状态 hook（读 URL + 维护 state）
- `src/pages/formation/useFormationPageDerived.ts` — `championOptions` 接入 `filterChampions`
- `src/pages/formation/formation-preset-actions.ts` — 保存时写入 `filterSnapshot`
- `src/pages/formation/useFormationBootstrap.ts` — 恢复方案时还原筛选
- `src/pages/formation/types.ts` — 阵型页 model 加筛选相关字段
- `src/pages/champions/` — 英雄列表页加「带着筛选去摆阵型」入口
- `src/pages/planner/PlannerSavePreset.tsx` — 保存时填 `filterSnapshot: null`

## 阶段 Checklist

### 阶段 1：FormationPreset 数据模型扩展

- [x] 定义 `ChampionFilterSnapshot` 类型（= `CommonFilterSearchState` 的 10 维 + search，复用不新建） —— 验证：typecheck
- [x] `FormationPreset` 加 `filterSnapshot: ChampionFilterSnapshot | null` —— 验证：typecheck
- [x] zod `formationPresetSchema` 加可选 `filterSnapshot` 子 schema（passthrough 旧记录兼容，显式钉死新记录核心字段） —— 验证：stored-record-schema-sync 守护测试通过
- [x] 两处保存入口（`formation-preset-actions.ts` / `PlannerSavePreset.tsx`）填 `filterSnapshot: null` 占位 —— 验证：现有方案保存/读取测试全绿
- [x] 旧方案（无 filterSnapshot）读取不 break —— 验证：`parseStoredRecord` passthrough 放行

### 阶段 2：阵型编辑页筛选状态 + 候选池过滤

- [x] 新建 `useFormationFilterState`：读 URL query 初始化 `CommonFilterSearchState`（复用 `readCommonFilterState`），维护 state，变更时写回 URL（`replace`，不污染历史） —— 验证：hook 单测（URL → state、state → URL 闭环）
- [x] 阵型页定义自己的 filter param keys 常量组（与英雄列表页同名独立，复用编解码函数） —— 验证：与英雄列表页 param 不冲突（阵型页此前不消费 query）
- [x] `useFormationPageDerived` 的 `championOptions` 接入 `filterChampions`（筛选后列表传入 HeroPicker） —— 验证：阵型页带筛选 URL → HeroPicker 只显示匹配英雄
- [x] HeroPicker 不改（接受上层传入列表），确认筛选后列表正确流入 —— 验证：现有 HeroPicker 测试全绿
- [x] 阵型页 model 暴露筛选状态（`filterState` / `hasActiveFilter` / 清除筛选动作） —— 验证：typecheck + 页面交互测试

### 阶段 3：保存时快照筛选

- [x] `formation-preset-actions.ts` 保存时把当前 `CommonFilterSearchState` 写入 `preset.filterSnapshot` —— 验证：保存方案后 IDB 记录含 filterSnapshot
- [x] 无筛选时存 `null`（不存空对象，区分「没筛」与「筛了但碰巧全空」） —— 验证：单测覆盖 null 与有值两种

### 阶段 4：恢复方案时还原筛选

- [x] 阵型页恢复方案路径（`pendingPresetRestore`）读取 `preset.filterSnapshot`，非 null 时初始化筛选状态（写 URL + 更新 state） —— 验证：恢复含 filterSnapshot 的方案后 HeroPicker 显示当时候选池
- [x] filterSnapshot 为 null 的旧方案恢复时筛选为空（全量候选） —— 验证：旧方案恢复行为不变

### 阶段 5：英雄列表页入口

- [x] 英雄列表页加「带着筛选去摆阵型」入口（有活跃筛选时显示），构建 `/formation?<filter params>` 跳转 —— 验证：点击后阵型页 URL 含筛选参数 + HeroPicker 已过滤
- [x] 无活跃筛选时不显示入口或跳转不带参数（避免无意义跳转） —— 验证：UI 交互

### 阶段 6：文档同步

- [x] specs 更新：`presets/scope-and-model.md`（filterSnapshot 字段）、`presets/ui.md`（筛选快照恢复交互）、`formation/` 相关 specs（阵型页消费筛选）
- [x] requirements 状态更新：`preset-integration-extensions.md §1` 打钩
- [x] plan 状态 → 已落地 → 移 `archives/plans/`

## 验收

- 英雄列表页筛选 → 进阵型页 → HeroPicker 只显示匹配英雄
- 阵型页保存方案含 filterSnapshot（有筛选时）或 null（无筛选时）
- 恢复方案时候选池按 filterSnapshot 还原
- 旧方案（schemaVersion 1，无 filterSnapshot）读取不 break，恢复时筛选为空
- 全量测试通过 + typecheck 通过

## 落地后

- specs/ 更新点：
  - `specs/modules/presets/scope-and-model.md`：数据模型加 filterSnapshot 字段
  - `specs/modules/presets/ui.md`：筛选快照保存与恢复交互
  - `specs/modules/champions/` 或 `specs/modules/formation/`：阵型页消费英雄列表筛选的跨页衔接
- requirements/ 更新：`preset-integration-extensions.md §1` 打钩（若全部子项落地则整体归档）
- 本 change 状态 → 已落地 → 移 `archives/plans/`

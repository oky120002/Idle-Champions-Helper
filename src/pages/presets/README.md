# Presets feature map

面向后续 AI 修改时的最小加载入口。

## 推荐加载顺序

1. `src/pages/PresetsPage.tsx`
   - 先看页面如何接入全站工作台壳层、工具条和右侧内容区。
2. `src/pages/presets/usePresetsPageModel.ts`
   - 看读取、刷新、编辑、删除、恢复的状态与动作装配。
3. `src/pages/presets/PresetsListSection.tsx`
   - 看空态 / 列表态如何切换。
4. `src/pages/presets/PresetCard.tsx`
   - 看单条方案卡片、兼容恢复提示、删除确认与编辑入口。
5. `src/pages/presets/PresetEditorForm.tsx`
   - 看名称、备注、标签、优先级编辑表单。
6. `src/pages/presets/preset-model.ts`
   - 看纯逻辑：metrics、排序后的视图拼装、标签解析、时间格式化。

## 文件职责

- `constants.ts`: schema version、优先级选项、空编辑器默认值。
- `types.ts`: feature 内部类型边界。
- `PresetsOverview.tsx`: “当前范围 / 当前边界”说明块。

## 关键不变量

- 页面只管理“已命名方案”，不直接管理最近草稿。
- 恢复按钮只有 `prompt.kind === 'restore'` 时可用。
- 编辑保存会刷新方案列表，并保留最新 `dataVersion / formations / champions` 上下文重建 prompt。
- 删除后若当前正编辑同一方案，编辑态必须一起关闭。
- IndexedDB 行为回归至少跑 `tests/component/presetsPage.restore.test.tsx`。

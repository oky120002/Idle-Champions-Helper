# Champion visual workbench

推荐加载顺序：

1. `src/components/ChampionVisualWorkbench.tsx`
2. `src/components/champion-visual-workbench/useChampionVisualWorkbenchModel.ts`
3. `src/components/champion-visual-workbench/ChampionVisualWorkbenchHeader.tsx`
4. `src/components/champion-visual-workbench/ChampionVisualWorkbenchStage.tsx`
5. `src/components/champion-visual-workbench/ChampionVisualWorkbenchConsole.tsx`
6. `src/components/champion-visual-workbench/asset-model.ts`

关键不变量：

- 视觉档案只展示站内同步的元数据，不暴露官方请求入口。
- 资源槽位按钮只在该槽位有 asset 时可点击。
- 皮肤切换会影响 `skin-*` 槽位对应的当前资源。
- `graphic #...` 和 delivery 文案需要继续在工作台里可见，供现有测试断言。

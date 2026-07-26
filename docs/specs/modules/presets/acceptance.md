# 方案存档：验收标准

## 验收

- 用户能把至少一套阵型草稿保存到本地。
- 刷新页面后仍能看到已保存方案。
- 已保存方案再次打开时，能恢复对应布局与场景上下文，或明确提示当前方案没有绑定场景。
- 空态、列表态、删除态都明确可用。
- 公共数据版本变化后，旧方案不会静默坏掉。
- 数据结构可以继续承接筛选快照和个人画像扩展。

## 当前实现

- 阵型页可把当前工作草稿保存为命名方案，字段包含名称、备注、场景标签、优先级和 `scenarioRef`。
- 方案存档页支持按最近编辑排序展示本地方案列表。
- 支持编辑名称、备注、标签与优先级。
- 支持删除方案，并可把方案恢复回阵型页继续编辑。
- 方案恢复与最近草稿共用一套版本校验逻辑；若只能兼容恢复，页面显式提示，不做静默恢复。

实现文件：`src/pages/PresetsPage.tsx`、`src/pages/FormationPage.tsx`、`src/data/formationPresetStore.ts`、`src/data/formationPersistence.ts`、`src/data/localDatabase.ts`、`src/domain/types.ts`

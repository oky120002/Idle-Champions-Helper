# formation 入口

- 先读 `src/pages/formation/useFormationPageModel.ts`，看页面怎样拼装状态、派生数据和动作。
- 启动与恢复链路读 `src/pages/formation/useFormationBootstrap.ts` -> `src/pages/formation/formation-bootstrap-operations.ts`。
- 本地状态读 `src/pages/formation/useFormationPageState.ts`；草稿自动保存读 `src/pages/formation/useFormationDraftPersistence.ts`。
- 纯派生和格式化读 `src/pages/formation/useFormationPageDerived.ts`、`src/pages/formation/formation-model-helpers.ts`。
- 交互动作按意图分别读 `formation-board-actions.ts`、`formation-draft-prompt-actions.ts`、`formation-preset-actions.ts`。
- 公共契约只看 `src/pages/formation/types.ts`；不要先通读整个目录。

# 阵型编辑：验收标准

## 验收

- 能稳定加载布局库并完成「选布局 → 放英雄 → 看冲突 → 看摘要」闭环。
- `seat` 冲突实时更新；清空阵型不留脏状态。
- 最近草稿能保存、恢复、兼容回退；旧草稿在公共数据变化后不会静默损坏。
- 草稿绑定场景上下文时，恢复不会把 `scenarioRef` 悄悄降级成纯文本标签。
- 空槽位提示显示前排 / 中排 / 后排；数据缺失时回退到行号提示。
- 接入方案存档时，不需要推翻当前数据结构。

## 当前实现

- 已实现：初始化读取最近草稿；三种恢复处理入口；`layoutId / placements / scenarioRef` 防抖写入 `IndexedDB`；优先按保存版本恢复；兼容恢复显式提示；清空空阵时自动清理最近草稿；从阵型页「保存为方案」；官方布局生成 `laneHints` 并由编辑器消费。
- 实现文件：`src/pages/FormationPage.tsx`、`src/data/formationDraftStore.ts`、`src/data/formationPersistence.ts`、`src/data/localDatabase.ts`、`src/data/client.ts`、`src/domain/types.ts`
- 验证：`npm run build` + `lint` 通过；浏览器自动化覆盖「放英雄 → 自动保存 → 刷新恢复 → 保存为方案 → 方案恢复 → 删除方案」主链路；受限会话 Playwright 边界见 `docs/archives/investigations/runtime/playwright-browser-launch/README.md`

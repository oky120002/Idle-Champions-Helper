# 阵型编辑：规则边界、衔接与验收

- 日期：2026-04-13
- 目标：沉淀当前硬规则、与方案存档的衔接、验收标准和实现状态。

## 规则边界

- 第一阶段只做一条硬规则：同一 `seat` 只能出现一名英雄。
- 后续再扩：禁用槽位、冒险 / 变体绑定布局、前后排提示、标签资格限制。
- 这些规则应逐步下沉到规则层，不直接硬编码在 JSX 里。

## 与方案存档模块的衔接

- 阵型页负责：当前正在编辑的工作草稿、最近草稿的保存与恢复。
- 方案存档页负责：已命名、可复用、可管理的方案库。
- 衔接数据至少包括：`layoutId`、`placements`、自动提取的已占用 `seat`、用户备注、当前场景标签、正式 `scenarioRef`。
- 不要只存自由文本标签；恢复和规则校验必须依赖正式场景身份。

## 验收标准

- 能稳定加载布局库并完成“选布局 -> 放英雄 -> 看冲突 -> 看摘要”闭环。
- `seat` 冲突实时更新；清空阵型不留脏状态。
- 最近草稿能保存、恢复、兼容回退；旧草稿在公共数据变化后不会静默损坏。
- 若草稿绑定了场景上下文，恢复时不会把 `scenarioRef` 悄悄降级成纯文本标签。
- 接入方案存档时，不需要推翻当前数据结构。

## 当前实现与验证

- 当前已实现：初始化读取最近草稿；三种恢复处理入口；`layoutId / placements / scenarioRef` 防抖写入 `IndexedDB`；优先按保存版本恢复；兼容恢复显式提示；清空空阵时自动清理最近草稿；从阵型页发起“保存为方案”。
- 对应实现文件：`src/pages/FormationPage.tsx`、`src/data/formationDraftStore.ts`、`src/data/formationPersistence.ts`、`src/data/localDatabase.ts`、`src/data/client.ts`、`src/domain/types.ts`
- 当前验证结果：`npm run build` 通过；`npm run lint` 通过；浏览器自动化验收已覆盖“放英雄 -> 最近草稿自动保存 -> 刷新恢复 -> 保存为方案 -> 方案恢复 -> 删除方案”主链路；受限会话 Playwright 边界见 `docs/investigations/runtime/playwright-browser-launch-verification.md`

## 当前明确不做

- 真实战役布局全量核实
- 拖拽或动画优先的交互重构
- 技能覆盖、DPS 或 BUD 计算
- 自动站位优化

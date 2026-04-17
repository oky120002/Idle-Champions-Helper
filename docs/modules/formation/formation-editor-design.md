# 阵型编辑模块设计稿

- 日期：2026-04-13
- 目标：让用户基于真实英雄数据和官方 definitions 提取的阵型布局，完成“选布局 -> 放英雄 -> 看 seat 冲突 -> 形成草稿”的最小闭环。
- 当前结论：第一阶段优先做阵型草稿编辑器，并把“最近草稿保存 / 恢复”放进阵型页自身闭环；不追求真实战役全覆盖、拖拽交互或复杂规则模拟。

## 模块定位与边界

- 阵型编辑负责把候选英雄摆进槽位，是查询页与方案存档页之间的连接层。
- 当前要解决：不同布局下怎么摆、同一 `seat` 是否冲突、当前已经放了谁、如何形成可恢复草稿。
- 当前不负责：自动推荐站位、真实战役布局全量映射、敌人机制模拟、技能连线和增益覆盖计算。

## 输入与依赖

- `public/data/v1/formations.json`：官方 definitions 自动提取的唯一布局库，保留 `sourceContexts / applicableContexts`
- `public/data/v1/champions.json`：可选英雄及其 `seat / roles`
- `src/pages/FormationPage.tsx`：页面入口
- `src/rules/seat.ts`：`findSeatConflicts`
- `src/data/formationDraftStore.ts`、`src/data/formationPersistence.ts`、`src/data/localDatabase.ts`：最近草稿与命名方案的本地持久化

## 第一阶段闭环

- 按战役 / 冒险 / 变体筛选布局。
- 按上下文名称中英混搜布局。
- 切换布局、为每个槽位选英雄、清空单槽 / 整体阵型。
- 实时提示 `seat` 冲突并生成阵型摘要。
- 保存最近草稿、恢复最近草稿、从当前工作草稿发起“保存为方案”。
- 移动端采用“缩略阵型棋盘 + 当前槽位编辑卡”，不依赖横向滑动。

### 布局筛选要求

- 场景类型至少支持：`全部 / 战役 / 冒险 / 变体`
- 关键词应匹配 `layout.name`、`layout.notes`、`sourceContexts[].name`，保留中英混搜
- 当前编辑布局与筛选结果解耦：即便当前布局被筛掉，也不能自动清空当前阵型，只提示“当前编辑布局不在筛选结果中”
- 指标卡需展示“布局库总数 / 当前匹配数”；零结果时提示用户放宽关键词或类型条件

## 草稿数据模型

| 字段 | 说明 |
| --- | --- |
| `schemaVersion` | 草稿结构版本，便于以后迁移 |
| `dataVersion` | 保存时对应的公共数据版本 |
| `layoutId` | 当前布局 |
| `scenarioRef.kind` | `campaign` / `adventure` / `variant` / `trial` / `timeGate` |
| `scenarioRef.id` | 正式场景身份；没有场景筛选时可为空 |
| `placements` | `slotId -> championId` |
| `updatedAt` | 最近编辑时间 |

## 恢复校验与回退

恢复前必须校验：`dataVersion`、`layoutId`、`scenarioRef`、`slotId`、`championId` 是否仍可识别。

1. 保存版本仍可读：优先按保存时 `dataVersion` 原样恢复。
2. 保存版本可读但部分失效：保留有效放置，列出失效布局 / 槽位 / 英雄，并提示用户重新保存或丢弃失效引用。
3. 保存版本不可读：才进入兼容恢复，用当前版本校验并明确提示“基于新版本兼容恢复，结果可能有偏差”。
4. 整体失效：不静默恢复，明确提示用户丢弃旧草稿。

## 最近草稿持久化

- 最近草稿不是页面临时状态，而是本地持久化对象；正式介质统一走 `IndexedDB`。
- 页面初始化时读取最近草稿；若可恢复，提供“恢复 / 先保留不恢复 / 丢弃旧草稿”入口。
- `layoutId`、`placements`、`scenarioRef` 变化后以防抖方式自动保存。
- 用户清空阵型且阵型为空时，同步清理最近草稿记录。
- “保存为方案”不删除最近草稿；工作草稿与命名方案分层共存。

## 规则边界

- 第一阶段只做一条硬规则：同一 `seat` 只能出现一名英雄。
- 后续再扩：禁用槽位、冒险 / 变体绑定布局、前后排提示、标签资格限制。
- 这些规则应逐步下沉到规则层，不直接硬编码在 JSX 里。

## 布局数据策略

- 页面消费的是“唯一布局库”，不是“与游戏战役一一对应的最终页面模型”。
- `formations.json` 必须保留 `sourceContexts / applicableContexts`，否则用户会误以为当前布局已与战役完全一一映射。
- `scripts/data/manual-overrides.json` 只用于必要布局覆写和补充说明，不再承担全量主数据。
- `language_id=7` 对部分新活动或时空门条目仍可能回退英文原文，页面需接受这种边界。

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
- 当前验证结果：`npm run build` 通过；`npm run lint` 通过；浏览器自动化验收已在 `danger-full-access` 会话中覆盖“放英雄 -> 最近草稿自动保存 -> 刷新恢复 -> 保存为方案 -> 方案恢复 -> 删除方案”主链路；受限会话 Playwright 边界见 `docs/investigations/runtime/playwright-browser-launch-verification.md`

## 当前明确不做

- 真实战役布局全量核实
- 拖拽或动画优先的交互重构
- 技能覆盖、DPS 或 BUD 计算
- 自动站位优化

## 对应文件

- `src/pages/FormationPage.tsx`
- `src/data/formationDraftStore.ts`
- `src/data/formationPersistence.ts`
- `src/data/localDatabase.ts`
- `src/rules/seat.ts`
- `public/data/v1/formations.json`
- `scripts/data/manual-overrides.json`

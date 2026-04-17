# 阵型编辑：草稿模型、恢复与持久化

- 日期：2026-04-13
- 目标：沉淀最近草稿的数据模型、恢复语义和本地持久化规则。

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

## 布局数据策略

- 页面消费的是“唯一布局库”，不是“与游戏战役一一对应的最终页面模型”。
- `formations.json` 必须保留 `sourceContexts / applicableContexts`，否则用户会误以为当前布局已与战役完全一一映射。
- `scripts/data/manual-overrides.json` 只用于必要布局覆写和补充说明，不再承担全量主数据。
- `language_id=7` 对部分新活动或时空门条目仍可能回退英文原文，页面需接受这种边界。

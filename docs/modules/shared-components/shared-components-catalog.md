# 共享组件索引

- 更新日期：2026-04-13
- 目的：先查现有可复用资产，再决定是否新增组件。
- 使用规则：开发前必须先看本页；已能覆盖场景时必须直接复用，不要在页面内重写等价结构。

## 组件目录

| 组件 | 路径 | 适用场景 | 关键能力 | 当前使用位置 |
| --- | --- | --- | --- | --- |
| `SurfaceCard` | `src/components/SurfaceCard.tsx` | 页面级大卡片、说明卡、工作台容器 | 统一 `eyebrow / title / description / footer / body` 结构 | 主页、英雄筛选、变体限制、阵型编辑、方案存档、个人数据 |
| `ChampionAvatar` | `src/components/ChampionAvatar.tsx` | 英雄头像、小卡片头像、阵型槽位头像、胶囊标签头像 | 统一头像路径、双语 `alt`、无图回退 | `FormationPage.tsx`、`ChampionIdentity.tsx`、`ChampionPill.tsx` |
| `ChampionIdentity` | `src/components/ChampionIdentity.tsx` | 结果卡标题区、英雄详情头部 | 统一“头像 + eyebrow + 主副名称”身份展示 | `ChampionsPage.tsx`、`FormationPage.tsx` |
| `ChampionPill` | `src/components/ChampionPill.tsx` | 已上阵英雄列表、恢复预览、紧凑型结果 | 统一“小头像 + 单行标签”模式，默认标签含 `seat + 名称` | `FormationPage.tsx`、`PresetsPage.tsx` |
| `LocalizedText` | `src/components/LocalizedText.tsx` | 游戏数据双语字段 `{ original, display }` | 统一主文本 / 副文本渲染，支持 `primary / pair / stacked` | `ChampionsPage.tsx`、`VariantsPage.tsx`、`FormationPage.tsx` |
| `StatusBanner` | `src/components/StatusBanner.tsx` | 加载、成功、错误、兼容恢复提醒 | 统一 `tone / title / detail / meta / actions` 结构 | `ChampionsPage.tsx`、`VariantsPage.tsx`、`UserDataPage.tsx`、`FormationPage.tsx`、`PresetsPage.tsx` |
| `FieldGroup` | `src/components/FieldGroup.tsx` | 带 `label` / `hint` 的字段块和筛选区 | 统一标题、提示和容器结构 | `ChampionsPage.tsx`、`VariantsPage.tsx`、`UserDataPage.tsx`、`FormationPage.tsx`、`PresetsPage.tsx` |

## helper

| helper | 路径 | 适用场景 | 当前使用位置 |
| --- | --- | --- | --- |
| `formatSeatLabel` | `src/domain/localizedText.ts` | 所有 `seat` 标签展示 | `ChampionsPage.tsx`、`FormationPage.tsx`、`PresetsPage.tsx` |
| `getLocalizedTextPair` | `src/domain/localizedText.ts` | 只需要字符串、不需要额外 DOM 时 | 多个列表和标签拼接场景 |

## 选择建议

- 只展示头像：优先 `ChampionAvatar`
- 展示完整身份头部：优先 `ChampionIdentity`
- 展示紧凑单行标签：优先 `ChampionPill`
- 渲染游戏数据双语字段：优先 `LocalizedText`
- 展示状态反馈：优先 `StatusBanner`
- 组织字段块：优先 `FieldGroup`
- 只是 `seat` 或双语字符串格式化：优先 helper，不要硬抽组件

## 当前不建议抽成共享组件的模式

- 结果卡整卡结构：字段组合差异仍然偏大
- 方案优先级按钮组：仍是页面私有业务交互

若后续这些模式在至少两个页面稳定复现，再重新评估是否抽取。

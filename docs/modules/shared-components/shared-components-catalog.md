# 共享组件索引

- 更新日期：2026-04-13
- 目的：给后续智能体与开发人员一个“先查可复用资产，再决定是否新增组件”的入口。
- 维护规则：新增、删除或明显调整共享组件后，必须同步更新本页。

---

## 当前可直接复用的组件

### 1. `SurfaceCard`

- 路径：`src/components/SurfaceCard.tsx`
- 适用场景：页面级大卡片、说明卡、工作台容器
- 核心能力：统一 `eyebrow / title / description / footer / body` 结构
- 核心 props：
  - `title: string` 必填
  - `eyebrow?: string`
  - `description?: string`
  - `footer?: ReactNode`
- 已使用位置：主页、英雄筛选、变体限制、阵型编辑、方案存档、个人数据
- 使用示例：

```tsx
<SurfaceCard
  eyebrow={t({ zh: '个人数据', en: 'User data' })}
  title={t({ zh: '本地导入工作台', en: 'Local import workbench' })}
  description={t({ zh: '先做本地解析与校验。', en: 'Start with local parsing and validation.' })}
>
  <div>...</div>
</SurfaceCard>
```

### 2. `LocalizedText`

- 路径：`src/components/LocalizedText.tsx`
- 适用场景：展示游戏数据里的双语字段，即 `{ original, display }`
- 设计目的：统一“当前语言主文本 + 可选副文本”的渲染逻辑，避免页面里反复手写 `getPrimaryLocalizedText / getSecondaryLocalizedText`
- 核心模式：
  - `mode="primary"`：只显示当前语言主文本
  - `mode="pair"`：同一行输出主副文本
  - `mode="stacked"`：分主副节点输出，适合卡片标题区
- 核心 props：
  - `text: LocalizedText` 必填
  - `mode?: 'primary' | 'pair' | 'stacked'`
  - `as?: ElementType`
  - `primaryAs?: ElementType`
  - `secondaryAs?: ElementType`
  - `className? / primaryClassName? / secondaryClassName?`
  - `separator?: string`
- 已使用位置：
  - `src/pages/ChampionsPage.tsx`
  - `src/pages/VariantsPage.tsx`
  - `src/pages/FormationPage.tsx`
- 使用示例：

```tsx
<LocalizedText text={champion.name} mode="primary" as="span" className="tag-label" />

<LocalizedText text={champion.name} mode="pair" as="p" separator=" / " />

<LocalizedText
  text={champion.name}
  mode="stacked"
  primaryAs="h3"
  primaryClassName="result-card__title"
  secondaryAs="p"
  secondaryClassName="result-card__secondary"
/>
```

- 使用建议：
  - 只用于游戏数据双语字段，不用于 `t({ zh, en })` 这类 UI 文案
  - 如果只是字符串格式化，不需要 DOM 结构，优先看下方 helper，不要硬包成组件

### 3. `StatusBanner`

- 路径：`src/components/StatusBanner.tsx`
- 适用场景：加载、成功、错误、兼容恢复提醒、草稿恢复确认等状态提示
- 设计目的：统一 `tone`、标题、详情、补充内容、操作区结构，避免每个页面重复手写 `status-banner__content` 和 `status-banner__actions`
- 核心 props：
  - `tone: 'info' | 'success' | 'error'` 必填
  - `title?: ReactNode`
  - `detail?: ReactNode`
  - `meta?: ReactNode`
  - `actions?: ReactNode`
  - `children?: ReactNode`
- 已使用位置：
  - `src/pages/ChampionsPage.tsx`
  - `src/pages/VariantsPage.tsx`
  - `src/pages/UserDataPage.tsx`
  - `src/pages/FormationPage.tsx`
  - `src/pages/PresetsPage.tsx`
- 使用示例：

```tsx
<StatusBanner tone="info">正在读取英雄数据…</StatusBanner>

<StatusBanner
  tone="error"
  title={t({ zh: '方案列表读取失败', en: 'Preset list failed to load' })}
  detail={message}
/>
```

### 4. `FieldGroup`

- 路径：`src/components/FieldGroup.tsx`
- 适用场景：带 `label` / `hint` 的输入字段块，以及筛选区这类“标题 + 内容 + 提示”结构
- 设计目的：统一字段标题、提示文案和容器结构，减少页面里反复手写 `field-label` / `field-hint`
- 核心 props：
  - `label: ReactNode` 必填
  - `children: ReactNode` 必填
  - `hint?: ReactNode`
  - `as?: 'div' | 'label'`
  - `className?: string`
  - `labelFor?: string`
- 已使用位置：
  - `src/pages/ChampionsPage.tsx`
  - `src/pages/VariantsPage.tsx`
  - `src/pages/UserDataPage.tsx`
  - `src/pages/FormationPage.tsx`
  - `src/pages/PresetsPage.tsx`
- 使用示例：

```tsx
<FieldGroup label={t({ zh: '关键词', en: 'Keyword' })} hint={hint} as="label">
  <input className="text-input" type="text" />
</FieldGroup>

<FieldGroup label={t({ zh: '布局选择', en: 'Layout' })} className="filter-group">
  <div className="filter-chip-grid">...</div>
</FieldGroup>
```

---

## 相关 helper（非组件，但建议优先复用）

### 1. `formatSeatLabel`

- 路径：`src/domain/localizedText.ts`
- 适用场景：任何 `seat` 标签展示
- 作用：按当前界面语言输出 `4 号位` / `Seat 4`
- 当前使用位置：
  - `src/pages/ChampionsPage.tsx`
  - `src/pages/FormationPage.tsx`
  - `src/pages/PresetsPage.tsx`

### 2. `getLocalizedTextPair`

- 路径：`src/domain/localizedText.ts`
- 适用场景：只需要字符串结果，不需要额外 DOM 节点时
- 作用：按当前界面语言生成 `主文本 · 副文本`

---

## 当前明确不建议抽成共享组件的模式

以下模式虽然看起来有重复，但当前先不进入共享组件目录：

1. 结果卡整卡结构
   - 各页面字段组合差异还比较大，统一后会引入很多特例 props
2. 方案优先级按钮组
   - 目前仍是页面私有业务交互，不具备跨页面复用证据

如果后续这些模式在至少两个页面稳定复现，再重新评估是否抽取。

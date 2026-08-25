# 国际化重构：中央字典 + key 查表

**状态**: 已落地
**类型**: change
**范围**: system（i18n）
**创建日期**: 2026-08-13

## 目标

把 UI 文案从「内联 `{zh, en}` 对、各调用点重复书写」改为「**中央字典 `Record<key, Message>` + `t()` 查表**」：key 用默认语言（中文），`t(key, params?)` 按当前 locale 取文，未命中回退 key；带参数的模板串用占位符（`{n}`）进字典。译文只在字典一处维护，消除跨文件重复与同中文异英译的不一致。

## 问题（扫描事实）

- 全站 821 处 `t({ zh, en })` 内联对，1259 对中 **162 处重复**（`全部/All`×17、`未知错误/Unknown error`×7、`清空全部/Clear all`×5…）。
- **129 个中文 key 对应不同英文**：`暂无`→None/Not available/None yet、`种族`→Race/Races、`皮肤`→Skin/Skins 等。
- 135 处模板串（`` zh: `座位 ${n} 号位` `` 等）无法直接进查表，需占位符约定。
- dev2 已引入 `LocalizedUiText = {zh, en}`（planner 17 处领域 warning），与既有 `LocaleText = {zh, en}` **类型重复、形状相同**；且其做法是「内联双语对」，与中央字典相反，需收编。

## 方案

### 核心设计

```ts
// src/app/i18n-messages.ts（纯模块，无 React；UI 文案唯一真源）
type TranslateParams = Record<string, string | number>
interface Message { en: string; zh?: string }   // zh 缺省 = key（静态 UI 文案不必重写中文）
type MessageRef =
  | { key: string; params?: TranslateParams }   // 查字典（领域层诊断用）
  | { literal: string }                          // 直通单语文本（数据源 warning，不翻译）

const MESSAGES: Record<string, Message> = {
  '全部': { en: 'All' },
  '座位 {n} 号位': { en: 'Seat {n}' },
}

function translate(locale: AppLocale, text: string | MessageRef, params?: TranslateParams): string
// string → 字典 key；{key} → 查字典 + 插值；{literal} → 原样返回
// zh-CN 或无条目 → 回退 key；插值替换 {x} 占位符

// src/app/i18n.tsx
// useI18n().t(text: string | MessageRef, params?) = translate(locale, …)
```

- **删除** `LocaleText`（`app/i18n.tsx`）与 `LocalizedUiText`（`domain/types/common.ts`），统一为上述 `Message` / `MessageRef`。
- **占位符进字典**：所有模板串改写为 `t('座位 {n} 号位', { n })`。
- **强制合并同中文异英译**：129 处按钦定单一译法归一（`暂无`→None、`种族`→Race、`阵营`→Alignment、`职业`→Class、`皮肤`→Skin、`方案`→Preset、`草稿`→Draft…；现 3 处小写 `preset`/`draft` 一并归一）。
- **收编 dev2 17 处 warning**：`LocalizedUiText` 内联对 → 领域层产出 `MessageRef`（`{key, params}` 或 `{literal}`），译文进字典。
- **`t()` 兼容迁移期**：新签名先与旧 `t({zh,en})` 并存，迁移完成后删除旧签名并加弃用守护。

### 边界（不进中央字典）

| 文案 | 去向 | 入口 |
|---|---|---|
| 游戏数据专名（英雄/场景/战役/魔宠/联动队伍名等） | 管线 `LocalizedText {original, display}` 保持运行时数据 | `getPrimaryLocalizedText()` / `LocalizedText` 组件 |
| tag 名（种族/职业/阵营/性别/获取/机制） | 保持 domain 独立字典（key=游戏 id，已是查表模式） | `getChampionTagLabel(id, locale)` |
| 联动队伍手写表 `affiliation-tag-labels.ts` | **删除**，走管线 `champion.affiliations` | — |
| 数据源单语文本（`scenarioWarnings` 中文、`snapshot.warnings` 英文） | 保持 `string`，UI 边界 `{ literal }` wrap | `t({ literal })` |

判定口诀：**「这句的中英原文，游戏数据里有没有？」有 → 管线挑字段；没有 → 我们写的 → 中央字典。** 运行时代码按数据类型分叉（`LocalizedText` 对象走挑字段，裸串走 `t()`），不做运行时优先级探测。

### 阶段 Checklist

- [x] 阶段 1: 类型地基——建立 `Message`/`MessageRef`/`translate`/字典与新 `t` 签名 —— 验证：typecheck 与单测通过
- [x] 阶段 2: 迁移内联双语对与模板占位符 —— 验证：生产源码无 `t({zh,en})`，单测通过
- [x] 阶段 3: 数据结构中的 `LocaleText` 字段迁移为 `MessageRef` —— 验证：残留扫描与相关测试通过
- [x] 阶段 4: planner `LocalizedUiText` warning/叙述收编为 `MessageRef` —— 验证：planner 测试通过
- [x] 阶段 5: 统一静态译法并删除 `affiliation-tag-labels.ts`，改走管线双语数据 —— 验证：引用扫描与相关测试通过
- [x] 阶段 6: 删除旧类型/选择器，增加静态 key、字典值和占位符完整性守护 —— 验证：`i18n-messages.test.ts` 通过
- [x] 阶段 7: 全量回归与文档同步 —— 验证：`npm run test:unit`、`npm run lint`、`npm run typecheck`、`npm run build`

## 验收

- `src/` 无残留 `t({ zh` / `pickLocaleText(locale, {` / `LocaleText` / `LocalizedUiText` 类型引用
- 全部 UI 文案译文集中在 `MESSAGES` 字典；同一 key 全局唯一译法
- 游戏数据 `LocalizedText`、tag 名表、数据源单语文本保持各自边界不变
- 全量测试 + lint + typecheck + build 通过

## 审查结论（2026-08-14）

- 已落地：中央字典、字面量 key 迁移、参数插值、`MessageRef.literal`、基础构建与单测验证。
- 已完成：`LocaleText` 与 `LocalizedUiText` 全链路删除，planner warning/叙述统一为 `MessageRef`；静态 UI key 统一进入中央字典。
- 已补强：`i18n-messages.test.ts` 扫描生产源码中的字面量 `t()` 与 `MessageRef.key`，并校验字典 key 唯一、值非空、占位符一致，阻止英文界面静默显示中文。
- 阶段 5 审查：`Champion.affiliations` 与 `enums.affiliations` 均由数据管线提供 `{ original, display }`；筛选项和展示组件已直接消费该结构，因此已删除手写 affiliation 标签表及其聚合引用。`src/` 中 `affiliation-tag-labels` 引用归零。
- 阶段 5 边界：`champion-filter-model.ts` 与 `illustration-model.ts` 仍有 `selectLocaleText` 动态拼接筛选 chip；这是阶段 2/6 的中央字典迁移残留，不是 affiliation 数据缺口，本阶段不扩大修改范围。
- 收口条件：已满足；计划归档至 `docs/archives/plans/`。

## 落地后

- specs/ 更新点：
  - `docs/specs/guidelines/i18n-messages.md`（新增）：国际化分层规范——中央字典书写约定（key=中文、占位符、Message/MessageRef）、「管线数据 vs 中央字典」判定规则、禁用内联双语对
  - `docs/specs/modules/planner/architecture.md`：warning 契约由 `{zh,en}` 改为 `MessageRef` 的说明（若该文档涉及 warning 结构）
  - `docs/specs/guidelines/ai-first-ts-tsx.md`：若含 i18n 书写示例，同步更新
  - `CONTEXT.md`：术语表更新（中央字典 / MessageRef / 管线数据边界）
- 本 change 状态 → 已落地 → 移 `archives/plans/`
- **specs/ 永不引用本计划**（规范描述最终态，不描述交付过程）

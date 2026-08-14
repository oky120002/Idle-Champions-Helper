# 国际化重构：中央字典 + key 查表

**状态**: 已确认
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
| 游戏数据专名（英雄/场景/战役/宠物/联动队伍名等） | 管线 `LocalizedText {original, display}` 保持运行时数据 | `getPrimaryLocalizedText()` / `LocalizedText` 组件 |
| tag 名（种族/职业/阵营/性别/获取/机制） | 保持 domain 独立字典（key=游戏 id，已是查表模式） | `getChampionTagLabel(id, locale)` |
| 联动队伍手写表 `affiliation-tag-labels.ts` | **删除**，走管线 `champion.affiliations` | — |
| 数据源单语文本（`scenarioWarnings` 中文、`snapshot.warnings` 英文） | 保持 `string`，UI 边界 `{ literal }` wrap | `t({ literal })` |

判定口诀：**「这句的中英原文，游戏数据里有没有？」有 → 管线挑字段；没有 → 我们写的 → 中央字典。** 运行时代码按数据类型分叉（`LocalizedText` 对象走挑字段，裸串走 `t()`），不做运行时优先级探测。

### 阶段 Checklist

- [ ] 阶段 1: 类型地基——新建 `i18n-messages.ts`（`Message`/`MessageRef`/`translate`/字典骨架），改造 `i18n.tsx` 的 `t` 支持新签名且兼容旧 `{zh,en}` —— 验证方式：`npm run typecheck` + 既有 `LocalizedText.test.tsx` 等绿
- [ ] 阶段 2: codemod 批量迁移 821 处内联对 → `t('中文')` / `t('模板 {x}', {x})`（含 135 处模板串占位符化）—— 验证方式：`rg "t\(\{.*zh"` 计数归零 + `npm run test:unit`
- [ ] 阶段 3: 数据结构中的 `LocaleText` 字段迁移（`appNavigation.ts` label、`statusMessage.ts` title/detail、`messages.ts` 等）→ `string` / `MessageRef` —— 验证方式：`rg "LocaleText"` 归零 + 相关组件测试绿
- [ ] 阶段 4: dev2 17 处 warning 收编（`LocalizedUiText` → `MessageRef`），`asLocalizedUiText`/`uniqueLocalizedUiText` 按需删除或改 `{ literal }` —— 验证方式：planner warning 测试断言更新后绿
- [ ] 阶段 5: 129 处歧义译法钦定合并 + 删除 `affiliation-tag-labels.ts`（走管线）—— 验证方式：champions 相关测试绿，`rg "affiliation-tag-labels"` 归零
- [ ] 阶段 6: 删除旧 `t({zh,en})` 签名 + 弃用守护测试（`t({`/`pickLocaleText(locale, {`/`LocaleText`/`LocalizedUiText` 残留扫描断言）+ 字典完整性测试（key 唯一、value 非空）—— 验证方式：守护测试本身能拦住回潮
- [ ] 阶段 7: 全量回归 + 文档同步 —— 验证方式：`npm run test` + `npm run lint` + `npm run typecheck` + `npm run build`

## 验收

- `src/` 无残留 `t({ zh` / `pickLocaleText(locale, {` / `LocaleText` / `LocalizedUiText` 类型引用
- 全部 UI 文案译文集中在 `MESSAGES` 字典；同一 key 全局唯一译法
- 游戏数据 `LocalizedText`、tag 名表、数据源单语文本保持各自边界不变
- 全量测试 + lint + typecheck + build 通过

## 审查结论（2026-08-14）

- 已落地：中央字典、字面量 key 迁移、参数插值、`MessageRef.literal`、基础构建与单测验证。
- 未落地：`LocaleText` 与 `LocalizedUiText` 仍被生产代码使用，planner warning 仍是双语对象；这不是兼容性要求，而是阶段 4/6 尚未完成。
- 已补强：`i18n-messages.test.ts` 扫描生产源码中的字面量 `t()` 调用，阻止未登记 key 静默回退中文；规范已落到 `docs/specs/guidelines/i18n-messages.md`。
- 收口条件：完成 `MessageRef` 全链路迁移并删除旧类型/选择器后，重新运行残留扫描，再将本计划移入 `docs/archives/plans/`。

## 落地后

- specs/ 更新点：
  - `docs/specs/guidelines/i18n-messages.md`（新增）：国际化分层规范——中央字典书写约定（key=中文、占位符、Message/MessageRef）、「管线数据 vs 中央字典」判定规则、禁用内联双语对
  - `docs/specs/modules/planner/architecture.md`：warning 契约由 `{zh,en}` 改为 `MessageRef` 的说明（若该文档涉及 warning 结构）
  - `docs/specs/guidelines/ai-first-ts-tsx.md`：若含 i18n 书写示例，同步更新
  - `CONTEXT.md`：术语表更新（中央字典 / MessageRef / 管线数据边界）
- 本 change 状态 → 已落地 → 移 `archives/plans/`
- **specs/ 永不引用本计划**（规范描述最终态，不描述交付过程）

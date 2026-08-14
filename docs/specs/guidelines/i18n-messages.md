# 国际化文案规范

## 中央字典

静态 UI 文案使用 `src/app/i18n-messages.ts` 的 `MESSAGES`，调用 `useI18n().t('中文 key', params)`。中文 key 是稳定查找键，英文译文只在字典维护；带变量的文案使用 `{p0}`、`{p1}` 等占位符，不在组件内拼接双语句子。

中央字典的 `t()` 未命中时会回退 key。生产源码中的字面量 key 由 `src/app/i18n-messages.test.ts` 守护，新增文案必须同时登记字典，否则英文界面会错误显示中文。

该测试同时守护旧双语类型/helper 残留、字典 key 唯一性、译文非空和 key/译文占位符一致性。

## 数据边界

- 游戏数据的名称、描述和标签使用 `LocalizedText` 或领域专用标签字典，不复制到 UI 字典。
- 外部数据源返回的单语 warning 保持原文，在 UI 边界使用 `MessageRef.literal`；不要伪造另一种语言。
- 需要产品翻译的领域诊断应返回 `MessageRef`，由中央字典提供译文；禁止在领域层写 UI 双语对象。

## 禁止事项

- 不新增 `t({ zh, en })` 内联双语对。
- 不用 `pickText` 或 `pickLocaleText` 为静态 UI 文案绕过中央字典。
- 不把英雄、场景等运行时数据名称登记为静态 UI key。

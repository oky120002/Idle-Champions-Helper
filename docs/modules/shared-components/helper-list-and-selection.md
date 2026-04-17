# helper 清单与选择建议

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

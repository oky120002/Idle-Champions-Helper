# 英雄详情：交互要求与数据合同

- 日期：2026-04-13
- 目标：沉淀移动端要求、数据合同和详情页验收标准。

## 交互与移动端要求

- 长页面必须有稳定的 tab / hash 导航和清晰 section heading，优先解决“迷路”和“扫不动”两个问题。
- 结构化字段与原始 JSON 分开；命名升级与数值升级分开；标签、metadata、系统字段用统一视觉语法。
- 移动端允许单列排布和压缩导航，但不能隐藏升级 / 天赋 / 皮肤 / 原始字段；只保留摘要是不合格方案。
- 详情页只能在下方内容组件内部做局部左右布局；全站工作台壳层继续保持上下结构。
- `Skins` tab 只用于查看和预览，不提供下载按钮、下载文案或下载链接。
- 不做 `Links` tab，也不在运行时请求第三方站点。

## 数据合同

- 摘要与兜底 identity：`public/data/<version>/champions.json`
- 详情完整数据：`public/data/<version>/champion-details/<hero-id>.json`
- 归一化来源：`hero_defines`、`attack_defines`、`upgrade_defines`、`effect_defines`、`hero_feat_defines`、`hero_skin_defines`、`loot_defines`、`legendary_effect_defines`
- `loot`：由 `loot_defines.hero_id` 关联到英雄，并保留装备槽位、稀有度、名称、描述、效果与 Golden Epic 标记。
- `legendaryEffects`：由 `hero_defines.properties.legendary_effect_id` 关联 `legendary_effect_defines`，按数组顺序映射到槽位。

## 验收标准

- 任意英雄详情页都能展示完整结构化资料，页面末尾能展开原始 source / localized 快照片段。
- 能从筛选页结果卡一跳进入详情页，再一跳返回筛选页。
- 首屏能立即确认英雄身份和核心用途；长页面在桌面与移动端都保持可扫描。
- tab 不包含 `Links`，`Skins` tab 不提供下载能力。
- 继续保持 `HashRouter`、基于 `import.meta.env.BASE_URL` 的数据加载和零后端依赖。

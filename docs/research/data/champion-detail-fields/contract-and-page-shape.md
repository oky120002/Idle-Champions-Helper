# 英雄详情：数据合同与页面结构

- 日期：2026-04-13
- 目标：沉淀详情文件应如何组织、页面应该怎么分层，以及外部参考的使用边界。

## 推荐数据合同

`public/data/<version>/champion-details/<hero-id>.json` 建议拆成：

- 结构化层：英雄摘要、availability、角色卡、普攻 / 大招、事件升级、升级轨道、天赋、皮肤、关键系统字段
- 原始快照层：`hero`、`attacks`、`upgrades`、`feats`、`skins` 的 source / localized 快照片段；若升级已关联 `effect_defines`，也可补解析结果

这样能同时避免两种坏结果：只做漂亮摘要但细节缺失，或直接把大块 JSON 平铺到页面破坏可读性。

## 页面信息架构建议

详情页更适合做“战术档案页”，分成：顶部摘要、角色卡、战斗信息、进阶与成长、天赋与皮肤、系统字段与原始快照。原始快照应放在页面后半段，并通过折叠区块降低默认噪音。

## 外部参考的使用边界

用户给出的 Byteglow / Kleho 详情页可作为“高信息密度详情页”的方向参考。但当前环境无法稳定以浏览器方式复核其完整可视布局，所以本次结论主要来自官方 definitions 字段核对和用户需求，而不是声称“可完整复刻竞品页面”。

## 关键依据

- `public/data/v1/champions.json`
- `scripts/fetch-idle-champions-definitions.mjs`
- `scripts/normalize-idle-champions-definitions.mjs`
- 本次抓取的 source / localized definitions 快照
- 用户提供的参考链接

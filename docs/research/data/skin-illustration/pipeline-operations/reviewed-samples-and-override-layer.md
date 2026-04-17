# 当前离线渲染管线：样例复核与 override 层

- 日期：2026-04-16
- 目标：回答“哪些样例已复核”“人工覆盖应写在哪里”。

## 已复核样例

- 已复核皮肤：`332` Modron BBEG、`416` Plushie Evandra、`344` Venture Casual K'thriss、`417` Plushie Nixie、`297` Witchlight Nixie
- 已复核英雄本体：`124` Evandra、`125` BBEG、`38` K'thriss、`123` Nixie、`1` Bruenor
- 当前判断：`332` 与 `416` 已从明显错误修正为正常完整立绘；`344`、`417`、`297` 也能正常显示。默认规则已足以支撑全量构建，但仍必须保留人工覆盖能力，不应假设 `833` 张图天然都适配同一套默认规则。

## 人工覆盖层

- 最佳落点：`scripts/data/champion-illustration-overrides.json`、`scripts/data/champion-illustration-overrides.mjs` 与 `scripts/sync-idle-champions-illustrations.mjs` 的候选选择阶段
- 原因：`skelanim-renderer.mjs` 已支持 `preferredSequenceIndexes` 与 `preferredFrameIndexes`；覆盖层只需在调用渲染器前注入首选 `sequence / frame / slot`
- 键优先级：`skinId > graphicId > championId`；`championId` 只适合兜底
- 当前支持字段：`skinId`、`graphicId`、`championId`、`slot`、`preferredSequenceIndexes`、`preferredFrameIndexes`、`notes`
- 约束：`sequence / frame` 用 `0` 基索引；`slot` 是优先尝试，不是绝对强制；若目标候选不可解码，脚本仍会回退

当前不建议把人工覆盖写进 `scripts/data/skelanim-codec.mjs`、`scripts/data/skelanim-renderer.mjs` 或页面组件。

# 当前离线渲染管线：override、验证与风险

- 日期：2026-04-16
- 目标：回答“哪些样例已复核”“人工覆盖应写在哪里”“怎样验证当前管线”。

## 已复核样例

本轮至少复核了皮肤 `332` Modron BBEG、`416` Plushie Evandra、`344` Venture Casual K'thriss、`417` Plushie Nixie、`297` Witchlight Nixie，以及英雄本体 `124` Evandra、`125` BBEG、`38` K'thriss、`123` Nixie、`1` Bruenor。

当前结论：`332` 与 `416` 已从明显错误修正为正常完整立绘；`344`、`417`、`297` 也能正常显示；默认规则已足以支撑全量构建，但仍必须保留人工覆盖能力，因为这不代表 `833` 张图天然都适配同一套默认规则。

## 人工覆盖层

| 项目 | 当前结论 |
| --- | --- |
| 最佳落点 | `scripts/data/champion-illustration-overrides.json`、`scripts/data/champion-illustration-overrides.mjs`、`scripts/sync-idle-champions-illustrations.mjs` 的候选选择阶段 |
| 原因 | `skelanim-renderer.mjs` 已支持 `preferredSequenceIndexes` 与 `preferredFrameIndexes`；覆盖层只需在调用渲染器前注入首选 `sequence / frame / slot` |
| 键优先级 | `skinId > graphicId > championId`；`championId` 只适合兜底 |
| 当前支持字段 | `skinId`、`graphicId`、`championId`、`slot`、`preferredSequenceIndexes`、`preferredFrameIndexes`、`notes` |
| 约束 | `sequence / frame` 索引用 `0` 基；`slot` 是优先尝试，不是绝对强制；若目标候选不可解码，脚本仍会回退 |

当前不建议把人工覆盖写进：`scripts/data/skelanim-codec.mjs`、`scripts/data/skelanim-renderer.mjs` 或页面组件。

## 验证命令

### 单元测试

```bash
node --test scripts/data/skelanim.test.mjs scripts/sync-idle-champions-illustrations.test.mjs
```

### 组件测试

```bash
npm run test:component -- tests/component/illustrationsPage.test.tsx tests/component/championDetailPage.test.tsx
```

### 小范围样例渲染

```bash
node scripts/sync-idle-champions-illustrations.mjs   --input tmp/idle-champions-api/definitions-2026-04-16T03-48-29.427Z-latest-en.json   --visualsFile public/data/v1/champion-visuals.json   --outputDir tmp/render-validation   --currentVersion v1   --championIds 124,125   --skinIds 332,416   --concurrency 2
```

### 全量重建

```bash
node scripts/sync-idle-champions-illustrations.mjs   --input tmp/idle-champions-api/definitions-2026-04-16T03-48-29.427Z-latest-en.json   --visualsFile public/data/v1/champion-visuals.json   --outputDir public/data/v1   --currentVersion v1   --concurrency 6
```

## 当前剩余风险

- 默认 pose 规则本质上仍是工程规则，不是官方明文文档。
- 某些特殊皮肤若商店展示姿态不是 `sequence 0 / frame 0`，未来仍可能需要人工覆盖。
- 若官方后续调整 SkelAnim 导出格式、sequence 排列或 `export_params` 语义，仍需重新验证。

当前最稳妥的结论是：主链路已足够稳定；但必须继续保留按 `skinId / graphicId` 局部覆盖的空间。

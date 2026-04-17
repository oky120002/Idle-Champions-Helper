# 当前离线渲染管线：验证命令与剩余风险

- 日期：2026-04-16
- 目标：收纳复跑命令、全量重建入口与当前仍需留意的风险。

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

当前最稳妥的结论是：主链路已足够稳定，但必须继续保留按 `skinId / graphicId` 局部覆盖的空间。

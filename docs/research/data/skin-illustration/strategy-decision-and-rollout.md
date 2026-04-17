# 皮肤立绘路线：推荐结论与落地顺序

- 日期：2026-04-16
- 目标：给出路线对比、最终推荐、落地顺序和面向问题的直接回答。

## 正面对比

| 维度 | A：构建期预合成 | B：前端实时合成 |
| --- | --- | --- |
| 与当前 GitHub Pages 架构匹配度 | 很高 | 可做，但运行时更复杂 |
| 浏览器兼容性 | 最稳 | Canvas 方案可做，但要谨慎 |
| 跨浏览器一致性 | 最好 | 略弱 |
| 移动端首次打开压力 | 最低 | 更高 |
| 详情弹窗单张按需显示 | 足够 | 可行 |
| 列表页 / 缩略图墙 | 更优 | 明显吃亏 |
| 扩展到动态 pose / 动画 | 需再补元数据链路 | 更灵活 |
| 调试与回归稳定性 | 更好 | 更差 |
| 当前项目推荐度 | 高 | 中 |

## 推荐方案

- 生产主链路：选 A，把复杂度放构建机，不放用户浏览器。
- B 的定位：二阶段增强，不替代 A；最合理的用法是详情弹窗里的高清模式、姿态切换或简单动态效果。
- 更准确的策略不是“A 或 B 二选一”，而是“A 默认交付，B 局部增强”。

## 落地顺序

1. 先把正确的静态图做出来：扩展 `scripts/sync-idle-champions-illustrations.mjs`，输出 `thumb`、`display` 与 `renderSequence / renderFrame / renderBounds / sourceGraphic`。
2. 再保留前端增强入口：必要时额外产出 `runtime/<id>.json` 与 `runtime/<id>-atlas-0.png`，但页面默认仍显示预合成图。
3. 如果一定要做前端合成，至少遵守这些底线：只依赖 `HTMLCanvasElement + CanvasRenderingContext2D`；`OffscreenCanvas`、`createImageBitmap()` 仅做可选优化；不在浏览器里解析原始 SkelAnim 二进制；一次只合成当前打开的一张图；缩略图仍用构建期产物；移动端按 DPR 或容器尺寸降档；失败时随时回退静态图。

## 直接回答

- “后端能否合并这些骨骼 / 分件资源？”：能；在当前项目里，这个“后端”就是构建期 Node 管线，也是最合理的主方案。
- “能否保持后端分片资源，让前端拿到后再合成？”：能，但后端不能只给分片图片，还必须给 piece / frame metadata；否则前端无法可靠组装。
- “哪条路线更好？”：当前项目下，生产主路线选构建期预合成；前端实时合成只做增强。

## 依据

- 仓库内：`docs/research/data/skin-illustration-assembly-research.md`、`docs/research/data/skin-illustration-render-pipeline-research.md`、`docs/research/deployment/static-hosting-research.md`、`docs/modules/champions/champion-illustration-page-design.md`、`scripts/sync-idle-champions-illustrations.mjs`、`public/data/v1/champion-illustrations.json`
- 浏览器兼容性：MDN `CanvasRenderingContext2D.drawImage()`、`HTMLImageElement.decode()`、`HTMLCanvasElement.toBlob()`、`Window.createImageBitmap()`、`OffscreenCanvas`、`Compression Streams API / DecompressionStream`

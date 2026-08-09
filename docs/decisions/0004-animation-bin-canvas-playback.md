# 0004. 动画播放：构建期发布原始 .bin + 运行时 canvas 解码

**状态**: Accepted
**决策日期**: 2026-07-27

## 背景

详情弹层需按需播放英雄 / 皮肤动画。静态立绘的来源与构建期衍生图策略已由 `decisions/0001-illustration-static-over-remote.md` 确定；本决策只回答「动态动画以什么形态交付给浏览器」。约束：GitHub Pages 静态站、零预算、`local-first`、站点 `<= 1 GB`。依据见 `research/data/skin-illustration/`。

## 决策

构建期发布官方原始 `SkelAnim` 二进制包（`.bin`）+ 小 manifest（`public/data/v1/champion-animations.json`，只含 `championId / skinId / sourceGraphicId / asset.{path,bytes} / defaultSequenceIndex / defaultFrameIndex / fps / sequences[].frameCount,pieceCount,firstRenderableFrameIndex,bounds`），不导出完整逐帧 JSON；运行时浏览器解压解码（优先 `DecompressionStream`，回退 `fflate`）后用 `canvas` 播放，失败或缺失自动回退静态 PNG。

## 后果

- 正面：体积最省（只存官方原始资源，无成品动图、无逐帧 JSON）；与官方资源一致、复用率高；兼容 GitHub Pages / `local-first` / 零预算；保留静态 PNG 回退保证可用性。
- 代价：前端需维护浏览器侧解码器与 `canvas` 播放器（`src/features/skelanim-player/`）；极端旧环境（无 `DecompressionStream` 且 `fflate` 失败）只能拿到静态图。
- 风险：增量复用依赖 definitions 的 `sourceGraphicId / sourceGraphic / sourceVersion / sourceSlot`；上游在这些字段不变的情况下静默替换文件内容，本地不会自动重下。

## 替代方案

- **方案 A：预渲染 GIF / APNG / WebM**：不选——体积膨胀最快、透明边缘与清晰度更差、不利暂停 / 降速 / 动作切换、改默认动作要重导一批成品。
- **方案 B：完整 JSON + atlas PNG（kleho 形态）**：不选——逐帧 JSON 体积过大、atlas 重复存储、全量铺开浪费容量，不适合全站长期主线。

## 关联

- 依据：`research/data/skin-illustration/implementation.md`、`research/data/skin-illustration/pipeline.md`、`research/data/skin-illustration/runtime-format.md`
- 落地：`specs/modules/champions/illustration/runtime.md`、`specs/modules/champions/illustration/data-and-build.md`
- 上游决策：`decisions/0001-illustration-static-over-remote.md`（静态衍生图来源）

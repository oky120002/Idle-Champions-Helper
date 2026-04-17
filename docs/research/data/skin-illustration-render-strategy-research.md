# Idle Champions 皮肤立绘渲染路线评估

- 调研日期：2026-04-16
- 状态：基于仓库现状、SkelAnim 调研、样例资源、GitHub Pages 约束与浏览器 API 兼容性核对，当前仍有效。
- 目标：比较两条路线的可行性、风险和更适合当前项目的主路线。
- 配套文档：为什么会碎见 `docs/research/data/skin-illustration-assembly-research.md`；当前仓库已落地的离线链路见 `docs/research/data/skin-illustration-render-pipeline-research.md`。

## 结论

- “后端能做”在当前项目里更准确的说法是：构建期 Node 数据管线能做，不需要长期在线服务。
- 前端也能做，但前提是构建期先把原始 SkelAnim 转成浏览器可直接消费的 atlas + metadata。
- 当前项目若只选一条生产主路线，应选“构建期预合成最终立绘”。
- 前端实时合成更适合二阶段增强：姿态切换、单图高清、简单动画或调试工具，而不是首发主链路。
- “浏览器直接解压并解析原始 SkelAnim 二进制”不应作为生产方案。

## 当前硬约束

- 正式发布固定为 `GitHub Pages + GitHub Actions`。
- 项目保持零在线后端、零额外付费基础设施。
- 公共数据以构建期静态产物发布为主。
- 终端覆盖桌面、移动端和平板。
- 当前用户目标是“皮肤立绘弹窗稳定显示正确成图”，不是优先做动画播放器。

因此：如果“后端”指在线 API 服务，它与当前约束冲突；如果“后端”指构建期脚本与 CI，它完全符合当前项目边界。

## 两条路线

| 路线 | 核心流程 | 页面最终拿到什么 |
| --- | --- | --- |
| A：构建期预合成最终立绘 | 读取 `Characters/...` 的 SkelAnim 二进制 -> 解析 atlas、piece、frame、pivot、rotation、scale、position、depth -> 选择展示用 `sequence + frame` -> 在 Node 侧离线合成为完整立绘 -> 裁透明边并输出 `display / thumb` | 已组装图片 + 审计元数据；前端不再理解 atlas、piece 或 frame |
| B：前端实时合成 | 构建期先发布 atlas PNG / WebP、规范化 metadata 和默认 `sequence + frame`；浏览器只做 Canvas 绘制 | atlas + metadata + 前端合成结果 |

不推荐的变体是：让浏览器自己做 zlib 解压、二进制协议解析、atlas / frame 生成再实时绘制。

## 可行性与代价

### A：构建期预合成

- 已有调研已证明 SkelAnim 可解析，piece / frame / pivot / depth 数据真实存在。
- 仓库本来就依赖构建期脚本同步官方数据；把 `scripts/sync-idle-champions-illustrations.mjs` 从“下载 -> 解包 atlas”升级为“下载 -> 解析 -> 合成 -> 输出最终图”即可成立。
- 建议输出两层页面产物，例如 `champion-illustrations` 下的 `thumbs/`、`display/` 目录；调试元数据保留在 `champion-illustrations.json` 的 `sourceGraphic / renderSequence / renderFrame / bounds / sourceVersion`。
- 当前展示单元是 `833` 张：`161` 个英雄本体 + `672` 个皮肤；构建成本发生在离线阶段，不在每个终端重复支付。
- 已核到的资源复杂度样例：`Hero_Evandra_Plushie_2xup` 单序列 `28` 个 piece，`Hero_BBEG_Modron_2xup` `56` 个，`Hero_Evelyn_Spelljammer` 某些序列 `173` 个；这进一步说明重活更该放构建侧。

优点：浏览器最轻、跨浏览器一致性最好、列表页和图鉴页更稳。代价：需要补 Node 渲染器、构建时间会上升、仍要解决 `sequence / frame` 选择；以后若要做动画，还需额外暴露 atlas + metadata。

### B：前端实时合成

前端路线成立的前提是构建期至少发布：atlas、piece UV / 尺寸 / pivot、默认 `sequence / frame`、以及该 frame 下每个 piece 的 `depth / x / y / scaleX / scaleY / rotation`。只给当前 atlas PNG 不够。

若只做“浏览器绘制、不解析原始二进制”，依赖的 API 仍是基础能力：`CanvasRenderingContext2D.drawImage()`、`HTMLImageElement.decode()`、`HTMLCanvasElement.toBlob()`；`createImageBitmap()` 与 `OffscreenCanvas` 只应作为可选优化，不该是硬依赖。

优点：更适合以后做姿态切换、局部显隐、简单动画，单张详情弹窗按需渲染也可接受。主要风险：

- 跨浏览器一致性弱于预合成：抗锯齿、亚像素取整、浮点变换、缩放插值都会带来细微差异。
- 移动端首次打开峰值更高：已见 `2048 x 2048` atlas，且单序列可到 `173` 个 piece；首次打开会集中发生 atlas 解码、高 DPR canvas 创建和多次 `transform / drawImage`。
- “保留分片资源”不等于更省流量：当前错误 atlas 式 PNG 产物目录 `public/data/v1/champion-illustrations/` 已约 `125 MB`，还没算运行时 metadata 与缓存图。
- 列表页 / 缩略图墙不划算；缓存策略也会更复杂。
- 不能把“原始二进制解压 + 解析”也压到浏览器：当前这条链路会依赖 `DecompressionStream`；Compression Streams API 的 Baseline 时间是 2023 年 5 月，把它当主依赖会明显抬高兼容性与调试风险。

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

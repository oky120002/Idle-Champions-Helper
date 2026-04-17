# 皮肤立绘路线：约束、两条方案与代价

- 日期：2026-04-16
- 目标：回答“当前有哪些硬约束”“构建期预合成和前端实时合成分别需要什么前提”。

## 当前硬约束

- 正式发布固定为 `GitHub Pages + GitHub Actions`。
- 项目保持零在线后端、零额外付费基础设施。
- 公共数据以构建期静态产物发布为主。
- 终端覆盖桌面、移动端和平板。
- 当前用户目标是“皮肤立绘弹窗稳定显示正确成图”，不是优先做动画播放器。

因此：如果“后端”指在线 API 服务，它与当前约束冲突；如果“后端”指构建期脚本与 CI，它完全符合项目边界。

## 两条路线

| 路线 | 核心流程 | 页面最终拿到什么 |
| --- | --- | --- |
| A：构建期预合成最终立绘 | 读取 `Characters/...` 的 SkelAnim 二进制 -> 解析 atlas、piece、frame、pivot、rotation、scale、position、depth -> 选择 `sequence + frame` -> Node 侧离线合成 -> 裁透明边并输出 `display / thumb` | 已组装图片 + 审计元数据 |
| B：前端实时合成 | 构建期先发布 atlas PNG / WebP、规范化 metadata 和默认 `sequence + frame`；浏览器只做 Canvas 绘制 | atlas + metadata + 前端合成结果 |

不推荐的变体是：让浏览器自己做 zlib 解压、二进制协议解析、atlas / frame 生成再实时绘制。

## A：构建期预合成的可行性与代价

- 已有调研已证明 SkelAnim 可解析，piece / frame / pivot / depth 数据真实存在。
- 仓库本来就依赖构建期脚本同步官方数据；把 `scripts/sync-idle-champions-illustrations.mjs` 从“下载 -> 解包 atlas”升级为“下载 -> 解析 -> 合成 -> 输出最终图”即可成立。
- 当前展示单元是 `833` 张：`161` 个英雄本体 + `672` 个皮肤；构建成本发生在离线阶段，不在每个终端重复支付。
- 已核到的复杂度样例：`Hero_Evandra_Plushie_2xup` 单序列 `28` 个 piece，`Hero_BBEG_Modron_2xup` `56` 个，`Hero_Evelyn_Spelljammer` 某些序列 `173` 个；这说明重活更该放构建侧。

优点：浏览器最轻、跨浏览器一致性最好、列表页和图鉴页更稳。代价：需要补 Node 渲染器、构建时间会上升、仍要解决 `sequence / frame` 选择；以后若要做动画，还需额外暴露 atlas + metadata。

## B：前端实时合成的前提与风险

前端路线成立的前提是构建期至少发布：atlas、piece UV / 尺寸 / pivot、默认 `sequence / frame`、以及该 frame 下每个 piece 的 `depth / x / y / scaleX / scaleY / rotation`。只给当前 atlas PNG 不够。

若只做“浏览器绘制、不解析原始二进制”，依赖的 API 仍是基础能力：`CanvasRenderingContext2D.drawImage()`、`HTMLImageElement.decode()`、`HTMLCanvasElement.toBlob()`；`createImageBitmap()` 与 `OffscreenCanvas` 只应作为可选优化，不该是硬依赖。

主要风险：

- 跨浏览器一致性弱于预合成；抗锯齿、亚像素取整、浮点变换、缩放插值都会带来细微差异。
- 移动端首次打开峰值更高：已见 `2048 x 2048` atlas，且单序列可到 `173` 个 piece`。
- “保留分片资源”不等于更省流量：当前 atlas 式 PNG 产物目录 `public/data/v1/champion-illustrations/` 已约 `125 MB`，还没算运行时 metadata 与缓存图。
- 不能把“原始二进制解压 + 解析”也压到浏览器：当前这条链路会依赖 `DecompressionStream`，会明显抬高兼容性与调试风险。

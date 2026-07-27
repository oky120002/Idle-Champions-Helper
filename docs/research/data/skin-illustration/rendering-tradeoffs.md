# 皮肤立绘：渲染路线技术代价

- 作用：核实构建期预合成与浏览器实时合成的技术前提、成本和风险。

## 硬约束

- 正式发布固定为 `GitHub Pages + GitHub Actions`
- 项目保持零在线后端、零额外付费基础设施
- 公共数据以构建期静态产物发布为主
- 终端覆盖桌面、移动端和平板
- 当前用户目标是“皮肤立绘弹窗稳定显示正确成图”，不是优先做动画播放器

因此：如果“后端”指在线 API 服务，它与当前约束冲突；如果“后端”指构建期脚本与 CI，它完全符合项目边界。

## 两条路线

- A：构建期预合成最终立绘。流程是读取 `Characters/...` SkelAnim 二进制 -> 解析 atlas、piece、frame、pivot、rotation、scale、position、depth -> 选择 `sequence + frame` -> Node 侧离线合成 -> 裁透明边并输出 `display / thumb`；页面最终拿到的是已组装图片 + 审计元数据。
- B：前端实时合成。流程是构建期先发布 atlas PNG / WebP、规范化 metadata 和默认 `sequence + frame`；浏览器再做 Canvas 绘制；页面最终拿到的是 atlas + metadata + 前端合成结果。
- 不推荐的变体是让浏览器自己做 zlib 解压、二进制协议解析、atlas / frame 生成再实时绘制。

### A：构建期预合成的可行性与代价

- 已有调研已证明 SkelAnim 可解析，piece / frame / pivot / depth 数据真实存在。
- 仓库本来就依赖构建期脚本同步官方数据；把 `scripts/sync-idle-champions-illustrations.ts` 从“下载 -> 解包 atlas”升级为“下载 -> 解析 -> 合成 -> 输出最终图”即可成立。
- 当前展示清单是 `877` 项：`164` 个英雄本体 + `713` 个皮肤；构建成本发生在离线阶段，不在每个终端重复支付。
- 已核到的复杂度样例：`Hero_Evandra_Plushie_2xup` 单序列 `28` 个 piece，`Hero_BBEG_Modron_2xup` `56` 个，`Hero_Evelyn_Spelljammer` 某些序列 `173` 个；这说明重活更该放构建侧。

### B：前端实时合成的前提与风险

- 构建期至少要发布 atlas、piece UV / 尺寸 / pivot、默认 `sequence / frame`，以及该 frame 下每个 piece 的 `depth / x / y / scaleX / scaleY / rotation`；只给当前 atlas PNG 不够。
- 若只做“浏览器绘制、不解析原始二进制”，依赖的 API 仍是 `CanvasRenderingContext2D.drawImage()`、`HTMLImageElement.decode()`、`HTMLCanvasElement.toBlob()`；`createImageBitmap()` 与 `OffscreenCanvas` 只应作为可选优化，不该是硬依赖。
- 主要风险：跨浏览器一致性弱于预合成；移动端首次打开峰值更高；当前 atlas 式 PNG 目录 `public/data/v1/champion-illustrations/` 已约 `125 MB`，还没算运行时 metadata 与缓存图；若把原始二进制解压也压到浏览器，还会引入 `DecompressionStream` 兼容性与调试成本。

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

## 依据

- 仓库内：`scripts/sync-idle-champions-illustrations.ts`、`public/data/v1/champion-illustrations.json`
- 浏览器能力：MDN Canvas 2D、Image decode、toBlob、ImageBitmap、OffscreenCanvas 与 Compression Streams 文档

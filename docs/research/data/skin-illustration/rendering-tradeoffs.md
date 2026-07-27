# SkelAnim：预渲染与浏览器绘制的技术边界

- 作用：核实默认帧 PNG 与浏览器 canvas 绘制各自需要的输入、成本和风险。当前项目资源合同见 `specs/modules/champions/illustration/`，交付决策见 `decisions/0001-illustration-static-over-remote.md` 与 `decisions/0004-animation-bin-canvas-playback.md`。

## 两种消费形式

- **预渲染 PNG**：构建期读取 `Characters/...` 的 SkelAnim 二进制，解析 atlas、piece、frame、pivot、rotation、scale、position 与 depth，选择 `sequence + frame` 后合成为图片。页面只读取已组装图。
- **浏览器 canvas 绘制**：浏览器取得可解码的动画资源及 frame 变换数据，按 piece 的 `depth / x / y / scaleX / scaleY / rotation` 绘制画布。仅有 atlas PNG 不足以复原姿态。
- 当前站内资源同时支持两种消费：默认帧 PNG 用于稳定展示，本地 `.bin` 用于按需动画播放。

## 已核实的复杂度与成本

- SkelAnim 资源真实包含 piece / frame / pivot / depth 数据；样例 `Hero_Evandra_Plushie_2xup` 单序列有 `28` 个 piece，`Hero_BBEG_Modron_2xup` 有 `56` 个，`Hero_Evelyn_Spelljammer` 的部分序列有 `173` 个。
- 预渲染把解析和合成成本放在构建期；浏览器展示只需加载图片。
- canvas 绘制把解码、解析和绘制成本留在用户终端，适合按需播放，但需控制移动端首开峰值与并发资源加载。
- `CanvasRenderingContext2D.drawImage()`、`HTMLImageElement.decode()` 与 `HTMLCanvasElement.toBlob()` 是基础能力；`createImageBitmap()` 与 `OffscreenCanvas` 只影响优化路径。二进制解压还受 `DecompressionStream` 与回退实现的兼容性影响。

## 可复核结论

| 维度 | 默认帧 PNG | 本地 SkelAnim + canvas |
| --- | --- | --- |
| 页面输入 | 已组装图片 | `.bin`、manifest 与 frame 数据 |
| 首次运行成本 | 图片解码 | 二进制解码、解析和 canvas 绘制 |
| 列表展示 | 可直接懒加载 | 需限制预览数量和加载时机 |
| 动态 pose | 需要额外预渲染图 | 可按 frame 切换 |
| 主要风险 | 资源体积、重新生成成本 | 绘制一致性、移动端开销、解码兼容性 |

完整的当前主链路与容量数据见 `pipeline.md`；上游资源格式依据见 `runtime-format.md`。

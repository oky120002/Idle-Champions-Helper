# Idle Champions 皮肤立绘渲染路线评估

- 调研日期：2026-04-16
- 当前状态：当前结论基于仓库现状、既有 SkelAnim 调研、样例资源结构、GitHub Pages 约束与浏览器 API 兼容性核对得出，现阶段仍有效。
- 调研目标：深入评估两条路线是否可行、各自风险是什么，并判断当前项目更适合哪条主路线：
  1. 构建期 / 后端侧把骨骼分件资源直接合成为最终立绘；
  2. 保留分片资源，由前端在浏览器端实时合成显示。

---

## 1. 先说结论

- **后端能做。** 但按当前仓库约束，更准确地说是“构建期 Node 数据管线能做”，不需要新增长期在线后端服务。
- **前端也能做，但前提是后端 / 构建期先把 SkelAnim 资源解码成浏览器可直接消费的 atlas + metadata。**
- **如果只允许选一条主路线，当前项目应优先选“构建期预合成最终立绘”作为生产主链路。**
- 前端实时合成更适合作为：
  - 后续增强能力；
  - 需要动态切 frame / 播放 idle pose / 做局部开关件时的补充方案；
  - 或仅在详情弹窗这种“单次只看一张图”的场景里按需启用。
- 对当前项目而言，“纯前端解析原始 SkelAnim 二进制并实时合成”不应作为主路线；兼容性、调试成本和跨浏览器一致性都不够稳。

---

## 2. 当前项目的硬约束

这次评估不是抽象讨论，而是必须落到当前仓库事实上：

- 正式发布路线固定为 `GitHub Pages + GitHub Actions`
- 项目默认零后端、零额外付费基础设施
- 公共数据以构建期静态产物发布为主
- 终端覆盖要考虑桌面浏览器、移动端与平板
- 用户当前诉求是“皮肤立绘弹窗稳定显示正确的组装结果”，不是“优先做动画播放器”

相关仓库文档：

- `docs/research/deployment/static-hosting-research.md`
- `docs/modules/champions/champion-illustration-page-design.md`
- `docs/research/data/skin-illustration-assembly-research.md`

这意味着：

- 如果“后端”指长期在线 API 服务，那么它与当前架构约束冲突；
- 如果“后端”指数据构建期 Node 脚本与 GitHub Actions 构建阶段，那么它完全符合当前项目约束。

---

## 3. 两条路线到底是什么

### 3.1 路线 A：构建期 / 后端预合成最终立绘

流程：

1. 构建脚本读取 `Characters/...` 对应的 SkelAnim 二进制；
2. 解析 atlas、piece、frame、depth、pivot、rotation、scale、position；
3. 选择一个用于展示的 `sequence + frame`；
4. 在 Node 侧离线合成为完整立绘；
5. 裁透明边，输出 `display.webp / thumb.webp`；
6. 页面运行时只显示最终静态图片。

页面实际拿到的是：

- 已完成组装的图片；
- 可选的审计元数据；
- 不需要再理解 piece、frame、atlas。

### 3.2 路线 B：后端保留分片资源，前端实时合成

这里其实有两个子变体：

#### B1. 推荐的“前端合成”定义

构建期先把原始 SkelAnim 转成浏览器友好的发布格式，再交给前端：

- atlas PNG / WebP
- 规范化 metadata JSON
- 选定好的默认 `sequence + frame`

然后浏览器用 Canvas 2D 把 piece 绘回去。

#### B2. 不推荐的“纯前端解析原始二进制”

浏览器直接拿原始 SkelAnim 二进制：

- 前端自己做 zlib 解压
- 自己解析二进制协议
- 自己生成 atlas / piece / frame 数据
- 再实时绘制

这个变体虽然理论上可做，但不该作为生产主方案。

后文提到“前端合成路线”，默认指 **B1**；B2 只作为风险对照。

---

## 4. 后端预合成路线能不能做

### 4.1 能，而且和当前架构最匹配

已有调研已经证明：

- 原始 SkelAnim 数据可解析；
- piece / frame / pivot / depth 数据真实存在；
- 当前站点本来就依赖构建期脚本同步官方数据。

所以只要把现有的：

- `scripts/sync-idle-champions-illustrations.mjs`

从“下载后直接写 atlas PNG”升级为“下载 -> 解析 -> 合成 -> 输出最终图”，这条链路就成立。

### 4.2 后端预合成的最小落地模型

建议输出两层产物：

1. 页面主消费产物
   - `public/data/v1/champion-illustrations/thumbs/...`
   - `public/data/v1/champion-illustrations/display/...`
2. 调试 / 追溯产物
   - `champion-illustrations.json` 中记录 `sourceGraphic / renderSequence / renderFrame / bounds / sourceVersion`

核心渲染流程大致是：

1. 读取 atlas 与 metadata
2. 选定默认 frame
3. 过滤当前 frame 不可见 piece
4. 按 `depth` 排序
5. 对每个 piece：
   - 从 atlas 裁切 `sx / sy / sw / sh`
   - 以 `centerX / centerY` 为 pivot
   - 应用 `translate + rotate + scale`
   - 绘制到离屏画布
6. 计算真实边界并裁切
7. 输出页面图

### 4.3 构建资源消耗是可控的

当前仓库已有 `833` 个展示单元：

- `161` 个英雄本体
- `672` 个皮肤

但构建期只做一次，不是在每个用户设备上重复做。

已核到的样例复杂度：

- `Hero_Evandra_Plushie_2xup`：单序列 `28` 个 piece
- `Hero_BBEG_Modron_2xup`：单序列 `56` 个 piece
- `Hero_Evelyn_Spelljammer`：某些序列高达 `173` 个 piece

这说明：

- 运行时逐张做确实有成本；
- 但构建期批量做完全合理，因为总代价是可预测的一次性离线成本。

### 4.4 这条路线的主要优点

- 对浏览器最友好：页面只显示普通图片
- 结果最一致：Chrome / Safari / Firefox / iPad / Android 不会因为实时合成产生细微差异
- 页面逻辑最简单：不需要额外 Canvas 合成状态机
- SEO、截图、自动化测试、回归核对都更稳定
- 更适合后续立绘列表页、搜索页、筛选页一次展示大量缩略图

### 4.5 这条路线的主要代价

- 需要补一套 Node 侧渲染器
- 构建时间会上升
- 调试“选哪个 sequence / frame 最像游戏内主立绘”需要一些样例回归
- 若后续想做“动态播放 pose / 动画”，还得重新暴露 atlas + metadata

---

## 5. 前端实时合成路线能不能做

### 5.1 能，但前提是先做规范化中间产物

前端路线成立的前提不是“直接拿当前 atlas PNG 就能画”，而是后端 / 构建期至少还要额外发布：

- atlas 图片
- piece UV / width / height / center
- 默认展示 sequence / frame
- 该 frame 下每个 piece 的 `depth / x / y / scaleX / scaleY / rotation`

换句话说：

- **只保留当前的分片 PNG，不够。**
- 还必须把“如何拼”这份 metadata 一起发布。

建议的浏览器消费合同大致形态如下：

```ts
type IllustrationRuntimeManifest = {
  version: string
  atlas: Array<{
    path: string
    width: number
    height: number
  }>
  render: {
    sequence: number
    frame: number
    canvasWidth: number
    canvasHeight: number
    bounds: { left: number; top: number; right: number; bottom: number }
  }
  pieces: Array<{
    depth: number
    textureId: number
    source: { x: number; y: number; width: number; height: number }
    pivot: { x: number; y: number }
    transform: {
      x: number
      y: number
      scaleX: number
      scaleY: number
      rotationRad: number
    }
  }>
}
```

### 5.2 浏览器 API 层面可行

如果采用 B1 这种“前端只做绘制，不做原始二进制解析”的方式，那么浏览器依赖的核心能力其实很基础：

- `CanvasRenderingContext2D.drawImage()`：MDN 标注为 Baseline，跨浏览器广泛可用，基线时间为 2015 年 7 月
- `HTMLImageElement.decode()`：MDN 标注为 Baseline，基线时间为 2020 年 1 月
- `HTMLCanvasElement.toBlob()`：MDN 标注为 Baseline，基线时间为 2020 年 1 月

也就是说，**前端合成如果只依赖 `<canvas>` 2D、`<img>` 解码和普通图片资源，本身没有明显兼容性硬伤。**

可选优化能力：

- `createImageBitmap()`：MDN 标注为 Baseline，自 2021 年 9 月起广泛可用
- `OffscreenCanvas`：MDN 标注为 Baseline，自 2023 年 3 月起广泛可用

但这些优化能力不该成为主依赖，只能作为“有就加速，没有就回退”的增强。

### 5.3 前端实时合成的实际优点

- 可以保留更多原始表达能力，后续做 pose 切换、部件显隐、简单动画更方便
- 详情弹窗一次只看一张图时，按需渲染的峰值计算量是可接受的
- 对高分屏可以按容器大小或 DPR 自适应输出，更灵活
- 同一份 atlas + metadata 未来可复用到更多玩法，而不是只服务静态图片

### 5.4 前端实时合成的主要风险

#### 风险 1：跨浏览器视觉一致性不如预合成

即便都用 Canvas 2D：

- 不同浏览器的抗锯齿策略
- 亚像素取整
- 浮点变换细节
- 图片缩放插值

仍可能带来边缘细小差异。

对“能看”来说通常不是大问题，但对“稳定一致”“方便做视觉回归”来说，明显弱于预合成。

#### 风险 2：移动端首次打开弹窗的 CPU / 内存峰值更高

当前样例里已见到：

- atlas 纹理有 `2048 x 2048`
- 某些 sequence 有 `173` 个 piece

如果在手机或平板上：

- 同时解码 atlas
- 创建高 DPR canvas
- 逐 piece 做多次 `save / transform / drawImage / restore`

首次打开弹窗的瞬时压力会显著高于直接显示一张现成图。

这并不代表一定卡，但它把风险放到了用户设备和浏览器现场，而不是构建机。

#### 风险 3：分片资源体积本身并不天然更省

当前仓库里，现有错误产物目录：

- `public/data/v1/champion-illustrations/`

总量已经约 `125 MB`，对应 `833` 个展示单元，而且这还只是 atlas 式 PNG 输出，并未额外附带运行时 metadata、缓存图或多档衍生图。

这说明：

- “保留分片资源”不等于“发布体积自然更小”
- 如果前端路线继续直接暴露 atlas 级资源，页面侧很可能仍然要面对较重的网络载荷
- 真正能控制流量的关键不是“是否前端合成”，而是“是否按场景做缩略图、展示图、懒加载和缓存分层”

#### 风险 4：列表页与批量缩略图场景不划算

如果后续不只是详情弹窗，而是立绘总览、皮肤图鉴、筛选墙：

- 预合成路线只需要加载缩略图；
- 前端实时合成路线要么现场算很多次，要么仍然得额外生成缩略图缓存。

一旦需要“同页多张图”，前端合成的优势会快速下降。

#### 风险 5：缓存策略更复杂

前端如果实时合成，就要再解决：

- atlas 图片缓存
- metadata 缓存
- 合成结果缓存
- 切换皮肤时是否复用 Blob URL / ImageBitmap
- 内存回收与对象 URL 清理

否则很容易出现：

- 首次打开慢
- 多次切换抖动
- 移动端内存涨得快

#### 风险 6：前端仍然不能直接沿用“原始二进制解析”路线

当前仓库浏览器侧对远端 zlib 资源的处理依赖：

- `DecompressionStream`

而 MDN 虽已把 Compression Streams API 标成 Baseline、可广泛使用，但基线时间是 **2023 年 5 月**；如果把“原始二进制解压 + 解析”也压到浏览器里，就会把兼容性风险和调试复杂度一起抬高。

因此：

- 前端可以做“绘制”
- 不应把“原始 SkelAnim 解压 + 二进制协议解析”也作为主链路放进浏览器

---

## 6. 两条路线的正面对比

| 维度 | 路线 A：构建期预合成 | 路线 B：前端实时合成 |
| --- | --- | --- |
| 是否符合当前 GitHub Pages 架构 | 非常符合 | 符合，但要增加运行时复杂度 |
| 浏览器兼容性 | 最稳 | 取决于实现；Canvas 方案可做，但要谨慎 |
| 跨浏览器一致性 | 最好 | 略弱 |
| 移动端首次打开压力 | 最低 | 更高 |
| 详情弹窗单张按需显示 | 够用 | 可行 |
| 列表页 / 缩略图墙 | 更优 | 明显吃亏 |
| 后续扩展为动态 pose / 动画 | 需要补元数据链路 | 更灵活 |
| 调试复杂度 | 集中在构建侧 | 分散到浏览器现场 |
| 回归测试稳定性 | 更好 | 更差 |
| 当前项目推荐度 | **高** | **中** |

---

## 7. 我的推荐

### 7.1 生产主链路推荐

**主路线选 A：构建期预合成最终立绘。**

原因很直接：

- 当前项目没有运行时后端；
- 终端覆盖广；
- 移动端和平板也要稳定；
- 当前核心目标只是“正确显示皮肤立绘”，不是“在浏览器里重建动画系统”。

在这种前提下，把复杂度压到构建机，而不是压到用户浏览器，是更稳的工程决策。

### 7.2 前端合成路线的建议定位

**把 B 作为二阶段增强，不作为首发主链路。**

最合理的定位是：

- 详情弹窗未来如果要支持更高分辨率、姿态切换或简单动态效果，再增补 atlas + metadata 的前端合成能力；
- 但列表页、图鉴页、筛选结果页仍然优先使用构建期生成的缩略图 / 展示图。

换句话说，更推荐的不是 “A 或 B 二选一”，而是：

- **A 作为默认交付**
- **B 作为局部增强**

---

## 8. 更细的落地建议

### 8.1 第一阶段：先把正确的静态图做出来

建议先完成：

1. 扩展 `scripts/sync-idle-champions-illustrations.mjs`
2. 构建期输出：
   - `thumb.webp`
   - `display.webp`
3. 在 `champion-illustrations.json` 里记录：
   - `renderSequence`
   - `renderFrame`
   - `renderBounds`
   - `sourceGraphic`

这一步完成后，当前弹窗问题就能稳定解决。

### 8.2 第二阶段：保留前端增强入口，但不默认启用

如果后面要给前端合成留门，可以同步额外产出：

- `runtime/<id>.json`
- `runtime/<id>-atlas-0.png`

但页面默认仍然显示预合成图片。

只有在以下场景才切到前端合成：

- 用户打开“高清模式”
- 用户切换 pose
- 用户需要播放 idle 动画
- 某些皮肤需要用前端 route 做交互实验

### 8.3 如果一定要做前端合成，建议的技术底线

若后续真的要上浏览器实时合成，建议遵守这几个底线：

1. 核心依赖只用 `HTMLCanvasElement + CanvasRenderingContext2D`
2. `OffscreenCanvas` 和 `createImageBitmap()` 只做可选优化
3. 不在浏览器里解析原始 SkelAnim 二进制
4. 单次只合成当前打开的一张图
5. 缩略图仍使用构建期产物
6. 对移动端设置像素上限，必要时按 DPR 或容器尺寸降档
7. 对失败场景准备静态图回退

这样才能把前端路线控制在“可管理”的范围内。

---

## 9. 对你这轮问题的直接回答

### 9.1 “合并这些骨骼/分件动画资源后端能否做？”

能。

如果这里的“后端”指当前项目可接受的构建期 Node 数据管线，那么它不仅能做，而且是当前最合理的主方案。

### 9.2 “能否保持目前的后端的分片资源，让前端拿到后，进行合成显示？”

能，但前提是后端不能只给“分片图片”，还必须把可直接消费的 piece/frame metadata 一并给出来。

如果只是保持当前 atlas PNG，而不补 metadata，前端没法可靠拼装。

### 9.3 “这两条路线哪个更好？”

当前项目下：

- **生产主路线：后端 / 构建期预合成更好**
- **增强路线：前端实时合成可做，但不应当直接当主路线**

---

## 10. 本次引用与依据

### 10.1 仓库内依据

- `docs/research/data/skin-illustration-assembly-research.md`
- `docs/research/deployment/static-hosting-research.md`
- `docs/modules/champions/champion-illustration-page-design.md`
- `src/data/remoteGraphicAsset.ts`
- `scripts/sync-idle-champions-illustrations.mjs`
- `public/data/v1/champion-illustrations.json`

### 10.2 浏览器兼容性依据

1. MDN: `CanvasRenderingContext2D.drawImage()`  
   `https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage`
2. MDN: `HTMLImageElement.decode()`  
   `https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode`
3. MDN: `HTMLCanvasElement.toBlob()`  
   `https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob`
4. MDN: `Window.createImageBitmap()`  
   `https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap`
5. MDN: `OffscreenCanvas`  
   `https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas`
6. MDN: `Compression Streams API / DecompressionStream`  
   `https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API`  
   `https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream`

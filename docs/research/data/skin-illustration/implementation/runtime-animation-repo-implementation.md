## 当前仓库已落地的实现

### 数据层

当前第一阶段动画数据合同已经落地为：

- 集合文件：`public/data/v1/champion-animations.json`
- 原始动画包：`public/data/v1/champion-animations/skins/<skinId>.bin`
- 构建缓存：`tmp/idle-champions-graphic-cache/*.bin`

集合项保存的是小 manifest，包含：

- `championId`
- `skinId`
- `sourceGraphicId`
- `asset.path`
- `asset.bytes`
- `defaultSequenceIndex`
- `defaultFrameIndex`
- `fps`
- `sequences[].frameCount`
- `sequences[].pieceCount`
- `sequences[].firstRenderableFrameIndex`
- `sequences[].bounds`

真正大的逐帧数据仍然留在 `.bin` 里，不再额外导出一份完整 JSON。`tmp/idle-champions-graphic-cache` 只给构建脚本复用，前端不会读取这里。

### 构建层

新增脚本：

- `scripts/sync-idle-champions-animations.mjs`
- `scripts/sync-idle-champions-animations.test.mjs`

职责：

1. 读取 `public/data/v1/champion-visuals.json`
2. 为皮肤选择最合适的动画源，优先级沿用静态图逻辑：`xl -> large -> base`
3. 先命中 `tmp/idle-champions-graphic-cache`，未命中时再下载官方原始资产
4. 直接写出 `.bin`
5. 预计算每个 sequence 的可播放摘要，写入 `champion-animations.json`

同时，已发布到仓库里的 `public/data/v1/champion-animations/skins/*.bin` 本身也会被当成持久缓存：

- 同步脚本会优先读取现有 `champion-animations.json`
- 若 `sourceGraphicId / sourceGraphic / sourceVersion / sourceSlot` 与当前 definitions 一致，且本地 `.bin` 文件存在，就直接复用
- 只有资源版本或资源定位发生变化时，才重新下载对应官方原始包

这意味着默认行为已经不是“全量重新拉取”，而是“按 definitions 变化增量刷新”。

同时，`scripts/build-idle-champions-data.mjs` 已被改成：

- `npm run data:official` 默认生成全量皮肤动画；
- `--animationChampionIds` / `--animationSkinIds` 仅作为局部重建参数保留。

### 前端层

新增模块：

- `src/features/skelanim-player/types.ts`
- `src/features/skelanim-player/browser-codec.ts`
- `src/features/skelanim-player/model.ts`
- `src/features/skelanim-player/SkelAnimCanvas.tsx`

当前前端行为：

1. 对话框打开后按需读取 `champion-animations.json`
2. 如果当前 skin 命中动画资源，就再加载对应 `.bin`
3. 浏览器端解压、解码
4. 用 `requestAnimationFrame` 驱动 `canvas` 播放
5. 若失败或资源缺失，则自动回退到已有静态 PNG

浏览器解压策略是：

- 优先尝试 `DecompressionStream`
- 若浏览器 / 测试环境实现不完整，则回退到 `fflate`

### 页面接入点

第一阶段只接在：

- `src/pages/champion-detail/SkinArtworkDialog.tsx`

这是有意为之，因为：

- 单实例播放最省 CPU
- 最符合“点进详情再看动态”的实际需求
- 不会像列表页批量自动播放那样迅速拖垮性能

当前交互已支持：

- 动态优先、静态回退
- 播放 / 暂停
- `prefers-reduced-motion`

## GitHub Pages 容量约束下，为什么这个方案更合适

### 1. 只存原始包，不存成品动图

如果保存 GIF / APNG / WebM：

- 每种皮肤都会多出一份“最终成品”
- 分辨率越高越容易膨胀
- 改默认动作时需要整包重导

而保存原始 `SkelAnim` 包：

- 只保留官方原始资源
- 播放动作、首帧、bounds 这些策略都能以后再调
- 数据复用率更高

### 2. 小 manifest 比完整 JSON 更省

完整逐帧 JSON 最大的问题不是“不能播”，而是“太大”。

当前实现只把运行时必须知道的摘要塞进 `champion-animations.json`，把重数据继续放在 `.bin`，这是容量最稳妥的拆分。

### 3. 默认发布全量动画也仍然成立

当前仓库已经切到“全量动画默认发布”，但主线设计仍然成立：

- 站点里保存的是原始 `.bin` + 小 manifest，而不是 GIF / APNG / 完整逐帧 JSON
- 即便全量发布，体积也比成品动图方案稳定得多
- 局部重建参数继续保留，方便日常维护，不再承担“白名单发布”的职责

## 当前全量数据结果

当前仓库已经生成全量皮肤动画资源。

当前结果：

- 集合文件：`public/data/v1/champion-animations.json`
- 动画文件目录：`public/data/v1/champion-animations/skins/`
- 动画数量：672 个 skin
- 原始二进制总量：`132,700,544` 字节，约 `127 MB`

对比当前静态资源：

- `public/data/v1/champion-illustrations/` 约 `24 MB`
- `public/data/v1/champion-animations/` 约 `127 MB`
- 二者合计仍显著小于 GitHub Pages 官方文档里给出的 `1 GB` 发布站点上限

这也进一步说明：

- “全量动画 + 每个皮肤保留 1 张 PNG” 是可以落地的
- 但前提是坚持当前这条轻量合同，不能回退到成品动图或完整逐帧 JSON


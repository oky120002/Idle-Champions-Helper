# 皮肤动态动画：Kleho skins 页调研与仓库实现方案

- 日期：2026-04-17
- 目标：说明 `https://idle.kleho.ru/hero/strix/skins/` 为什么能播放皮肤动画、我们为什么之前只能做静态立绘，以及本仓库在 GitHub Pages 容量约束下的落地方案。

## 结论先行

- `idle.kleho.ru` 不是在放 GIF / APNG / 视频，而是在前端读取动画描述数据后，用 `canvas` 逐帧重绘。
- 我们之前做不出“动图”，不是因为官方没有动画数据，而是因为构建链路把 `SkelAnim` 主动压扁成了单帧 PNG。
- 对 GitHub Pages 最友好的主线不是“预渲染所有动图”，而是：
  - 保留静态 PNG 作为稳定回退；
  - 额外保存官方原始 `SkelAnim` 压缩容器；
  - 前端按需解码并用 `canvas` 播放。
- 这个方案现在已经在仓库里落地，并且当前仓库已切到“全量皮肤动画默认发布”的策略。

## 外站为什么能动

### 1. 它保留了动画数据，而不是只保留静态图

`idle.kleho.ru/hero/strix/skins/` 的页面会按皮肤的 `graphic_id` 拉取自己的动画描述文件，再去加载 atlas 贴图，并在浏览器里播放。

可直接核对的外站现象：

- 页面入口：[idle.kleho.ru/hero/strix/skins/](https://idle.kleho.ru/hero/strix/skins/)
- 动画描述文件示例：[idle.kleho.ru/assets/animations/2609.json](https://idle.kleho.ru/assets/animations/2609.json)
- 官方原始资源示例：[master.idlechampions.com/~idledragons/mobile_assets/Characters/Event/Hero_Strix](https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Event/Hero_Strix)

`2609.json` 这一类文件里能看到：

- `format`
- `files`
- `characters`
- `sequences`
- piece / frame 级别的动画信息

这说明它的“动图”本质是：

1. 动画描述数据
2. 纹理贴图
3. 前端播放器

而不是一张已经编码好的 GIF。

### 2. 它做的是运行时 canvas 播放

这类站点的典型播放链路是：

1. 取回动画数据
2. 取回 atlas PNG
3. 每一帧根据 `depth / x / y / scale / rotation / pivot` 重算变换
4. 在 `canvas` 上逐帧绘制

所以它“能动”的关键不是格式魔法，而是前端仍然拿着完整动画数据。

### 3. 它的资源明显是旧快照，不适合当生产上游

调研时能看到：

- 它对一些老皮肤动画能返回数据；
- 对较新的皮肤资源会直接 `404`；
- 页面里注入的 patch 时间也显示它不是跟着当前官方 definitions 实时更新的。

所以它的价值是“证明这件事技术上可行”，但不适合作为我们站点的长期依赖源。

## 我们之前为什么不行

### 1. 我们其实已经能解官方动画

仓库本来就已经有这套能力：

- `scripts/data/skelanim-codec.mjs`
- `scripts/data/skelanim-renderer.mjs`
- `scripts/sync-idle-champions-illustrations.mjs`

也就是说，我们不是“没有动画数据”，而是“已经把动画数据解开过”。

### 2. 但之前的产物合同只允许静态图

旧链路的终点是：

- `public/data/v1/champion-illustrations.json`
- `public/data/v1/champion-illustrations/**/*.png`
- 页面组件直接 `<img>` 展示

所以之前的行为是：

1. 构建期读取 `SkelAnim`
2. 选择一个 sequence / frame
3. 渲染为单张 PNG
4. 丢掉其余动画数据

根因不是“前端画不出来”，而是“数据合同不让它画”。

## 方案比较

### 方案 A：预渲染 GIF / APNG / WebM

优点：

- 页面接入最简单

缺点：

- 体积膨胀最快
- 透明边缘和清晰度通常更差
- 不利于暂停、降速、动作切换
- 一旦默认动作要改，就得重导一批成品文件

结论：

- 不适合作为 GitHub Pages 主方案

### 方案 B：像 kleho 一样保存完整 JSON + atlas PNG

优点：

- 浏览器逻辑直观
- PoC 速度快

缺点：

- JSON 体积很大
- atlas 资源重复存储
- 全量铺开时很浪费仓库容量

结论：

- 可用于研究，但不适合作为全站长期主线

### 方案 C：保存官方原始容器 + 小 manifest，前端 canvas 播放

优点：

- 体积最省
- 与官方当前资源保持一致
- 兼容 GitHub Pages / local-first / 零预算约束
- 可以继续保留静态 PNG 作为回退

代价：

- 前端需要浏览器侧解码器
- 需要补一个 `canvas` 播放器

结论：

- 这是最合适的主线方案

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

## 对“原始资源文件 + 动画帧数据，前端 canvas 绘制”这个想法的判断

这个方向总体是对的，但有一个可以继续优化的点：

- 不需要再额外保存一份完整“动画帧数据 JSON”

更好的做法是：

- 保存官方原始资源文件（就是 `.bin`）
- 只额外保存一个很小的 manifest / 索引摘要
- 前端拿到原始容器后现解现播

原因：

- 原始容器里本来就带着完整帧数据
- 再导出一份完整 JSON 只是重复存储
- 这对 GitHub Pages 容量最不友好

所以更准确的主线应该写成：

> 保存原始 `SkelAnim` 资源文件 + 小 manifest，前端按需解码后用 `canvas` 绘制。

## 后续建议

### 建议继续保持的边界

- 静态 PNG 继续保留，不能被动画链路替代掉
- hero-base 与 skin 静态 PNG 都优先复用 `champion-animations.json` 里选出的默认 `sequence/frame`；不要再单独维护一套 pose 决策逻辑
- 只有当某个 hero-base 将来不存在动画包时，才回退到现有静态渲染路径
- 不要在列表页默认自动播放
- 不要把完整逐帧 JSON 也一并存站内

### 第二阶段可以考虑做的事

1. 统计每个英雄动画包体积，给数据构建加预算阈值
2. 只在详情弹层里加载，关闭后释放播放器状态
3. 以后再评估是否扩展到插画页，但仍应维持“用户触发后再播放”

## 最终回答

- `idle.kleho.ru` 能做 skins 页动图，是因为它保留了动画描述数据和贴图，并在前端用 `canvas` 逐帧播放；它不是靠 GIF。
- 我们之前不行，是因为现有链路在构建期把官方 `SkelAnim` 折叠成了静态 PNG，页面合同里也没有动画播放器。
- 在 GitHub Pages 容量限制下，最合适的方案不是预渲染成动图，而是：
  - 保留静态 PNG
  - 保存官方原始 `SkelAnim` `.bin`
  - 用一个小 manifest 记录默认动作与 bounds
  - 前端按需解码后用 `canvas` 播放
- 这个方案现在已经在仓库里完成了全量落地：672 个皮肤动画包约 `127 MB`，加上现有静态立绘约 `24 MB`，总量仍在 GitHub Pages 可接受范围内。

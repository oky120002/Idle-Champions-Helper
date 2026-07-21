# 动画 / 立绘落地：方案调研与仓库实现

- 日期：2026-04-17
- 目标：说明 `idle.kleho.ru` 为什么能播放皮肤动画、本仓库之前为什么只能做静态立绘，以及在 GitHub Pages 容量约束下的落地方案与当前实现。

## 外站为什么能动

`idle.kleho.ru/hero/strix/skins/` 不是在放 GIF / APNG / 视频，而是在前端读取动画描述数据后，用 `canvas` 逐帧重绘。页面会按皮肤的 `graphic_id` 拉取自己的动画描述文件，再加载 atlas 贴图并在浏览器播放。

可直接核对的外站现象：

- 页面入口：[idle.kleho.ru/hero/strix/skins/](https://idle.kleho.ru/hero/strix/skins/)
- 动画描述文件示例：[idle.kleho.ru/assets/animations/2609.json](https://idle.kleho.ru/assets/animations/2609.json)
- 官方原始资源示例：[master.idlechampions.com/~idledragons/mobile_assets/Characters/Event/Hero_Strix](https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Event/Hero_Strix)

`2609.json` 这类文件里能看到 `format`、`files`、`characters`、`sequences`、piece / frame 级别的动画信息。它的“动图”本质是：动画描述数据 + 纹理贴图 + 前端播放器，而不是一张已编码好的 GIF。

它的资源明显是旧快照：对老皮肤能返回数据，对较新资源直接 `404`，patch 时间也显示不是跟着当前官方 definitions 实时更新。价值是“证明技术上可行”，但不适合作为长期依赖源。

## 我们之前为什么不行

仓库本来就有 `scripts/data/skelanim-codec.mjs`、`scripts/data/skelanim-renderer.mjs`、`scripts/sync-idle-champions-illustrations.mjs`，已经能解官方动画。但旧链路终点是 `champion-illustrations.json` + `*.png` + 页面 `<img>`，构建期读取 `SkelAnim` -> 选 sequence / frame -> 渲染单张 PNG -> 丢掉其余动画数据。根因不是“前端画不出来”，而是“数据合同不让它画”。

## 方案比较

### 方案 A：预渲染 GIF / APNG / WebM

- 优点：页面接入最简单。
- 缺点：体积膨胀最快；透明边缘和清晰度更差；不利于暂停、降速、动作切换；改默认动作要重导一批成品。
- 结论：不适合 GitHub Pages 主方案。

### 方案 B：像 kleho 一样保存完整 JSON + atlas PNG

- 优点：浏览器逻辑直观，PoC 快。
- 缺点：JSON 体积大，atlas 重复存储，全量铺开浪费容量。
- 结论：可用于研究，不适合全站长期主线。

### 方案 C：保存官方原始容器 + 小 manifest，前端 canvas 播放

- 优点：体积最省；与官方资源一致；兼容 GitHub Pages / local-first / 零预算；可保留静态 PNG 回退。
- 代价：前端需要浏览器侧解码器和一个 `canvas` 播放器。
- 结论：最合适的主线方案。

## 当前仓库实现

### 当前方案

- 保留 `public/data/v1/champion-visuals.json` 作为官方资源定位基座。
- 新增 `scripts/sync-idle-champions-animations.mjs`，把 hero-base / skin 的官方 `SkelAnim` 原始包发布到 `public/data/v1/champion-animations/**/*.bin`。
- `scripts/sync-idle-champions-illustrations.mjs` 不再为 skin 维护独立 pose 决策，而是统一读取 `champion-animations.json` 的默认 `sequence / frame` 生成静态 PNG。
- 页面层保留静态图展示，同时在详情弹层按需加载本地 `.bin` 做 canvas 动画播放。

主链已经从“构建期合一张静态图”升级到“构建期发布原始动画包 + 默认帧 PNG，运行时按需播放”。hero-base 与 skin 已确认共用同一条动画主线（`161 / 161` 个英雄本体都能映射到 `SkelAnim` 动画资源）。

### 建议流水线

1. 拉取最新 definitions，重建 `champion-visuals.json`
2. 用 `scripts/sync-idle-champions-animations.mjs` 选择 hero-base / skin 动画源并发布 `.bin`
3. 预计算每个 sequence 摘要，写入 `champion-animations.json`
4. 用同一份 manifest 的默认帧生成 `champion-illustrations/**/*.png`
5. 前端详情弹层按需读取本地 `.bin`，浏览器解码后用 `canvas` 播放

### 数据层

集合文件 `public/data/v1/champion-animations.json` 保存小 manifest（`championId`、`skinId`、`sourceGraphicId`、`asset.path`、`asset.bytes`、`defaultSequenceIndex`、`defaultFrameIndex`、`fps`、`sequences[].frameCount / pieceCount / firstRenderableFrameIndex / bounds`）。逐帧数据留在 `.bin`，不再额外导出完整 JSON。`tmp/idle-champions-graphic-cache` 只给构建脚本复用，前端不读。

### 构建层

`scripts/sync-idle-champions-animations.mjs`（+ `.test.mjs`）职责：读 `champion-visuals.json` -> 为皮肤按 `xl -> large -> base` 选动画源 -> 命中 `tmp/idle-champions-graphic-cache` 否则下载官方原始资产 -> 写出 `.bin` -> 预计算可播放摘要写入 `champion-animations.json`。

已发布的 `public/data/v1/champion-animations/skins/*.bin` 也作为持久缓存：同步脚本优先读现有 manifest，若 `sourceGraphicId / sourceGraphic / sourceVersion / sourceSlot` 与当前 definitions 一致且本地 `.bin` 存在，直接复用；只有资源版本或定位变化才重新下载。默认行为已是“按 definitions 变化增量刷新”，而非全量重拉。

`scripts/build-idle-champions-data.mjs` 已改为：`npm run data:official` 默认生成全量皮肤动画；`--animationChampionIds` / `--animationSkinIds` 仅作局部重建参数保留。

### 前端层

新增 `src/features/skelanim-player/`（`types.ts`、`browser-codec.ts`、`model.ts`、`SkelAnimCanvas.tsx`）。前端行为：对话框打开后按需读 `champion-animations.json` -> skin 命中则加载对应 `.bin` -> 浏览器解压解码 -> `requestAnimationFrame` 驱动 `canvas` 播放 -> 失败或缺失自动回退静态 PNG。解压优先 `DecompressionStream`，不完整时回退 `fflate`。

页面接入点 `src/pages/champion-detail/SkinArtworkDialog.tsx`，单实例播放最省 CPU，符合“点进详情再看动态”的需求。已支持动态优先静态回退、播放 / 暂停、`prefers-reduced-motion`。

### 容量与全量结果

保存原始 `SkelAnim` 包而非成品动图：只保留官方原始资源，播放动作 / 首帧 / bounds 策略可后调，数据复用率高。小 manifest 比完整逐帧 JSON 省（完整 JSON 最大问题不是“不能播”而是“太大”）。

当前全量发布结果：

- `public/data/v1/champion-animations.json`：833 项（161 hero-base + 672 skin）
- `public/data/v1/champion-animations/`：约 155 MB（其中 skins 原始二进制约 127 MB）
- `public/data/v1/champion-illustrations/`：约 24 MB
- 合计显著小于 GitHub Pages 官方 `1 GB` 站点上限

“全量动画 + 每个皮肤保留 1 张 PNG”可落地，前提是坚持轻量合同，不回退到成品动图或完整逐帧 JSON。

## 后续边界

- 静态 PNG 继续保留，不能被动画链路替代。
- hero-base 与 skin 静态 PNG 都优先复用 `champion-animations.json` 选出的默认 `sequence / frame`，不再单独维护 pose 决策逻辑。
- 只有当某个 hero-base 将来不存在动画包时，才回退现有静态渲染路径。
- 不要在列表页默认自动播放；不要把完整逐帧 JSON 存站内。
- 后续可考虑：统计每个英雄动画包体积给数据构建加预算阈值；详情弹层关闭后释放播放器状态；评估是否扩展到插画页但仍维持“用户触发后再播放”。

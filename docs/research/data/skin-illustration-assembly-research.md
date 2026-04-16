# Idle Champions 皮肤立绘组装方案调研

- 调研日期：2026-04-16
- 当前状态：当前结论已通过官方 definitions 快照、仓库现有脚本、游戏客户端缓存与本地反编译交叉确认，现阶段仍有效。
- 调研目标：解释“英雄详情页 -> 皮肤立绘弹窗”为什么会显示拆散的碎片图，并确认官方基座里是否存在可把皮肤立绘组装成完整静态图的坐标、规则或指南。
- 调研范围：
  - 仓库现有页面与生成脚本
  - `tmp/idle-champions-api/definitions-2026-04-16T03-48-29.427Z-latest-en.json`
  - `public/data/v1/champion-visuals.json`
  - `public/data/v1/champion-illustrations.json`
  - 本机 Steam 客户端缓存（仓库外路径）
  - 本机反编译得到的 `Assembly-CSharp.dll` IL 文本（仓库外临时文件）

> 如果你当前更关心“后端预合成”和“前端实时合成”两条渲染路线该怎么选，请继续看 `docs/research/data/skin-illustration-render-strategy-research.md`；本文只回答“为什么会碎”和“官方有没有组装数据”。
>
> 2026-04-16 落地补充：仓库当前已经落地的离线渲染实现、坐标系修正、默认 pose / slot 选择规则与后续人工覆盖建议，统一见 `docs/research/data/skin-illustration-render-pipeline-research.md`。

---

## 1. 结论先行

- 当前弹窗里看到的“头、尾巴、身体拆开散落”的图，不是偶发渲染 bug，而是当前资源同步脚本把 `Characters/...` 的**分件动画图集**直接当成最终立绘使用了。
- 官方确实存在把这些碎片组装成完整英雄/皮肤立绘所需的数据，但这些数据**不在**当前页面消费的静态 JSON 普通字段里，而在 `graphic_defines.type = 3` 指向的客户端二进制资源与运行时代码里。
- 以 2026-04-16 抓取的最新英文 definitions 快照为准：
  - `173 / 173` 个英雄 `hero_defines[].graphic_id` 对应的 `graphic_defines.type` 都是 `3`
  - `673 / 673` 条带 `base / large / xl` 的皮肤记录，对应的三个 `graphic_id` 也全部都是 `type = 3`
- 本地反编译确认 `graphic_defines.type = 3` 不是普通图片，而是 `SkelAnim`（skeletal animation / 骨骼分件动画）资源。
- 因此，当前正确方案不是“继续挑一个 `base / large / xl` 然后直接解包 PNG”，而是：
  1. 构建期解析 `SkelAnim` 二进制；
  2. 选择一个合适的 `sequence + frame` 作为静态 pose；
  3. 按 piece 的 pivot、位置、缩放、旋转、depth 顺序把所有部件合成为一张完整立绘；
  4. 再输出站内可直接展示的 PNG / WebP。

---

## 2. 当前错误表现与直接原因

### 2.1 页面当前用的是本地静态立绘文件

英雄详情页弹窗当前直接渲染 `selectedSkinIllustration.image.path` 指向的本地图片：

- `src/pages/ChampionDetailPage.tsx`
- `public/data/v1/champion-illustrations.json`

这些本地图片由下面这个脚本生成：

- `scripts/sync-idle-champions-illustrations.mjs`

该脚本当前做法是：

1. 从 `champion-visuals.json` 里挑选 `large / base / xl` 候选资源；
2. 下载远端 `mobile_assets`；
3. 用 `scripts/data/mobile-asset-codec.mjs` 解包；
4. 直接把解包结果写进 `public/data/v1/champion-illustrations/heroes|skins/*.png`。

问题就在第 4 步：它默认“解包出来的一张 PNG 就是完整立绘”，这个前提对很多 `Characters/...` 资源并不成立。

### 2.2 现有产物已经能直接看到碎片化

当前仓库里已经生成出的多个样例都不是完整人物，而是分件图集：

- `public/data/v1/champion-illustrations/skins/332.png`
- `public/data/v1/champion-illustrations/skins/416.png`
- `public/data/v1/champion-illustrations/heroes/38.png`

这些图片里能看到头、手、披风、躯干、尾巴等部件被排在同一张图集里，而不是已经拼好的英雄立绘。

---

## 3. 官方 definitions 能提供什么，不能提供什么

### 3.1 能稳定定位到资源引用

最新快照 `tmp/idle-champions-api/definitions-2026-04-16T03-48-29.427Z-latest-en.json` 里，英雄和皮肤的资源链路依然完整：

- 英雄本体：`hero_defines[].graphic_id`
- 皮肤资源：`hero_skin_defines[].details.base_graphic_id / large_graphic_id / xl_graphic_id / portrait_graphic_id`

以皮肤 `332 = Modron BBEG` 为例：

- `base_graphic_id -> Characters/Event/Hero_BBEG_Modron`
- `large_graphic_id -> Characters/Event/Hero_BBEG_Modron_2xup`
- `xl_graphic_id -> Characters/Event/Hero_BBEG_Modron_4xup`
- `portrait_graphic_id -> Portraits/Portrait_ModronBBEG`

以皮肤 `416 = Plushie Evandra` 为例：

- `base_graphic_id -> Characters/Hero_Evandra_Plushie`
- `large_graphic_id -> Characters/Hero_Evandra_Plushie_2xup`
- `xl_graphic_id -> Characters/Hero_Evandra_Plushie_4xup`
- `portrait_graphic_id -> Portraits/Portrait_PlushieEvandra`

### 3.2 真正关键的信号是 `graphic_defines.type = 3`

对同一批 skin 的 `graphic_defines` 交叉确认后，能看到：

- `Characters/...` 对应 `type = 3`
- `Portraits/...` 对应 `type = 1`

`Modron BBEG` 的 `large / xl` 还额外带了这些参数：

- `upscale`
- `ref_graphic_id`
- `sequence_override`

这说明：

- `large / xl` 不是独立语义完整的成图资源；
- 它们更像是对某个基础动画资源的放大版、复用版或序列覆盖版。

### 3.3 definitions 里没有现成“完整立绘组装坐标表”

在当前仓库已有的静态基座里，没有找到可以直接用于离线拼装完整人物的字段合同：

- `public/data/v1/champion-details/*.json`
- `public/data/v1/champion-visuals.json`
- `public/data/v1/champion-illustrations.json`

`hero_skin_defines.details` 里能拿到的是资源引用和少量变体槽位，例如：

- `base_graphic_id`
- `large_graphic_id`
- `xl_graphic_id`
- `portrait_graphic_id`
- `noarm_graphic`
- `nosword_graphic`
- `companion_graphic_ids`
- `additional_shop_graphics`

但这里没有“piece 在画布上的最终坐标表”这类直接可消费字段。

结论是：

- definitions 解决的是“资源怎么定位”
- 不是“完整人物怎么组装”

---

## 4. 组装规则实际上藏在客户端运行时资源里

### 4.1 本机客户端缓存里存在配套二进制和图集

在本机 Steam 安装的 Idle Champions 缓存目录里，能找到与目标资源同名的文件：

- 仓库外路径：`~/Library/Application Support/Steam/steamapps/common/IdleChampions/IdleDragonsMac.app/Contents/Resources/Data/StreamingAssets/downloaded_files/`

样例：

- `Characters_Event__Hero_BBEG_Modron_2xup`
- `Characters_Event__Hero_BBEG_Modron_2xup.json`
- `Hero_BBEG_Modron_2xup_0_3.png`
- `Characters__Hero_Evandra_Plushie_2xup`
- `Characters__Hero_Evandra_Plushie_2xup.json`

其中：

- `.json` 文件只有版本号，例如 `{"version": 3}`、`{"version": 2}`
- `*_0_3.png` 是贴图图集
- 真正的动画与组装数据在没有扩展名的二进制文件里

### 4.2 反编译确认 `type = 3` 就是 `SkelAnim`

本地反编译 `Assembly-CSharp.dll` 后，在 `GraphicDef/ExportType` 枚举里可见：

- `None = 0`
- `SpriteSheet = 1`
- `CachedClip = 2`
- `SkelAnim = 3`
- `AnimationSet = 4`
- `AnimationPieces = 5`
- `Scene = 6`

这与 definitions 里的 `graphic_defines.type = 3` 正好对应，说明英雄本体与皮肤主立绘资源本质上是骨骼分件动画。

### 4.3 二进制里确实包含 piece 坐标、pivot 和帧数据

根据客户端 `SkeletalAnimationLoader::ReadCharacterExport` 的读取逻辑，`SkelAnim` 资源在 zlib 解压后会继续按二进制结构解析：

1. `numSequences`
2. 对每个 sequence：
   - `seqLength`
   - `pieceCount`
3. 对每个 piece：
   - `textureId`
   - `x`
   - `y`
   - `width`
   - `height`
   - `centerX`
   - `centerY`
4. 对每帧：
   - `depth`
   - `x`
   - `y`
   - `scaleX`
   - `scaleY`
   - `rotation`

也就是说，客户端确实持有：

- piece 在 atlas 上的裁切区域
- piece 的枢轴点 / pivot
- 当前帧的位移、缩放、旋转
- 以及渲染层级 `depth`

这正是把碎片拼成完整角色所需要的核心数据。

### 4.4 本地样例已经读出真实结构

对 `Characters_Event__Hero_BBEG_Modron_2xup` 做本地解压和按上述结构解析后，可以稳定读到：

- 纹理尺寸：`1024 x 512`
- 纹理数：`1`
- 角色数：`1`
- 角色名：`Hero_BBEG_Modron_2xup`
- sequence 数量：`2`
- sequence 长度：`40`、`32`
- 第一个 sequence 的 piece 数量：`56`

其中某个 piece 的样例帧数据已经能读到：

- atlas 裁切框：`[194, 392, 158, 80]`
- center：`[78, 40]`
- 帧参数：`depth / x / y / scaleX / scaleY / rotation`

这进一步证明：问题不是“官方没给组装数据”，而是“我们当前没有解析并消费这些数据”。

---

## 5. 客户端运行时是怎么把碎片拼起来的

反编译得到的 `SkeletalAnimationController::UpdatePieces` 和 `SkeletalAnimationSequenceData` 可以看出，客户端运行时至少做了这些事情：

1. 取当前 `sequence` 与 `frame`
2. 对每个 piece 读取当前帧的：
   - `Rotation`
   - `ScaleX`
   - `ScaleY`
   - `X`
   - `Y`
3. 把 `rotation` 从弧度换算到角度：`rotation * -180 / π`
4. 把 `center` 当成枢轴，构造局部矩形与变换矩阵
5. 结合 `UV` 从 atlas 上裁出 piece
6. 按 `depth` 排序后绘制

这说明离线组装时至少要还原以下逻辑：

- atlas 裁切
- pivot/center
- translation
- rotation
- scale
- depth 排序

因此，单纯“把 zlib 解包后的 PNG 图集写盘”只完成了纹理层，离最终立绘还差整个渲染层。

---

## 6. 可落地的仓库方案

### 6.1 构建期主方案

当前仓库最可行、也最符合 GitHub Pages 约束的路线是：

1. 保留 `public/data/v1/champion-visuals.json` 作为官方资源定位基座；
2. 把 `scripts/sync-idle-champions-illustrations.mjs` 升级为 `SkelAnim` 解析器与静态渲染器；
3. 构建期直接输出页面消费的完整立绘；
4. 页面继续只读站内静态资源，不依赖浏览器现场组装官方远端数据。

### 6.2 具体流水线建议

建议把“立绘同步”调整为下面的链路：

1. 按 `graphic_id` 下载 `Characters/...` 资源；
2. zlib 解压，读取其中内嵌纹理与 `SkelAnim` 元数据；
3. 依据 `sequence_override`、默认 sequence 或显式规则选择静态 pose；
4. 按 frame 的 `depth + transform + pivot + UV` 合成完整图；
5. 裁切透明边，输出页面用 `display / thumb` 衍生图；
6. 在 `champion-illustrations.json` 里追加渲染元信息，例如：
   - `renderSequence`
   - `renderFrame`
   - `renderSourceType`
   - `renderBounds`

### 6.3 与当前实现的最小改动边界

当前页面层不一定需要大改：

- `src/pages/ChampionDetailPage.tsx` 仍可继续读 `champion-illustrations.json`
- 问题主要集中在构建期资源同步脚本

因此首要修复点不是页面，而是：

- `scripts/sync-idle-champions-illustrations.mjs`

---

## 7. 当前仍待补完的技术细节

已经确认“组装数据存在且可解析”，但要把它稳定落成生产图，还需要解决下面几项：

1. **静态 pose 选择规则**
   - 同一资源可能有多个 sequence
   - `sequence_override` 是否总能作为页面主立绘选择依据，还需要继续核实
2. **坐标系还原**
   - `x / y / scaleX / scaleY / rotation` 的语义已经能从 IL 读到一层，但仍需用样例渲染进一步验证最终画布边界
3. **特殊替换件**
   - 某些皮肤还有 `noarm_graphic`、`nosword_graphic`、`companion_graphic_ids` 等变体，后续要决定页面展示是否统一渲染为“主 pose”
4. **样例渲染基准**
   - 需要先做 1~2 个皮肤的离线 PoC，把最终静态图和游戏内视觉对齐，再批量生成全量立绘

但这些是“如何把方案做稳”的问题，不再是“有没有方案”的问题。

---

## 8. 对当前需求的直接回答

针对“有没有能组装起来的方案，以及游戏基座里有没有类似的组装坐标和指南”，当前结论是：

- **有方案。**
- **有组装所需数据。**
- 但这些数据**不在**当前页面消费的 definitions 普通字段里，而在 `graphic_defines.type = 3 (SkelAnim)` 对应的客户端二进制资源与运行时代码里。
- 官方更像是提供了“动画资源格式 + 客户端加载器”，而不是提供一份现成可直接读取的“完整立绘 JSON 坐标表”。

也就是说，后续实现方向应该是：

- “把游戏客户端的 `SkelAnim` 运行时组装过程，离线搬到我们的构建脚本里”

而不是：

- “继续在 `base / large / xl` 里挑一张最像成图的 PNG”

---

## 9. 本次引用与核对来源

### 9.1 仓库内文件

- `src/pages/ChampionDetailPage.tsx`
- `scripts/sync-idle-champions-illustrations.mjs`
- `scripts/data/mobile-asset-codec.mjs`
- `public/data/v1/champion-visuals.json`
- `public/data/v1/champion-illustrations.json`
- `tmp/idle-champions-api/definitions-2026-04-16T03-48-29.427Z-latest-en.json`

### 9.2 官方线上来源

1. `https://master.idlechampions.com/~idledragons/post.php?call=getPlayServerForDefinitions&mobile_client_version=999&network_id=11`
2. `https://ps30.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=1`
3. `https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Event/Hero_BBEG_Modron_2xup`
4. `https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Hero_Evandra_Plushie_2xup`

### 9.3 仓库外本地来源

- 本机 Steam 客户端缓存（仓库外路径）：
  - `~/Library/Application Support/Steam/steamapps/common/IdleChampions/IdleDragonsMac.app/Contents/Resources/Data/StreamingAssets/downloaded_files/`
- 本机反编译结果（仓库外临时文件）：
  - `/tmp/idlechampions-assembly.il`

# Idle Champions 皮肤立绘组装方案调研

- 调研日期：2026-04-16
- 状态：已用官方 definitions 快照、仓库脚本、客户端缓存与本地反编译交叉确认，当前仍有效。
- 目标：解释详情页皮肤立绘弹窗为什么会显示碎片图，并确认官方基座里是否存在可离线组装完整立绘的数据与规则。
- 配套文档：路线选择见 `docs/research/data/skin-illustration-render-strategy-research.md`；当前落地链路见 `docs/research/data/skin-illustration-render-pipeline-research.md`。

## 结论

- 当前弹窗出现“头、尾巴、身体拆开散落”，根因不是偶发渲染 bug，而是当前同步脚本把 `Characters/...` 的分件动画图集直接当成最终立绘。
- 官方确实给了完整组装所需数据，但它们不在页面当前消费的普通 definitions 字段里，而在 `graphic_defines.type = 3` 对应的客户端二进制资源与运行时代码里。
- 以 2026-04-16 最新英文快照为准：`173 / 173` 个英雄 `hero_defines[].graphic_id` 的 `graphic_defines.type` 都是 `3`；`673 / 673` 条带 `base / large / xl` 的皮肤记录，这三个 `graphic_id` 也都对应 `type = 3`。
- 本地反编译确认：`graphic_defines.type = 3` 就是 `SkelAnim`，不是普通成图资源。
- 正确方案不是继续挑 `base / large / xl` 里“最像成图”的 PNG，而是：构建期解析 SkelAnim -> 选 `sequence + frame` -> 按 piece 的 pivot / 位置 / 缩放 / 旋转 / depth 合成为静态 pose -> 输出站内图片。

## 当前为什么会碎

- 当前详情页渲染 `selectedSkinIllustration.image.path`；对应图片由 `scripts/sync-idle-champions-illustrations.mjs` 生成。
- 现有脚本流程是：从 `champion-visuals.json` 选 `large / base / xl` 候选 -> 下载 `mobile_assets` -> 用 `scripts/data/mobile-asset-codec.mjs` 解包 -> 直接写入 `public/data/v1/champion-illustrations/heroes|skins/*.png`。
- 问题就在“直接写盘”：对很多 `Characters/...` 来说，解包结果只是 atlas，不是最终人物图。
- 现有碎片化样例：`public/data/v1/champion-illustrations/skins/332.png`、`public/data/v1/champion-illustrations/skins/416.png`、`public/data/v1/champion-illustrations/heroes/38.png`。

## definitions 能给什么，不能给什么

| 类型 | 现有字段 / 样例 | 结论 |
| --- | --- | --- |
| 资源定位 | 英雄：`hero_defines[].graphic_id`、`hero_defines[].portrait_graphic_id`；皮肤：`hero_skin_defines[].details.base_graphic_id / large_graphic_id / xl_graphic_id / portrait_graphic_id` | 能稳定定位英雄本体、皮肤和头像资源 |
| 类型区分 | `Characters/... -> graphic_defines.type = 3`；`Portraits/... -> type = 1` | 能判断哪些资源是 `SkelAnim`，哪些是普通头像 |
| 派生关系 | `large / xl` 常带 `upscale`、`ref_graphic_id`、`sequence_override` | 能看出这些槽位更像同一动画资源的派生版本 |
| 组装规则 | `public/data/v1/champion-details/*.json`、`public/data/v1/champion-visuals.json`、`public/data/v1/champion-illustrations.json` | 都没有现成的完整立绘坐标表；definitions 解决“怎么定位资源”，不解决“怎么把角色拼出来” |

样例字段链路：

- `332 = Modron BBEG`：`base_graphic_id -> Characters/Event/Hero_BBEG_Modron`、`large_graphic_id -> Characters/Event/Hero_BBEG_Modron_2xup`、`xl_graphic_id -> Characters/Event/Hero_BBEG_Modron_4xup`、`portrait_graphic_id -> Portraits/Portrait_ModronBBEG`
- `416 = Plushie Evandra`：`base_graphic_id -> Characters/Hero_Evandra_Plushie`、`large_graphic_id -> Characters/Hero_Evandra_Plushie_2xup`、`xl_graphic_id -> Characters/Hero_Evandra_Plushie_4xup`、`portrait_graphic_id -> Portraits/Portrait_PlushieEvandra`

## `preview_graphic_id` 与 `additional_shop_graphics`

| 字段 | 复核结论 |
| --- | --- |
| `preview_graphic_id` | 不在英雄或皮肤资源链路里；当前快照全部出现在 `adventure_defines[].rewards[].preview_graphic_id`，对应 `graphic_defines.type = 1` 的 `Icons/...`，例如 `18787 -> Icons/CorruptedGems/Icon_CorruptedGem`、`22944 -> Icons/Adventures/Vecna/Adventure_Vecna_Reward_RodPart_1`；它是奖励预览图标，不是英雄 / 皮肤主立绘 |
| `additional_shop_graphics` | 只出现在 `149 / 673` 个皮肤上；这些资源仍全部是 `graphic_defines.type = 3 (SkelAnim)`，内容多为变身形态、伙伴、宠物或商店额外素材，例如 `Bee Strix` 的 `Characters/Event/Hero_StrixBroom_Bee_4xup`、`Champion Asharra` 的 `Characters/Hero_AsharraFlying_Champion_4xup`；不能直接替代主 pose 判断 |

结论：`preview_graphic_id` 不能替代 pose 判断；`additional_shop_graphics` 也只是额外 SkelAnim 素材，仍需解码、选 frame、再合成。

## 组装规则藏在哪里

### 客户端缓存

在本机 Steam 缓存目录 `~/Library/Application Support/Steam/steamapps/common/IdleChampions/IdleDragonsMac.app/Contents/Resources/Data/StreamingAssets/downloaded_files/` 中，可找到：

- 与目标资源同名的无扩展名二进制文件
- 只有版本号的 `.json`，例如 `{"version": 3}`
- 配套 atlas，例如 `Hero_BBEG_Modron_2xup_0_3.png`

这说明：真正的动画与组装数据在无扩展名二进制里，`.json` 不是组装表。

### 反编译与二进制结构

- 本地反编译 `Assembly-CSharp.dll` 后，在 `GraphicDef/ExportType` 枚举里可见：`None = 0`、`SpriteSheet = 1`、`CachedClip = 2`、`SkelAnim = 3`、`AnimationSet = 4`、`AnimationPieces = 5`、`Scene = 6`；与 definitions 里的 `type = 3` 完整对上。
- 根据客户端 `SkeletalAnimationLoader::ReadCharacterExport` 的读取逻辑，SkelAnim 在 zlib 解压后会继续解析：`numSequences`、每个 sequence 的 `seqLength / pieceCount`、每个 piece 的 `textureId / x / y / width / height / centerX / centerY`、每帧的 `depth / x / y / scaleX / scaleY / rotation`。
- 这正是离线拼装所需的核心数据：atlas 裁切区域、pivot、位移、缩放、旋转和深度排序。

### 本地样例已读出的真实结构

对 `Characters_Event__Hero_BBEG_Modron_2xup` 本地解压与解析后，可稳定读到：

| 项目 | 值 |
| --- | --- |
| 纹理尺寸 | `1024 x 512` |
| 纹理数 | `1` |
| 角色数 | `1` |
| 角色名 | `Hero_BBEG_Modron_2xup` |
| sequence 数 | `2` |
| sequence 长度 | `40`、`32` |
| 第一个 sequence 的 piece 数 | `56` |

并且单个 piece 已能读出 atlas 裁切框、`center`、`depth / x / y / scaleX / scaleY / rotation`。问题不是“官方没给数据”，而是“此前脚本没有继续解析并消费这些数据”。

## 客户端运行时在做什么

反编译得到的 `SkeletalAnimationController::UpdatePieces` 与 `SkeletalAnimationSequenceData` 表明，客户端至少会做这些事：

1. 取当前 `sequence` 与 `frame`
2. 对每个 piece 读取当前帧的 `Rotation / ScaleX / ScaleY / X / Y`
3. 把 `rotation` 从弧度换算到角度：`rotation * -180 / π`
4. 以 `center` 为 pivot 构造局部矩形与变换矩阵
5. 结合 UV 从 atlas 裁出 piece
6. 按 `depth` 排序绘制

因此，把 zlib 解包后的 atlas 直接写盘，只完成了纹理层，离最终立绘还差整个渲染层。

## 仓库可落地方案

- 主方向：保留 `public/data/v1/champion-visuals.json` 作为官方资源定位基座，把 `scripts/sync-idle-champions-illustrations.mjs` 升级为 SkelAnim 解析器与静态渲染器，在构建期直接输出页面消费的完整立绘。
- 建议流水线：按 `graphic_id` 下载 `Characters/...` -> zlib 解压并读取纹理与 SkelAnim 元数据 -> 依据 `sequence_override`、默认 sequence 或显式规则选择静态 pose -> 按 `depth + transform + pivot + UV` 合成完整图 -> 裁透明边并输出页面用 `display / thumb` -> 在 `champion-illustrations.json` 追加 `renderSequence / renderFrame / renderSourceType / renderBounds`。
- 页面层可以基本不动：`src/pages/ChampionDetailPage.tsx` 继续读 `champion-illustrations.json`；首要修复点是构建期资源同步脚本，而不是页面组件。

## 仍待补完的技术点

- 静态 pose 选择：同一资源可能有多个 sequence；`sequence_override` 是否总能代表页面主立绘，仍需继续核实。
- 坐标系还原：`x / y / scaleX / scaleY / rotation` 已能从 IL 读到一层，但仍需样例渲染继续核对最终边界。
- 特殊替换件：`noarm_graphic`、`nosword_graphic`、`companion_graphic_ids` 等变体，后续要决定页面是否统一渲染为主 pose。
- 样例基准：仍要用少量皮肤 PoC 与游戏内视觉对齐，再批量生成全量立绘。

## 直接回答

- “有没有能组装起来的方案？”：有。
- “游戏基座里有没有类似组装坐标和规则？”：有，但不在普通 definitions 字段里，而在 `graphic_defines.type = 3 (SkelAnim)` 对应的客户端二进制与运行时代码里。
- “是不是已经存在现成可直接读的完整立绘 JSON 坐标表？”：没有；官方更像是提供了动画资源格式和客户端加载器，而不是成品坐标清单。
- “`preview_graphic_id` 或 `additional_shop_graphics` 能否直接替代 pose 判断？”：不能；前者是奖励图标，后者只是部分皮肤的额外 SkelAnim 素材。
- 正确实现方向是：把客户端的 SkelAnim 运行时组装过程离线搬到构建脚本里，而不是继续在 `base / large / xl` 里挑一张 atlas。

## 引用与核对来源

### 仓库内

- `src/pages/ChampionDetailPage.tsx`
- `scripts/sync-idle-champions-illustrations.mjs`
- `scripts/data/mobile-asset-codec.mjs`
- `public/data/v1/champion-visuals.json`
- `public/data/v1/champion-illustrations.json`
- `tmp/idle-champions-api/definitions-2026-04-16T03-48-29.427Z-latest-en.json`

### 官方线上

1. `https://master.idlechampions.com/~idledragons/post.php?call=getPlayServerForDefinitions&mobile_client_version=999&network_id=11`
2. `https://ps30.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=1`
3. `https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Event/Hero_BBEG_Modron_2xup`
4. `https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Hero_Evandra_Plushie_2xup`

### 仓库外本地

- Steam 客户端缓存：`~/Library/Application Support/Steam/steamapps/common/IdleChampions/IdleDragonsMac.app/Contents/Resources/Data/StreamingAssets/downloaded_files/`
- 反编译临时文件：`/tmp/idlechampions-assembly.il`

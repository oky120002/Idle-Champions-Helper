# 皮肤立绘：客户端缓存与 SkelAnim 结构

- 日期：2026-04-16
- 目标：回答“组装规则藏在哪里”“`type = 3` 到底是什么”“本地有没有读到真实结构”。

## 客户端缓存里有什么

在本机 Steam 缓存目录 `~/Library/Application Support/Steam/steamapps/common/IdleChampions/IdleDragonsMac.app/Contents/Resources/Data/StreamingAssets/downloaded_files/` 中，可找到：

- 与目标资源同名的无扩展名二进制文件
- 只有版本号的 `.json`，例如 `{"version": 3}`
- 配套 atlas，例如 `Hero_BBEG_Modron_2xup_0_3.png`

这说明：真正的动画与组装数据在无扩展名二进制里，`.json` 不是组装表。

## 反编译后能确认什么

- 本地反编译 `Assembly-CSharp.dll` 后，在 `GraphicDef/ExportType` 枚举里可见：`None = 0`、`SpriteSheet = 1`、`CachedClip = 2`、`SkelAnim = 3`、`AnimationSet = 4`、`AnimationPieces = 5`、`Scene = 6`；与 definitions 里的 `type = 3` 完整对上。
- 根据客户端 `SkeletalAnimationLoader::ReadCharacterExport` 的读取逻辑，SkelAnim 在 zlib 解压后会继续解析：`numSequences`、每个 sequence 的 `seqLength / pieceCount`、每个 piece 的 `textureId / x / y / width / height / centerX / centerY`、每帧的 `depth / x / y / scaleX / scaleY / rotation`。
- 这些字段正是离线拼装所需的核心数据：atlas 裁切区域、pivot、位移、缩放、旋转和深度排序。

## 本地样例已读出的结构

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

并且单个 piece 已能读出 atlas 裁切框、`center`、`depth / x / y / scaleX / scaleY / rotation`。因此问题不是“官方没给数据”，而是“此前脚本没有继续解析并消费这些数据”。

## 客户端运行时做了什么

反编译得到的 `SkeletalAnimationController::UpdatePieces` 与 `SkeletalAnimationSequenceData` 表明，客户端至少会做这些事：

1. 取当前 `sequence` 与 `frame`
2. 对每个 piece 读取当前帧的 `Rotation / ScaleX / ScaleY / X / Y`
3. 把 `rotation` 从弧度换算到角度：`rotation * -180 / π`
4. 以 `center` 为 pivot 构造局部矩形与变换矩阵
5. 结合 UV 从 atlas 裁出 piece
6. 按 `depth` 排序绘制

因此，把 zlib 解包后的 atlas 直接写盘，只完成了纹理层，离最终立绘还差整个渲染层。

## Web 端复刻补充

- 直接对照 [kleho 的英雄皮肤页](https://idle.kleho.ru/list/) 所加载的 `build.js` 与 `/assets/animations/*.json` 可确认，网页端的 skeletal canvas 复刻采用的是：`translate(tx, ty) -> scale(sx, sy) -> rotate(rot) -> drawImage(..., -cx, -cy, ...)`。
- 这意味着在浏览器 canvas 里，SkelAnim 的 `rotation` 要按正弧度使用，而且非等比缩放必须先于旋转进入矩阵；如果写成 `rotate(-rotation)` 或把 `rotate` 放在 `scale` 前面，就会在大量英雄上出现四肢错位、关节脱节的观感。
- Unity 客户端 IL 里看到的 `rotation * -180 / π` 仍说明原始运行时存在坐标系换算；但对站内当前这套离线导出数据和浏览器渲染来说，和 kleho 对齐才是更可靠的可视化真值。

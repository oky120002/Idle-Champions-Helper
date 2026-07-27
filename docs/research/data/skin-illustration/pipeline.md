# 当前动画 / 立绘流水线：主链路与渲染规则

- 目标：回答“现在的生产主链路是什么”“hero-base 到底有没有动画”“页面消费哪些本地资源”“渲染矩阵怎么定”“默认 pose 和 slot 怎么选”。

## 当前主链路

| 步骤 | 文件 / 产物 | 作用 |
| --- | --- | --- |
| 1 | `scripts/build-idle-champions-data.ts` | 统一调度 definitions、头像、动画、静态立绘等公共数据同步 |
| 2 | `scripts/sync-idle-champions-animations.ts` | 基于 `champion-visuals.json` 发布 hero-base / skin 的本地 `.bin` 与摘要清单 |
| 3 | `public/data/v1/champion-animations/heroes/*.bin`、`public/data/v1/champion-animations/skins/*.bin` | 保存站内动画原始包，供默认帧渲染与前端 canvas 播放复用 |
| 4 | `public/data/v1/champion-animations.json` | 保存轻量 manifest：默认 sequence / frame、bounds、bytes、fps、sourceVersion |
| 5 | `scripts/sync-idle-champions-illustrations.ts` | 统一用本地动画 manifest 的默认帧渲染 hero-base / skin 静态 PNG；缺动画直接报错 |
| 6 | `public/data/v1/champion-illustrations/heroes/*.png`、`public/data/v1/champion-illustrations/skins/*.png` | 页面稳定展示用静态图；全部来源于本地动画默认帧，不再回退官方静态立绘 |
| 7 | `src/features/skelanim-player/*`、`src/pages/champion-detail/SkinArtworkDialog.tsx` | 详情弹层按需读取本地 `.bin`，浏览器端解码后用 `canvas` 播放 |

结果：当前站点既有静态立绘，也有动态动画；浏览器不会直连官方资源，只读取仓库内发布的 manifest、`.bin` 与 `.png`。

## hero-base 动画结论

- 当前 `champion-animations.json`（`updatedAt: 2026-07-25`）包含 `164` 个英雄本体动画，均已映射到本地 `.bin`。
- 因此 hero-base 与 skin 现在走同一套动画资源主线：
  - 动态展示读取本地 `.bin`
  - 静态立绘截取同一动画包的默认帧
- hero-base / skin 缺少动画包时，构建期直接报错，避免站内混入其他资源合同。

## 关键文件

| 文件 | 当前职责 | 关键结论 |
| --- | --- | --- |
| `scripts/sync-idle-champions-animations.ts` | 选择 hero-base / skin 动画源，写出 `.bin` 与 manifest | 现已支持全量 hero-base + skin 发布，并按 source 元数据增量复用 |
| `scripts/sync-idle-champions-illustrations.ts` | 读取本地动画 manifest，截默认帧生成静态 PNG | skin 与 hero-base 不再维护独立 pose 决策链路，也不再回退官方静态图 |
| `scripts/data/skelanim-codec.ts` | 解压并解析 `SkelAnim` | 前后端共享同一套二进制格式假设 |
| `scripts/data/skelanim-renderer.ts` | 计算 bounds、选择 frame、渲染静态 PNG | 默认帧裁切规则集中在这里 |
| `src/features/skelanim-player/browser-codec.ts` | 浏览器端解压 / 解码 `.bin` | 让 GitHub Pages 站点在不依赖上游的前提下播放动画 |
| `src/pages/champion-detail/useChampionDetailResources.ts` | 详情页加载 skin 动画资源 | 页面只消费本地 `kind === 'skin'` 动画集合 |

## 复用与容量结论

- hero-base / skin 复用同一套官方 `SkelAnim` 基座数据，不再拆成两套资源合同。
- 当前全量发布结果：
  - `public/data/v1/champion-animations.json`：877 项（164 hero-base + 713 skin）
  - `public/data/v1/champion-animations/`：约 166 MB
  - `public/data/v1/champion-illustrations/`：约 49 MB
- 这比预渲染 GIF / APNG / WebM 更稳，也避免再存一份完整逐帧 JSON。

## 资源识别

以下资源必须继续走 SkelAnim 解码 + pose 渲染，而不是把“解包出一张 PNG”直接当最终立绘：

- `remotePath` 包含 `/Characters/`
- 或 `champion-visuals.json` 指向的英雄本体 / 皮肤 `base`、`large`、`xl`

## 渲染矩阵

| 项目 | 当前规则 |
| --- | --- |
| 裁切来源 | 用 `sourceX / sourceY / sourceWidth / sourceHeight` 从 atlas 裁 piece |
| pivot | 使用 `centerX / centerY` |
| 平移 | 使用 `frame.x / frame.y` |
| 旋转 | 使用 `-frame.rotation` |
| 缩放 | 使用 `frame.scaleX / frame.scaleY` |
| 坐标系 | `y` 轴向下为正 |
| 绘制顺序 | 所有可见 piece 按 `depth` 升序绘制 |

这条规则修正了早期“人物倒置、看起来不像人”的问题。

## 画布边界

- 遍历当前 frame 的全部可见 piece。
- 把四个角经过 transform 后的坐标汇总为 `minX / minY / maxX / maxY`。
- 以此创建最小可容纳画布，并在输出时裁掉透明边。
- 因此当前尺寸不是 atlas 尺寸，而是内容实际边界。

## pose 与 slot 选择

### 默认 pose

当前默认逻辑是：先按 `preferredSequenceIndexes`，否则按资源内 sequence 原始顺序；对每个 sequence 先按 `preferredFrameIndexes`，否则按 `0 -> 1 -> 2 ...`；取第一个可正常渲染的 pose 作为默认展示图。

原因：对大部分英雄本体和皮肤而言，`sequence 0 / frame 0` 更接近游戏静态展示；面积类启发式容易把某些 ultimate / 特效动作误判成主立绘。

### `sequence_override`

- 仍会读取 `graphic_defines.export_params.sequence_override`
- 只作为“尝试顺序信号”，不是绝对答案
- 若这些 sequence 不合适或不可渲染，仍会回退到原始顺序

### slot 选择

当前皮肤候选优先级是 `xl > large > base`，但只在姿态正确前提下用于选更高清资源。比较顺序是：

1. 先比较 slot 优先级
2. 再比较是否为静态 pose
3. 再比较像素面积与高度
4. 最后视为同等候选

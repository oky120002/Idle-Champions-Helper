# 当前离线渲染管线：渲染规则

- 日期：2026-04-16
- 目标：回答“哪些资源必须继续走 SkelAnim”“渲染矩阵怎么定”“默认 pose 和 slot 怎么选”。

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

# 当前离线渲染管线：主链路与关键文件

- 日期：2026-04-16
- 目标：回答“现在的生产主链路是什么”“哪几个文件负责什么”“页面消费哪些审计字段”。

## 当前主链路

| 步骤 | 文件 / 产物 | 作用 |
| --- | --- | --- |
| 1 | `scripts/build-idle-champions-data.mjs` | 调用立绘同步脚本 |
| 2 | `scripts/sync-idle-champions-illustrations.mjs` | 从 `public/data/v1/champion-visuals.json` 读取英雄本体 / 皮肤候选 |
| 3 | `scripts/data/skelanim-codec.mjs` | 对 `Characters/...` 的 `SkelAnim` 资源解码 |
| 4 | `scripts/data/skelanim-renderer.mjs` | 选择 pose 并渲染完整 PNG |
| 5 | `public/data/v1/champion-illustrations/heroes/*.png`、`public/data/v1/champion-illustrations/skins/*.png` | 写出最终页面图片 |
| 6 | `public/data/v1/champion-illustrations.json` | 写出页面消费清单与审计元数据 |
| 7 | 页面运行时 | 只消费本地静态图与审计字段，不再做骨骼分件合成 |

结果：页面不再显示 atlas 碎片图；浏览器只承担普通图片展示；视觉正确性的责任点集中到构建脚本。

## 关键文件

| 文件 | 当前职责 | 关键结论 |
| --- | --- | --- |
| `scripts/data/skelanim-codec.mjs` | 解压并解析 `SkelAnim` | 帧参数顺序已确认是 `(depth, rotation, scaleX, scaleY, x, y)` |
| `scripts/data/skelanim-renderer.mjs` | 计算 bounds、选 pose、按 depth 绘制 PNG | 已修正关键坐标系：`y` 轴向下为正 |
| `scripts/data/skelanim.test.mjs` | 覆盖参数顺序、depth、`y` 轴和 pose 选择 | 保证底层规则不回退 |
| `scripts/sync-idle-champions-illustrations.mjs` | 选候选、拉远端、渲染或解包、写盘 | 是主入口与覆盖层注入点 |
| `scripts/build-idle-champions-data.mjs` | 统一数据流水线入口 | 对应 `npm run data:official` |
| `src/domain/types.ts` | 定义 `ChampionIllustration` 与 `ChampionIllustrationRender` | 约束页面消费合同 |

## 页面审计字段

`public/data/v1/champion-illustrations.json` 当前保留：`sourceSlot`、`sourceGraphicId`、`sourceGraphic`、`sourceVersion`、`manualOverride`、`render.pipeline`、`render.sequenceIndex`、`render.sequenceLength`、`render.isStaticPose`、`render.frameIndex`、`render.visiblePieceCount`、`render.bounds`。

这些字段只用于排查来源、确认默认 `sequence / frame` 和 override 命中，前端不依赖它们重新渲染。

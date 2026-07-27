# 立绘页：数据设计、构建流水线与体积守门

- 目标：回答“页面到底读哪些数据”“构建期脚本要做什么”“怎样控制 GitHub Pages 体积”。

## 数据与目录设计

- `public/data/<version>/champion-visuals.json`：继续作为官方资源定位基座，保留 `graphicId / sourceGraphic / sourceVersion / remoteUrl / delivery` 等元数据。
- `public/data/<version>/champion-illustrations.json`：页面消费清单，只回答“页面最终怎么展示”，不复写底层官方资源定位逻辑。
- 清单字段包括：`id`、`championId`、`skinId`、`kind`、`championName`、`illustrationName`、`seat`、`sourceSlot`、`sourceGraphicId`、`sourceGraphic`、`sourceVersion`、`image.{path,width,height,bytes,format}`。
- 产物目录为 `public/data/<version>/champion-illustrations/heroes/` 与 `public/data/<version>/champion-illustrations/skins/`；英雄本体与皮肤按 `<championId>`、`<skinId>` 命名。

## 构建期资源流水线

- 入口脚本：`scripts/sync-idle-champions-illustrations.ts`，并挂进 `npm run data:official`。
- 脚本职责：读取本地 `champion-animations.json` 与 `champion-visuals.json` 产物；按 hero / skin 枚举展示单元；读取本地 `.bin` 资源、硬编码 `delivery:'zlib-png'`；通过 `resolveWalkPosterPose` 选定单一行走立绘 pose 并渲染为静态 PNG；不做候选挑选、不做透明边裁切；输出页面衍生图与展示清单，打印总体积报告。
- 当前不做源图候选挑选、透明边裁切或 `WebP` 编码；这些能力不属于现行构建合同。

## GitHub Pages 体积守门

1. 只发布清单中的页面展示单元；当前为 `877` 个，不发布全部技术槽位原图。
2. 页面统一消费衍生图，不直接引用原始 PNG。
3. 脚本只计算并打印 `totalBytes` 总体积报告，不执行阈值阻断。
4. 新数据版本上线时，应允许清理旧版本立绘二进制，避免仓库历史和工作树持续膨胀。

# 立绘页：数据设计、构建流水线与体积守门

- 日期：2026-04-15
- 目标：回答“页面到底读哪些数据”“构建期脚本要做什么”“怎样控制 GitHub Pages 体积”。

## 数据与目录设计

- `public/data/<version>/champion-visuals.json`：继续作为官方资源定位基座，保留 `graphicId / sourceGraphic / sourceVersion / remoteUrl / delivery` 等元数据。
- `public/data/<version>/champion-illustrations.json`：页面消费清单，只回答“页面最终怎么展示”，不复写底层官方资源定位逻辑。
- 建议字段至少包括：`id`、`championId`、`skinId`、`kind`、`championName`、`illustrationName`、`seat`、`sourceSlot`、`sourceGraphicId`、`sourceGraphic`、`sourceVersion`、`image.{path,width,height,bytes,format}`。
- 目录建议：`public/data/<version>/champion-illustrations/heroes/` 与 `public/data/<version>/champion-illustrations/skins/`；英雄本体与皮肤按 `<championId>`、`<skinId>` 命名。

## 构建期资源流水线

- 入口脚本：`scripts/sync-idle-champions-illustrations.mjs`，并挂进 `npm run data:official`。
- 脚本职责：读取本地 `champion-animations.json` 与 `champion-visuals.json` 产物；按 hero / skin 枚举展示单元；读取本地 `.bin` 资源、硬编码 `delivery:'zlib-png'`；通过 `resolveWalkPosterPose` 选定单一行走立绘 pose 并渲染为静态 PNG；不做候选挑选、不做透明边裁切；输出页面衍生图与展示清单，打印总体积报告。
- 后续若要引入源图候选挑选，规则应是“全部候选都解包 / 渲染，优先选内容高度更高、面积更大的图”，不靠槽位名字硬编码、也不固定偏好 `large` / `xl`；当前实现未做候选挑选。
- 后续若要做透明边裁切与 `WebP` 编码，应在 Node 侧引入 `sharp`，不把编码压缩逻辑放到浏览器运行时；当前实现未做裁切与 WebP。

## GitHub Pages 体积守门

1. 只发布 `851` 个页面展示单元，不发布全部 `3010` 个技术槽位原图。
2. 页面统一消费衍生图，不直接引用原始 PNG。
3. 脚本目前只计算并打印 `totalBytes` 总体积报告，阈值阻断尚未实现；后续如需站点体积守门，应单独引入阈值比较与失败逻辑。
4. 新数据版本上线时，应允许清理旧版本立绘二进制，避免仓库历史和工作树持续膨胀。

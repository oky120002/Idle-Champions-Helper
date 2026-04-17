# 立绘页：数据设计、构建流水线与体积守门

- 日期：2026-04-15
- 目标：回答“页面到底读哪些数据”“构建期脚本要做什么”“怎样控制 GitHub Pages 体积”。

## 数据与目录设计

- `public/data/<version>/champion-visuals.json`：继续作为官方资源定位基座，保留 `graphicId / sourceGraphic / sourceVersion / remoteUrl / delivery` 等元数据。
- `public/data/<version>/champion-illustrations.json`：页面消费清单，只回答“页面最终怎么展示”，不复写底层官方资源定位逻辑。
- 建议字段至少包括：`id`、`championId`、`skinId`、`kind`、`championName`、`illustrationName`、`seat`、`sourceSlot`、`sourceGraphicId`、`sourceGraphic`、`sourceVersion`、`image.{thumbPath,displayPath,width,height,format}`。
- 目录建议：`public/data/<version>/champion-illustrations/thumbs/` 与 `public/data/<version>/champion-illustrations/display/`；英雄本体与皮肤按 `heroes/<championId>`、`skins/<skinId>` 命名。

## 构建期资源流水线

- 入口脚本：`scripts/sync-idle-champions-illustrations.mjs`，并挂进 `npm run data:official`。
- 脚本职责：读取 definitions 与 `champion-visuals.json`；枚举展示单元；下载候选资源；按 `delivery` 解包；在 `SkelAnim` 场景下解析 piece / frame；渲染候选静态 pose；计算真实宽高与内容边界；选择页面主来源；裁透明边；输出页面衍生图与展示清单；写出体积和尺寸审计摘要。
- 源图选择不应靠槽位名字硬编码；更稳妥的规则是：全部候选都解包 / 渲染，优先选“内容高度更高、内容面积更大”的图，而不是固定偏好 `large` 或 `xl`。
- 建议在 Node 侧引入 `sharp` 完成裁切、透明保留与 `WebP` 编码，而不是把编码压缩逻辑放到浏览器运行时。

## GitHub Pages 体积守门

1. 只发布 `833` 个页面展示单元，不发布全部 `3010` 个技术槽位原图。
2. 页面统一消费衍生图，不直接引用原始 PNG。
3. 脚本必须输出总体积报告，并在接近上限时失败；建议把站点构建产物接近 `850 MB` 设为保守失败阈值，为其他资源预留余量。
4. 新数据版本上线时，应允许清理旧版本立绘二进制，避免仓库历史和工作树持续膨胀。

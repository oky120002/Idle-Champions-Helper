# 动画 / 立绘落地：仓库方案与当前流水线

- 日期：2026-04-17
- 目标：回答“仓库里最终怎样接这套数据”“当前已经落地到什么程度”。

## 当前仓库方案

- 保留 `public/data/v1/champion-visuals.json` 作为官方资源定位基座。
- 新增 `scripts/sync-idle-champions-animations.mjs`，把 hero-base / skin 的官方 `SkelAnim` 原始包发布到仓库内的 `public/data/v1/champion-animations/**/*.bin`。
- `scripts/sync-idle-champions-illustrations.mjs` 不再为 skin 维护独立 pose 决策，而是统一读取 `champion-animations.json` 的默认 `sequence / frame` 来生成静态 PNG。
- 页面层保留静态图展示能力，同时在详情弹层按需加载本地 `.bin` 做 canvas 动画播放。

## 当前建议流水线

1. 拉取最新 definitions，并重建 `champion-visuals.json`
2. 用 `scripts/sync-idle-champions-animations.mjs` 选择 hero-base / skin 的本地动画源并发布 `.bin`
3. 预计算每个 sequence 的摘要，写入 `public/data/v1/champion-animations.json`
4. 用同一份 manifest 的默认帧生成 `public/data/v1/champion-illustrations/**/*.png`
5. 前端详情弹层按需读取本地 `.bin`，浏览器端解码后用 `canvas` 播放

## 直接回答

- “有没有能组装起来的方案？”：有，主线已经从“构建期合一张静态图”升级到“构建期发布原始动画包 + 默认帧 PNG，运行时按需播放”。
- “游戏基座里有没有类似组装坐标和规则？”：有，仍然主要藏在 `graphic_defines.type = 3 (SkelAnim)` 对应的客户端二进制与运行时代码里，不在普通 definitions 字段里。
- “是不是已有现成可直接读的完整立绘 JSON 坐标表？”：没有；当前仓库选择直接复用官方原始容器，不额外存一份完整逐帧 JSON。
- “hero-base 和 skin 是不是同一套基座？”：是；当前已确认 hero-base 也有动画包，因此两者共用同一条动画主线。

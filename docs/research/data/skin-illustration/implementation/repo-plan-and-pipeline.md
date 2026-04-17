# 皮肤立绘落地：仓库方案与建议流水线

- 日期：2026-04-16
- 目标：回答“仓库里应该怎样接这套数据”“最终应如何回答这个主题问题”。

## 仓库可落地方案

- 保留 `public/data/v1/champion-visuals.json` 作为官方资源定位基座。
- 把 `scripts/sync-idle-champions-illustrations.mjs` 升级为 SkelAnim 解析器与静态渲染器，在构建期直接输出页面消费的完整立绘。
- 页面层可以基本不动：`src/pages/ChampionDetailPage.tsx` 继续读取 `public/data/v1/champion-illustrations.json`；首要修复点是构建期资源同步脚本，不是页面组件。

## 建议流水线

1. 按 `graphic_id` 下载 `Characters/...`
2. zlib 解压并读取纹理与 SkelAnim 元数据
3. 依据 `sequence_override`、默认 sequence 或显式规则选择静态 pose
4. 按 `depth + transform + pivot + UV` 合成完整图
5. 裁透明边并输出页面用 `display / thumb`
6. 在 `public/data/v1/champion-illustrations.json` 追加 `renderSequence / renderFrame / renderSourceType / renderBounds`

## 直接回答

- “有没有能组装起来的方案？”：有，主线就是把客户端组装过程离线搬进构建脚本。
- “游戏基座里有没有类似组装坐标和规则？”：有，但主要藏在 `graphic_defines.type = 3 (SkelAnim)` 对应的客户端二进制与运行时代码里，不在普通 definitions 字段里。
- “是不是已有现成可直接读的完整立绘 JSON 坐标表？”：没有。
- “`preview_graphic_id` 或 `additional_shop_graphics` 能否直接替代 pose 判断？”：不能。

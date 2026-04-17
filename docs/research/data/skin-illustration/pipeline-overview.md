# 当前动画 / 立绘流水线：主链路与关键文件

- 日期：2026-04-17
- 目标：回答“现在的生产主链路是什么”“hero-base 到底有没有动画”“页面到底消费哪些本地资源”。

## 当前主链路

| 步骤 | 文件 / 产物 | 作用 |
| --- | --- | --- |
| 1 | `scripts/build-idle-champions-data.mjs` | 统一调度 definitions、头像、动画、静态立绘等公共数据同步 |
| 2 | `scripts/sync-idle-champions-animations.mjs` | 基于 `champion-visuals.json` 发布 hero-base / skin 的本地 `.bin` 与摘要清单 |
| 3 | `public/data/v1/champion-animations/heroes/*.bin`、`public/data/v1/champion-animations/skins/*.bin` | 保存站内动画原始包，供默认帧渲染与前端 canvas 播放复用 |
| 4 | `public/data/v1/champion-animations.json` | 保存轻量 manifest：默认 sequence / frame、bounds、bytes、fps、sourceVersion |
| 5 | `scripts/sync-idle-champions-illustrations.mjs` | 优先用本地动画 manifest 的默认帧渲染 hero-base / skin 静态 PNG |
| 6 | `public/data/v1/champion-illustrations/heroes/*.png`、`public/data/v1/champion-illustrations/skins/*.png` | 页面稳定展示用静态图；全部来源于本地动画默认帧，只有未来 hero-base 缺动画时才回退 |
| 7 | `src/features/skelanim-player/*`、`src/pages/champion-detail/SkinArtworkDialog.tsx` | 详情弹层按需读取本地 `.bin`，浏览器端解码后用 `canvas` 播放 |

结果：当前站点既有静态立绘，也有动态动画；浏览器不会直连官方资源，只读取仓库内发布的 manifest、`.bin` 与 `.png`。

## hero-base 动画结论

- 2026-04-17 的 definitions 审计结果表明，当前 `161 / 161` 个英雄本体都能映射到 `graphic_defines.type = 3` 的 `Characters/...` 动画资源。
- 因此 hero-base 与 skin 现在走同一套动画资源主线：
  - 动态展示读取本地 `.bin`
  - 静态立绘截取同一动画包的默认帧
- 仅保留“未来若某个新 hero-base 没有动画包时，退回静态合成”的兜底路径。

## 关键文件

| 文件 | 当前职责 | 关键结论 |
| --- | --- | --- |
| `scripts/sync-idle-champions-animations.mjs` | 选择 hero-base / skin 动画源，写出 `.bin` 与 manifest | 现已支持全量 hero-base + skin 发布，并按 source 元数据增量复用 |
| `scripts/sync-idle-champions-illustrations.mjs` | 读取本地动画 manifest，截默认帧生成静态 PNG | skin 与 hero-base 不再维护独立 pose 决策链路 |
| `scripts/data/champion-graphic-resource-cache.mjs` | 统一缓存原始远端包、解码 PNG / SkelAnim | 当前仅保留现行动画渲染所需能力 |
| `scripts/data/skelanim-codec.mjs` | 解压并解析 `SkelAnim` | 前后端共享同一套二进制格式假设 |
| `scripts/data/skelanim-renderer.mjs` | 计算 bounds、选择 frame、渲染静态 PNG | 默认帧裁切规则集中在这里 |
| `src/features/skelanim-player/browser-codec.ts` | 浏览器端解压 / 解码 `.bin` | 让 GitHub Pages 站点在不依赖上游的前提下播放动画 |
| `src/pages/champion-detail/useChampionDetailResources.ts` | 详情页加载 skin 动画资源 | 页面只消费本地 `kind === 'skin'` 动画集合 |

## 复用与容量结论

- hero-base / skin 复用同一套官方 `SkelAnim` 基座数据，不再拆成两套资源合同。
- 当前全量发布结果：
  - `public/data/v1/champion-animations.json`：833 项（161 hero-base + 672 skin）
  - `public/data/v1/champion-animations/`：约 155 MB
  - `public/data/v1/champion-illustrations/`：约 24 MB
- 这比预渲染 GIF / APNG / WebM 更稳，也避免再存一份完整逐帧 JSON。

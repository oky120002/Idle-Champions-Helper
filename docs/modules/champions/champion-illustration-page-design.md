# 英雄立绘页设计稿

- 日期：2026-04-15
- 目标：在“只用 GitHub Pages、零额外服务、零额外成本”的前提下，稳定展示全部英雄本体立绘和全部皮肤立绘。
- 当前结论：主方案不能依赖浏览器运行时直连官方 `mobile_assets`；最优路径是构建期抓取、解包、渲染并发布站内静态衍生图，运行时只读本地资源。
- 2026-04-16 补充：很多英雄 / 皮肤主立绘本质上是 `graphic_defines.type = 3 (SkelAnim)` 分件动画资源，主链路应理解为“解压二进制 + 解析 `sequence / frame` + 合成静态 pose”，而不是只裁 atlas。底层证据见 `docs/research/data/skin-illustration-assembly-research.md` 与 `docs/research/data/skin-illustration-render-pipeline-research.md`。

## 页面口径

- 页面要展示的单元是 `161` 个英雄本体立绘 + `672` 个皮肤立绘，共 `833` 个展示单元。
- 不需要把 `portrait / base / large / xl` 等全部技术槽位原样公开；按技术槽位全量算会到 `3010` 个资源单元，超出页面真实需求。
- 当前仓库首版产物已简化为 `public/data/v1/champion-illustrations/heroes/*.png` 与 `public/data/v1/champion-illustrations/skins/*.png`；文中 `thumbs / display / webp` 只是后续可演进的资源设计，不代表 2026-04-16 的唯一实现。

## 为什么必须走构建期衍生图

- 浏览器运行时直连官方资源不可靠：`Characters/...` 常需要先做 `zlib inflate`，很多主立绘还要继续走 `SkelAnim` 组装；官方 `mobile_assets` 也未见稳定 CORS 允许头。
- GitHub Pages 是纯静态托管；生产页不能把“跨域下载官方资源再现场解包”当成稳定前提。
- GitHub Pages 还有体积约束：发布站点 `<= 1 GB`、源仓库建议 `<= 1 GB`、每月 `100 GB` 软带宽；因此更合理的策略是只发布页面要消费的衍生图，而不是把所有原始技术槽位都塞进仓库。

## 页面范围与非目标

| 类别 | 内容 |
| --- | --- |
| 页面负责 | 展示全部英雄本体立绘、全部皮肤立绘；支持中文 / 英文名称、按英雄 / `seat` / 皮肤 / 联动队伍筛选；支持单张大图查看 |
| 页面不负责 | 运行时解析官方远端资源、展示全部头像资源、原样暴露 `base / large / xl` 技术槽位、首屏一次性下载全部大图原件 |

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

## 页面运行时策略

- 正式立绘页只依赖 `champion-illustrations.json` 与站内图片目录，路径拼接继续基于 `import.meta.env.BASE_URL`。
- 列表默认加载 `thumb`，点开单张时再加载 `display`；所有图片启用 `loading="lazy"`。
- `src/components/ChampionVisualWorkbench.tsx` 可继续保留，但应定位为调试 / 研究工作台，不再承担正式立绘页主展示职责。

## GitHub Pages 体积守门

1. 只发布 `833` 个页面展示单元，不发布全部 `3010` 个技术槽位原图。
2. 页面统一消费衍生图，不直接引用原始 PNG。
3. 脚本必须输出总体积报告，并在接近上限时失败；建议把站点构建产物接近 `850 MB` 设为保守失败阈值，为其他资源预留余量。
4. 新数据版本上线时，应允许清理旧版本立绘二进制，避免仓库历史和工作树持续膨胀。

## 明确不选的方案

- 方案 A：页面运行时直连官方 `mobile_assets`；原因是 CORS 不稳定、GitHub Pages 无代理、生产稳定性过度依赖外部跨域策略。
- 方案 B：把所有原始技术槽位图片都发布到站内；原因是页面不需要、体积膨胀过快、重复价值高。
- 方案 C：新增 CDN、对象存储、代理或付费图床；原因是违背当前“只用 GitHub Pages、零额外成本”的前提。

## 实施拆分

1. 资源脚本：补立绘同步脚本、生成页面衍生图与展示清单、接入 `npm run data:official`
2. 页面接入：新增独立立绘页，列表读 `thumb`，大图层读 `display`，支持筛选与中英名称
3. 收尾：把 `ChampionVisualWorkbench` 降级为调试入口，加入体积审计和构建失败阈值

## 验收标准

- GitHub Pages 在线环境下，不依赖官方远端跨域读取，也能稳定展示全部英雄本体立绘和全部皮肤立绘。
- 页面刷新、切语言、切筛选条件时，不会退回“只显示 `remoteUrl / graphicId`”的调试态。
- `npm run data:official` 一次执行后，能产出页面所需的立绘资源和清单。
- 页面路径和资源路径都能在 GitHub Pages 项目站前缀下正常工作。
- 构建流程能输出资源总量与体积摘要，并在接近上限时阻断发布。

## 参考

- `docs/research/data/champion-portrait-asset-research.md`
- `docs/research/data/champion-visual-asset-research.md`
- `docs/research/data/champion-image-asset-sizing-research.md`
- `docs/research/data/skin-illustration-assembly-research.md`
- `docs/research/data/skin-illustration-render-pipeline-research.md`
- `public/data/v1/champion-visuals.json`
- `src/components/ChampionVisualWorkbench.tsx`
- [GitHub Pages: What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

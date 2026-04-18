# 立绘页：运行时策略、实施拆分与验收

- 日期：2026-04-15
- 目标：沉淀页面运行时做什么、不做什么，以及当前立绘页的实施拆分和验收口径。

## 页面运行时策略

- 正式立绘页只依赖 `champion-illustrations.json` 与站内图片目录，路径拼接继续基于 `import.meta.env.BASE_URL`。
- 列表默认只渲染首批 50 张静态立绘；只有继续展开时，剩余卡片才进入 DOM。
- 卡片 hover 时才按需加载对应 `champion-animations.json` 命中的 `skelanim` 动态预览；没有命中时继续停留在静态立绘。
- 所有静态图继续启用 `loading="lazy"`，动态预览不应阻塞首屏结果出现。
- `src/components/ChampionVisualWorkbench.tsx` 可继续保留，但应定位为调试 / 研究工作台，不再承担正式立绘页主展示职责。

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

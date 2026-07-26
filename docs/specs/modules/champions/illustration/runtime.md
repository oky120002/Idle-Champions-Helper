# 立绘页：运行时策略

- 正式立绘页只依赖 `champion-illustrations.json` 与站内图片目录，路径拼接基于 `import.meta.env.BASE_URL`。
- 列表默认只渲染首批 50 张静态立绘；继续展开时剩余卡片才进入 DOM。
- 卡片 hover 时按需加载 `champion-animations.json` 命中的 `skelanim` 动态预览；无命中时停留静态立绘。
- 所有静态图启用 `loading="lazy"`；动态预览不阻塞首屏。
- `src/components/ChampionVisualWorkbench.tsx` 定位为调试/研究工作台，不承担正式立绘页主展示；当前 `src/pages/` 与 `src/app/App.tsx` 无引用。

（资源策略决策见 `decisions/0001-illustration-static-over-remote.md`）

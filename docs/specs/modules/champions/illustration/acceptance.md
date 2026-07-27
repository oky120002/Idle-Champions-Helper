# 立绘页：验收标准

## 验收

- GitHub Pages 在线环境下，不依赖官方远端跨域读取，也能稳定展示全部英雄本体立绘与皮肤立绘。
- 页面刷新、切语言、切筛选条件时，不退回「只显示 `remoteUrl / graphicId`」的调试态。
- `npm run data:official` 一次执行后，能产出页面所需的立绘资源和清单。
- 页面路径和资源路径在 GitHub Pages 项目站前缀下正常工作。
- 构建流程输出资源总量与体积摘要；当前不承诺阈值阻断。

## 参考

- `docs/research/data/skin-illustration/pipeline.md`
- `docs/research/data/portrait-asset/README.md`
- `docs/research/data/visual-asset/README.md`
- `public/data/v1/champion-visuals.json`
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

# research 文档入口

- 作用：收纳外部事实、数据来源、部署和测试结论；默认只按主题进入，不通读整目录。

## 数据主题

- `docs/research/data/game-data-source-investigation.md`：官方 definitions、个人数据凭证、第三方站点边界。
- `docs/research/data/static-data-storage-research.md`：版本化 JSON、`IndexedDB`、`BASE_URL` 路径合同。
- `docs/research/data/champion-detail-fields-research.md`：英雄详情页字段合同与归一化建议。
- `docs/research/data/official-formation-layout-extraction-research.md`：官方阵型布局字段落点、去重签名与输出口径。
- `docs/research/data/language-id-7-chinese-definitions-research.md`：`language_id=7` 官方中文覆盖范围。
- `docs/research/data/champion-portrait-asset-research.md`、`docs/research/data/champion-visual-asset-research.md`、`docs/research/data/champion-image-asset-sizing-research.md`、`docs/research/data/pet-catalog-data-research.md`：头像、立绘、图片尺寸、宠物目录与资源落地。
- `docs/research/data/skin-illustration-assembly-research.md`、`docs/research/data/skin-illustration-render-strategy-research.md`、`docs/research/data/skin-illustration-render-pipeline-research.md`：皮肤立绘资源来源、渲染路线和离线产物合同。
- `docs/research/data/skin-illustration-override-audit-research.md`、`docs/research/data/skin-illustration-alpha-fragmentation-research.md`、`docs/research/data/skin-illustration-pose-delta-audit-research.md`、`docs/research/data/skin-illustration-manual-review-heuristics.md`：人工 override 候选、alpha 审计、pose delta 审计与复核经验库。

## 部署与测试

- `docs/research/deployment/static-hosting-research.md`：GitHub Pages、`HashRouter`、`base` 路径与发布链路。
- `docs/research/deployment/china-static-hosting-research.md`：国内访问体验与托管备选。
- `docs/research/testing/regression-testing-research.md`：主分支回归门禁、测试分层与 GitHub Actions 设计。

## 读取建议

- 判定数据上游或账号导入边界：先读 `docs/research/data/game-data-source-investigation.md`。
- 判定公共数据目录、缓存和加载方式：先读 `docs/research/data/static-data-storage-research.md`。
- 判定立绘/图片资源链路：先读资源研究，再进入 skin 系列专题。
- 判定部署或测试：直接进对应主题文档，不需要先扫整个数据目录。

# research 文档入口

本目录存放调研、检索、选型和外部事实确认结果；默认只按主题读取对应子目录。

## 主题索引

- `docs/research/data/`：游戏数据来源、字段合同、资源链路、静态存储与版本化
- `docs/research/deployment/`：GitHub Pages 部署路线、国内访问体验与托管备选
- `docs/research/testing/`：整体回归测试策略与测试体系调研

## 当前高频文档

- `docs/research/data/game-data-source-investigation.md`：基础数据与个人数据来源边界
- `docs/research/data/static-data-storage-research.md`：版本化静态数据目录与存储策略
- `docs/research/data/champion-detail-fields-research.md`：英雄详情字段合同
- `docs/research/data/skin-illustration-pose-delta-audit-research.md`：current-vs-candidate 的皮肤立绘 delta 审计
- `docs/research/data/skin-illustration-manual-review-heuristics.md`：皮肤立绘人工复核经验库
- `docs/research/deployment/static-hosting-research.md`：正式部署方案与路由策略
- `docs/research/testing/regression-testing-research.md`：主分支整体回归门禁设计

## 使用约定

- 新调研先放到最贴近主题的二级目录
- 结论必须带时间、依据和适用边界
- 如果某个主题文档继续膨胀，优先在该主题目录补子索引或专题汇总

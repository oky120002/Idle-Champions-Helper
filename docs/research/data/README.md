# research/data 文档入口

- 作用：收纳数据来源、字段合同、资源链路、静态存储和皮肤立绘研究；只加载当前问题直接相关的子主题。

## 先读哪组

- 数据来源与个人数据边界：`docs/research/data/game-data-source/README.md`
- 静态数据目录与缓存合同：`docs/research/data/static-data-storage-research.md`
- 官方中文链路：`docs/research/data/language-id-7/README.md`
- 阵型布局字段与唯一布局提取：`docs/research/data/formation-layout/README.md`
- 英雄详情字段合同：`docs/research/data/champion-detail-fields/README.md`
- 宠物目录与获取方式：`docs/research/data/pet-catalog/README.md`

## 资源链路

- 英雄头像：`docs/research/data/portrait-asset/README.md`
- 英雄 / 皮肤资源引用与尺寸边界：`docs/research/data/visual-asset/README.md`

## 皮肤立绘主线

- 总入口：`docs/research/data/skin-illustration/README.md`
- 为什么会碎、组装数据在哪里：`docs/research/data/skin-illustration-assembly-research.md`
- 生产主路线为什么选构建期预合成：`docs/research/data/skin-illustration-render-strategy-research.md`
- 当前仓库已落地的离线渲染链路：`docs/research/data/skin-illustration-render-pipeline-research.md`
- 审计与人工经验入口：`docs/research/data/skin-illustration-override-audit-research.md`、`docs/research/data/skin-illustration-alpha-fragmentation-research.md`、`docs/research/data/skin-illustration-pose-delta-audit-research.md`、`docs/research/data/skin-illustration-manual-review-heuristics.md`

## 读取建议

- 做页面功能时，优先读当前主链路；历史抽样、审计和经验库只在需要修图、追根因或调 override 时再开。

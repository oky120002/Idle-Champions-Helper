# research/data 文档入口

- 作用：收纳数据来源、字段合同、资源链路、静态存储和皮肤 / 英雄立绘动画方案；只加载当前问题直接相关的子主题。

## 先读哪组

- 数据来源与个人数据边界：`docs/research/data/game-data-source/README.md`
- 静态数据目录、加载与工作流事实（存储决策见 `decisions/0003-static-data-storage.md`）：`docs/research/data/static-data-storage-research.md`
- 官方基座数据归一化审计：`docs/research/data/official-data-normalization-audit.md`
- 官方中文链路：`docs/research/data/language-id-7/README.md`
- 阵型布局字段与唯一布局提取：`docs/research/data/formation-layout/README.md`
- 英雄详情字段合同：`docs/research/data/champion-detail-fields/README.md`
- 宠物目录与获取方式：`docs/research/data/pet-catalog/README.md`

## 资源链路

- 英雄头像：`docs/research/data/portrait-asset/README.md`
- 英雄 / 皮肤资源引用与尺寸边界：`docs/research/data/visual-asset/README.md`

## 立绘与动画主线

- 总入口：`docs/research/data/skin-illustration/README.md`
- 为什么旧静态图会碎、字段边界在哪里：`docs/research/data/skin-illustration/problem.md`
- 官方运行时格式与二进制证据：`docs/research/data/skin-illustration/runtime-format.md`
- 外站动画机制、静态立绘技术约束与当前主线事实：`docs/research/data/skin-illustration/implementation.md`
- 当前仓库动画 / 默认帧流水线：`docs/research/data/skin-illustration/pipeline.md`

## 读取建议

- 默认只读当前主链路；override / alpha / delta 审计资料不作为现行方案入口。

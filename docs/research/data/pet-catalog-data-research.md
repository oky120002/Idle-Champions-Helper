# 宠物目录数据研究

- 日期：2026-04-16
- 作用：本页只做宠物目录主题入口；细节已拆到 `docs/research/data/pet-catalog/`。
- 当前结论：宠物目录可直接建立在官方 definitions 上，但图像字段指向的依然是 `SkelAnim` 资源；页面运行时不应直解官方资源，仍应走构建期离线合成。

## 先读哪篇

- 官方字段落点、图像字段与资源类型：`docs/research/data/pet-catalog/source-fields-and-assets.md`
- 获取方式归类、页面层可解释口径与仓库落地建议：`docs/research/data/pet-catalog/acquisition-and-repo-plan.md`

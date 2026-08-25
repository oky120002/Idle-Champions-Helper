**状态**: 已落地（2026-08，证据：`docs/audits/2026-08-visual-asset-full-audit.md`、`docs/specs/modules/champions/illustration/`）

# 视觉资源全量尺寸与体积审计

**优先级**：待评

## 是什么

当前视觉资源结论多基于样例；本提案把覆盖统计与体积统计从样例外推到全量，给仓库存储边界提供可靠依据：

1. **全量覆盖统计**：重跑英雄 / 皮肤四类 graphic 引用命中率，输出 N/N 命中表
2. **全量尺寸审计**：解包后尺寸分布表，确认是否仍在 `256x256` / `1024x1024` / `1024x512` 量级
3. **全量体积统计**：各目录 `totalBytes`，核对 GitHub Pages `1 GB` 上限余量

## 为何暂缓

样例结论已支持当前决策（192MB 在安全区）。全量审计是验证性工作，在仓库体积接近上限时优先级提升。

## 关联

- [size-and-storage.md](../../research/data/visual-asset/size-and-storage.md)（样例体积结论）
- [animation-repo-size.md](animation-repo-size.md)（动画存储治理提案，已归档）

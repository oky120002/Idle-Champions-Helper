# 视觉资源全量尺寸与体积审计

**Status**: Draft
**Type**: change
**Scope**: champions
**Created**: 2026-07-27

## 目标

当前视觉资源结论多基于样例（见 `research/data/visual-asset/size-and-storage.md`）；本 change 把覆盖统计与体积统计从样例外推到全量，给仓库存储边界提供可靠依据。

## 范围

- `scripts/sync-idle-champions-illustrations.ts`、`scripts/sync-idle-champions-portraits.ts`、`public/data/v1/champion-visuals.json`
- 全量英雄本体 / 皮肤 `base / large / xl / portrait` 资源

## 阶段 Checklist

- [ ] 全量覆盖统计重跑（英雄 / 皮肤四类 graphic 引用命中率）—— 验证方式：脚本输出 `N/N` 命中表，与 definitions 当前量级一致
- [ ] 全量尺寸审计（解包后尺寸分布）—— 验证方式：输出尺寸分布表，确认是否仍在 `256x256` / `1024x1024` / `1024x512` 量级
- [ ] 全量体积统计（站内已发布目录总体积）—— 验证方式：打印各目录 `totalBytes`，核对 GitHub Pages `1 GB` 上限余量

## 验收

覆盖 / 尺寸 / 体积三项全量数据落表，并更新 `research/data/visual-asset/size-and-storage.md` 的样例结论为全量结论；本 change 不描述系统现状。

## 落地后

- 本 change Status → Landed → 移 `archive/changes/`

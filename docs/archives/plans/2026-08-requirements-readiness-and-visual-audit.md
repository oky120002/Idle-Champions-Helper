# 需求库可完成性与视觉资源审计

**类型**: change

**状态**: 已落地

## 目标

核对全部活跃需求的当前可完成性，并完成可由现有静态产物独立闭合的视觉资源全量审计。

## 范围

- `docs/requirements/` 下全部活跃需求
- `public/data/v1/champion-visuals.json`
- `public/data/v1/champion-illustrations.json`
- `public/data/v1/champion-animations.json`
- 视觉资源目录的文件存在性、清单一致性、尺寸、体积和 GitHub Pages 余量

## 阶段 Checklist

- [x] 核对 14 份活跃需求及其代码、数据依赖
- [x] 识别当前可完整闭合的需求
- [x] 完成视觉资源引用覆盖、衍生图一致性、尺寸和体积审计
- [x] 更新 research/specs 当前事实
- [x] 归档已完成需求并记录终态
- [x] 运行文档治理与最小充分验证

## 验收

- 审计报告包含可复核的数量、命中率、尺寸分布、目录体积和 Pages 余量
- 视觉资源需求的全部子项均有证据，不保留悬空 checklist
- 需求库可完成性结论覆盖全部活跃需求
- 需求、research、specs、archives 的链接和终态符合治理规则

## 落地后

- 当前审计基线：`docs/audits/2026-08-visual-asset-full-audit.md`
- 需求可完成性结论：`docs/audits/2026-08-requirements-readiness-audit.md`
- 视觉资源当前事实：`docs/research/data/visual-asset/size-and-storage.md`

# 0001. 立绘资源用站内静态衍生图，不直连官方 mobile_assets

**Status**: Accepted
**Decided**: 2026-07-27

## 背景

立绘页需展示英雄本体立绘与皮肤立绘。资源获取有三条候选路径，需选定长期方案。

## 决策

采用站内静态衍生图：构建期从官方 `mobile_assets` 同步原始资源，离线合成为 PNG 发布到 `public/data/v1/champion-illustrations/`，页面运行时只读站内图片。

## 后果

- 正面：无 CORS/跨域依赖，GitHub Pages 可稳定服务；体积可控（构建期守门）；零运行时成本。
- 代价：构建期同步与合成脚本需维护；资源体积占 git 仓库（已有守门）。

## 替代方案

- **方案 A（运行时直连 mobile_assets）**：不选——CORS 不稳定、GitHub Pages 无代理、生产稳定性过度依赖外部跨域策略。
- **方案 B（全量技术槽位图片发布）**：不选——页面不需要、体积膨胀过快、重复价值高。
- **方案 C（CDN / 对象存储 / 付费图床）**：不选——违背「只用 GitHub Pages、零额外成本」前提。

## 关联

- 依据：`research/data/skin-illustration/`、`research/data/visual-asset/`、`research/data/portrait-asset/`
- 落地：`specs/modules/champions/illustration/runtime.md`

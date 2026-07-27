# 皮肤动画主线后续优化

**Status**: Draft
**Type**: change
**Scope**: champions
**Created**: 2026-07-27

## 目标

动画主线（`decisions/0004-animation-bin-canvas-playback.md`）已落地，本 change 收纳从中识别出的、暂未实现的观测与性能后续项。

## 范围

- `scripts/sync-idle-champions-animations.ts`、`scripts/build-idle-champions-data.ts`
- `src/features/skelanim-player/`、`src/pages/champion-detail/SkinArtworkDialog.tsx`

## 阶段 Checklist

- [ ] 动画包体积预算阈值 —— 验证方式：`data:official` 打印每英雄 `.bin` 体积并超阈值告警，防总体积无声增长
- [ ] 详情弹层关闭后释放播放器状态 —— 验证方式：关闭弹层后 `requestAnimationFrame` 停止、`.bin` 与解码纹理可回收
- [ ] 评估扩展到插画页（仍维持「用户触发后再播放」）—— 验证方式：CPU / 内存 / 懒加载策略评估结论

## 验收

上述项任一落地时，同步更新 `specs/modules/champions/illustration/` 对应章节；本 change 不描述系统现状。

## 落地后

- specs/ 更新点：`docs/specs/modules/champions/illustration/runtime.md`、`docs/specs/modules/champions/illustration/data-and-build.md`
- 本 change Status → Landed → 移 `archive/changes/`

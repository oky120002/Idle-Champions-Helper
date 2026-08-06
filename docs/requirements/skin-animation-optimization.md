# 皮肤动画主线后续优化

**优先级**：待评

## 是什么

动画主线（`decisions/0004-animation-bin-canvas-playback.md`）已落地，本提案收纳暂未实现的观测与性能后续项：

1. **动画包体积预算阈值**：`data:official` 打印每英雄 `.bin` 体积并超阈值告警，防总体积无声增长
2. **详情弹层状态释放**：关闭弹层后 `requestAnimationFrame` 停止、`.bin` 与解码纹理可回收
3. **插画页扩展评估**：扩展到插画页仍维持「用户触发后再播放」，评估 CPU / 内存 / 懒加载策略
4. **确定性候选选择规则**：全量样本不存在依赖槽位命名的误选
5. **透明边裁切与编码格式评估**：对比构建成本、总体积和视觉回归后决定是否采用 WebP

## 为何暂缓

动画主线功能完整可用，上述是观测到的优化空间，需逐项评估 ROI 后再决定是否做。

## 关联

- [ADR 0004](../decisions/0004-animation-bin-canvas-playback.md)（动画播放方案决策）
- `docs/specs/modules/champions/illustration/runtime.md`（当前运行时规范）
- `docs/specs/modules/champions/illustration/data-and-build.md`（当前数据构建规范）

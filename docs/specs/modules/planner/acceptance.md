# planner 验收标准

planner 的整体完成判据（DoD）与关键验收指针。

## 总则

- 任何无法计算的模拟变量必须有 warning。
- unsupported 规则不静默计入目标量（`objectiveValue`）。
- UI 验收用 DOM、文本和状态断言，不用截图或图片识别。
- 推图仪表盘展示区域预估、击杀/存活上限、目标层对照和墙类型诊断；BUD 绝对值必须标注未校准。
- 伤害墙、存活墙、机制墙和设计上限的诊断必须来自结构化区域结果，不依赖展示文本匹配。
- 最终通过 `npm run lint && npm run typecheck && npm run test:run && npm run build && npm run privacy:scan`。

## 关键验收指针

- 数据源字段、BUD 校准和推荐信号覆盖证据：`docs/research/data/planner/README.md`
- 隐私边界与 `npm run privacy:scan`：`data-and-privacy.md`

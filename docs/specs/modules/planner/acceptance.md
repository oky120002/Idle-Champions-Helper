# planner 验收标准

planner 的整体完成判据（DoD）与关键验收指针。

## 总则

- 任何无法计算的模拟变量必须有 warning。
- unsupported 规则不静默计入目标量（`objectiveValue`）。
- UI 验收用 DOM、文本和状态断言，不用截图或图片识别。
- 最终通过 `npm run lint && npm run typecheck && npm run test:run && npm run build && npm run privacy:scan`。

## 关键验收指针

- 数据源字段确认与已知缺口：`data-source-confirmations.md`
- BUD 实测校准（绝对值待用户游戏内数据）：`bud-verification.md`
- signal 覆盖率（已识别 / unsupported 统计）：`signal-coverage.md`
- 隐私边界与 `npm run privacy:scan`：`data-and-privacy.md`

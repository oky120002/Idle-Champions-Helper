# delta 审计：结果与当前决策

- 日期：2026-04-16
- 目标：收纳这轮 delta 审计的分组结果与人工判断。

## 结论

- current-only 的 alpha 审计噪音较大；current-vs-candidate 的 delta 审计能继续缩小候选池。
- 对 9 个 alpha 高分样本做 delta 对比后，结果为：`promising = 3`、`weak = 1`、`negative = 5`。
- 最值得继续人工深看的 3 个样本是：`112` 女巫之光守望者、`351` 冒险休闲多纳尔、`298` 假期地下城主。
- 但即使这 3 个进入 `promising`，继续放大复核后，当前仍没有新增 override。

## 当前结果

- `351` 冒险休闲多纳尔：`promising`，best candidate `sequence 0 / frame 65`；指标会给高分，但肉眼差异很小，当前不足以写 override
- `112` 女巫之光守望者：`promising`，best candidate `sequence 0 / frame 28`；候选更收、更连贯，但 current 也完整可读，当前保守不写 override
- `298` 假期地下城主：`promising`，best candidate `sequence 1 / frame 36`；候选让漂浮饮料更靠近主体，但仍更像主题 props
- `496` 塞伦涅守望者：`weak`，best candidate `sequence 0 / frame 20`；有轻微改善，但收益不够强
- `282`、`210`、`103`、`59`、`306`：`negative`；候选没有真正消除 detached 主题 props，或与 current 基本等价

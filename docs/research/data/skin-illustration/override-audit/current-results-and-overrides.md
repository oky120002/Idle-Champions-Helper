# override 审计：当前结果与已落地规则

- 日期：2026-04-16
- 目标：收纳这轮审计结果总览与 4 条已落地 override。

## 当前结果总览

把已复核样本并入默认 `reviewedSkinIds` 后复跑，结果为：

- `non-obvious`：`0`
- `theme-expanded`：`0`
- `theme-small`：`0`
- `reviewed-safe`：默认 `--top 12` 展示 `12` 个高偏差但已人工下结论的参考样本；若改用 `--top 50`，当前共可看到 `17` 个已复核高偏差样本

含义：这套“尺寸偏差 + 主题分类”的第一轮系统抽样已经基本跑空；后续若还要扩样，必须换新启发式。

## 当前已落地的 4 条 override

- `368` 半精灵变异哨兵：`sequence 1 / frame 11`；尺寸 `115 x 162 -> 134 x 165`；把成图从同英雄组里明显偏窄拉回更自然宽度
- `520` 舞厅蔚：`sequence 1 / frame 7`；尺寸 `139 x 134 -> 111 x 131`；把横向展开偏大的默认 pose 收回来
- `473` 飞升阿斯代伦：`sequence 1 / frame 30`；尺寸 `189 x 166 -> 177 x 167`；收回横向外展武器，人物主体更集中
- `133` 星运伊芙琳：`sequence 0 / frame 7`；尺寸 `140 x 244 -> 142 x 182`；显著改善“画布过高、主体过小”

这 4 条规则都已写入 `scripts/data/champion-illustration-overrides.json`。

# delta 审计：人工复核结论与经验

- 日期：2026-04-16
- 目标：沉淀对 `promising` 样本的二次复核结论，以及这轮 delta 审计带来的可复用规则。

## 对 `promising` 样本的二次人工复核

- `112`：`sequence 0 / frame 26-30` 这一簇都比 current 稍收，说明不是单帧巧合；但 current 本身没有断手、断武器或主体崩坏，暂不写 override。若后面要做更激进优化，它仍是第一优先级回看样本。
- `351`：高分来自“大剑更接近主体”，但肉眼只看到刀身角度轻微内收，人物主体几乎没变；它是“长武器刚好接上主体时，alpha 分数会被放大”的典型假阳性。
- `298`：漂浮饮料确实更靠近身体，但仍明显是主题道具，不足以证明 current pose 选错。

结论：`promising` 很适合排人工优先级，但这 3 个 top 样本仍都不足以直接落规则。

## 经验补充

- delta 审计比 current-only 审计更接近“是否值得继续看”，因为它继续问：候选 pose 是否真的改善问题。
- `promising` 只代表“值得深看”，不代表“可以直接写 override”。
- `negative` 同样有价值：它能把很多“看起来可疑、但候选根本无收益”的主题 props 样本快速沉淀为反例。

## 下一步建议

1. 把 `112`、`351`、`298` 的二次人工结论沉淀进经验库。
2. 保持当前 override 列表不变。
3. 后续只在两种情况下继续深挖：出现新的高风险样本，或用户明确要求做更激进的人工优化。

当前保留的回看优先顺序是：`112` -> `351` -> `298`；这只是“优先回看名单”，不是默认应新增 override 的名单。

## 关联文件

- `scripts/data/illustration-pose-review.mjs`
- `scripts/data/illustration-pose-delta-analysis.mjs`
- `scripts/audit-idle-champions-illustration-pose-delta.mjs`
- `tests/unit/data/illustrationPoseDeltaAnalysis.test.mjs`
- `tmp/illustration-pose-delta-audit/report.json`
- `tmp/illustration-pose-delta-audit/index.html`
- `docs/research/data/skin-illustration-alpha-fragmentation-research.md`
- `docs/research/data/skin-illustration-manual-review-heuristics.md`

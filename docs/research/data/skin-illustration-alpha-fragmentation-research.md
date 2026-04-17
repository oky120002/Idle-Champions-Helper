# Idle Champions 皮肤立绘 alpha 连通域审计

- 日期：2026-04-16
- 作用：本页只做 alpha 审计入口；细节已拆到 `docs/research/data/skin-illustration/`。
- 当前结论：alpha 连通域启发式能找出 detached prop / fragment 样本，但噪音很大，更适合作为候选池生成器，而不是最终裁决器。

## 先读哪篇

- 方法、指标、脚本结果与候选样本：`docs/research/data/skin-illustration/alpha-method-and-results.md`
- 价值、局限、后续为什么要转 delta 审计：`docs/research/data/skin-illustration/alpha-limits-and-next-steps.md`

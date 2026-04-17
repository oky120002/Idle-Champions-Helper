# Idle Champions 皮肤立绘 pose delta 审计

- 日期：2026-04-16
- 作用：本页只做 delta 审计入口；细节已拆到 `docs/research/data/skin-illustration/`。
- 当前结论：delta 审计能把“当前图 detached”进一步收敛成“候选 pose 是否真的更连贯”，更接近人工复核的真实问题。

## 先读哪篇

- 方法、脚本、运行范围与输出：`docs/research/data/skin-illustration/delta-audit/README.md`
- 对 `promising` 样本的复核、经验补充与下一步：`docs/research/data/skin-illustration/delta-review-conclusions.md`

# 官方阵型布局提取调研

- 日期：2026-04-13
- 作用：本页只做官方布局主题入口；细节已拆到 `docs/research/data/formation-layout/`。
- 当前结论：官方 definitions 已包含阵型布局数据，仓库应采用“官方自动提取 -> 去重归并 -> 保留 `sourceContexts / applicableContexts` -> 手工覆写只做必要补丁”的主路线。

## 先读哪篇

- 原始来源、字段落点与归一化注意点：`docs/research/data/formation-layout/source-fields-and-normalization.md`
- 去重结果、仓库影响、当前边界与最终判断：`docs/research/data/formation-layout/dedupe-and-repo-impact.md`

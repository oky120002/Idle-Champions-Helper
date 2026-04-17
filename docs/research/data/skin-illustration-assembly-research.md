# Idle Champions 皮肤立绘组装方案调研

- 日期：2026-04-16
- 作用：本页只做立绘组装主题入口；细节已拆到 `docs/research/data/skin-illustration/`。
- 当前结论：皮肤立绘会碎，不是页面偶发 bug，而是把 `graphic_defines.type = 3 (SkelAnim)` 的 atlas 当成最终立绘直接写盘。

## 先读哪篇

- 根因、definitions 能给什么 / 不能给什么：`docs/research/data/skin-illustration/problem-and-evidence.md`
- 客户端缓存、二进制结构与运行时证据：`docs/research/data/skin-illustration/runtime-format.md`
- 仓库落地方案、剩余技术点与核对来源：`docs/research/data/skin-illustration/implementation-path.md`

## 何时加载

- 只要问题是“为什么会碎”或“官方有没有完整组装规则”，先读本页，再只进目标子文档。
- 如果问题已经变成“当前仓库怎么渲染”，改读 `docs/research/data/skin-illustration-render-pipeline-research.md`。

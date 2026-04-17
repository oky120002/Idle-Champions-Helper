# 皮肤立绘：仓库落地方向与剩余问题

- 日期：2026-04-16
- 作用：本页只保留实现入口；细节已拆到 `docs/research/data/skin-illustration/implementation/`。
- 当前结论：正确方向是把客户端的 SkelAnim 组装过程离线搬到构建脚本里，而不是继续在 `base / large / xl` atlas 里挑一张当成最终立绘。

## 先读哪篇

- 仓库落地方案、建议流水线与直接回答：`docs/research/data/skin-illustration/implementation/repo-plan-and-pipeline.md`
- 剩余技术点、仓库内外核对来源：`docs/research/data/skin-illustration/implementation/open-questions-and-sources.md`

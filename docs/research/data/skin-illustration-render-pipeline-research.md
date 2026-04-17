# Idle Champions 皮肤立绘离线渲染管线落地说明

- 日期：2026-04-16
- 作用：本页只做当前渲染管线入口；细节已拆到 `docs/research/data/skin-illustration/`。
- 当前结论：页面运行时不再做骨骼分件合成；主责任点已经收敛到构建期 Node 离线渲染管线。

## 先读哪篇

- 当前主链路、关键文件与页面审计字段：`docs/research/data/skin-illustration/pipeline-overview.md`
- 资源识别、矩阵、画布、pose 与 slot 选择：`docs/research/data/skin-illustration/pipeline-render-rules.md`
- override 落点、验证命令、已复核样例与剩余风险：`docs/research/data/skin-illustration/pipeline-operations.md`

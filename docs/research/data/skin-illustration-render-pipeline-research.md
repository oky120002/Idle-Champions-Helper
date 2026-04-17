# Idle Champions 动画 / 立绘生产管线说明

- 日期：2026-04-17
- 作用：本页只保留当前生产管线入口；细节已收敛到 `docs/research/data/skin-illustration/`。
- 当前结论：页面运行时不会直连官方资源；主责任点已经收敛到“构建期发布本地 `.bin` + manifest + 默认帧 PNG，详情弹层按需 canvas 播放”。

## 先读哪篇

- 当前主链路、hero-base 动画结论与关键文件：`docs/research/data/skin-illustration/pipeline-overview.md`
- 资源识别、sequence 选择、默认帧渲染规则：`docs/research/data/skin-illustration/pipeline-render-rules.md`
- 验证命令、全量重建入口与剩余风险：`docs/research/data/skin-illustration/pipeline-operations/validation-and-risks.md`

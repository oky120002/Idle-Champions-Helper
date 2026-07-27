# 当前动画 / 立绘流水线：风险证据

- 目标：记录现行动画主链路仍需留意的技术风险。
- 动画交付决策见 `decisions/0004-animation-bin-canvas-playback.md`；构建 / 运行时合同见 `specs/modules/champions/illustration/`。

## 当前剩余风险

- 现有增量复用依据是 definitions 里的 `sourceGraphicId / sourceGraphic / sourceVersion / sourceSlot`；若上游在不改这些字段的情况下静默替换文件内容，本地不会自动重新下载。
- 浏览器播放依赖 `DecompressionStream` 或 `fflate` 回退；极端旧环境可能只拿到静态 PNG。
- 全量动画目录当前约 166 MB，仍在 GitHub Pages 可接受范围内；增加资源类型前必须重新评估总体积。
- 默认帧选择当前依赖 `sequence_override` 和首个可渲染 frame；这和现有站内静态图已经对齐，但仍是工程约定，不是官方文档合同。

## 当前结论

- 皮肤 pose override、alpha 碎裂和 delta 人工复核流程已废弃，不作为生产主线。
- 当前最稳妥的维护方式是：先同步本地动画 `.bin`，再从同一份 manifest 生成静态 PNG，并让前端只消费站内发布的资源。
- 当前复跑与验证命令见 `docs/runbooks/public-data.md`。

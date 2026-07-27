# skin-illustration 主题入口

- 作用：收纳英雄本体与皮肤立绘 / 动画的根因、格式、路线、生产管线与仓库实现；只按当前问题进入一个叶子文档。

## 当前结论

皮肤立绘会碎，不是页面偶发 bug，而是把 `graphic_defines.type = 3 (SkelAnim)` 的 atlas 当成最终立绘直接写盘。当前主链路已收敛到“构建期发布本地 `.bin` + manifest + 默认帧 PNG，详情弹层按需 canvas 播放”，浏览器不直连官方资源。

## 相关决策

- 静态衍生图来源：`docs/decisions/0001-illustration-static-over-remote.md`
- 动画播放方案：`docs/decisions/0004-animation-bin-canvas-playback.md`
- 暂未实现的后续项：`docs/changes/2026-07-skin-illustration-followups.md`

## 叶子文档

- 为什么会碎、definitions 字段边界：`problem.md`
- 客户端缓存与 SkelAnim 二进制结构、运行时证据：`runtime-format.md`
- 路线硬约束、A/B 对比、推荐与实现：`strategy.md`
- 当前生产主链路、关键文件与渲染规则：`pipeline.md`
- 复跑命令、全量重建入口与剩余风险：`pipeline-validation.md`
- 外站动画机制、静态立绘技术约束与当前主线事实：`implementation.md`
- 剩余技术点与核对来源：`open-questions.md`

## 按问题加载

- “为什么会碎”或“definitions 字段够不够”：`problem.md` -> `runtime-format.md`
- “仓库里为什么现在能做动态动画”：`implementation.md`
- “现在的构建 / 发布 / 回退逻辑”：`pipeline.md`
- “要复跑、验收或评估风险”：`pipeline-validation.md`

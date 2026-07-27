# 动画 / 立绘：外站机制与当前资源形态

- 作用：沉淀「外站为什么能播放动画」与本仓库已发布资源的技术事实。
- 动画交付方案（构建期 `.bin` + 运行时 `canvas`）见 `decisions/0004-animation-bin-canvas-playback.md`；静态衍生图来源见 `decisions/0001-illustration-static-over-remote.md`；构建 / 运行时合同见 `specs/modules/champions/illustration/`。

## 外站为什么能动

`idle.kleho.ru/hero/strix/skins/` 不是在放 GIF / APNG / 视频，而是在前端读取动画描述数据后，用 `canvas` 逐帧重绘。页面会按皮肤的 `graphic_id` 拉取自己的动画描述文件，再加载 atlas 贴图并在浏览器播放。

可直接核对的外站现象：

- 页面入口：[idle.kleho.ru/hero/strix/skins/](https://idle.kleho.ru/hero/strix/skins/)
- 动画描述文件示例：[idle.kleho.ru/assets/animations/2609.json](https://idle.kleho.ru/assets/animations/2609.json)
- 官方原始资源示例：[master.idlechampions.com/~idledragons/mobile_assets/Characters/Event/Hero_Strix](https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Event/Hero_Strix)

`2609.json` 这类文件里能看到 `format`、`files`、`characters`、`sequences`、piece / frame 级别的动画信息。它的“动图”本质是：动画描述数据 + 纹理贴图 + 前端播放器，而不是一张已编码好的 GIF。

它的资源明显是旧快照：对老皮肤能返回数据，对较新资源直接 `404`，patch 时间也显示不是跟着当前官方 definitions 实时更新。价值是“证明技术上可行”，但不适合作为长期依赖源。

## 当前资源形态

仓库已有 `scripts/data/skelanim-codec.ts`、`scripts/data/skelanim-renderer.ts`、`scripts/sync-idle-champions-animations.ts` 与 `scripts/sync-idle-champions-illustrations.ts`。构建期发布站内 `.bin` + manifest，并从同一份默认 `sequence / frame` 渲染静态 PNG；页面可按需解码本地 `.bin` 用 canvas 播放，也可退回静态 PNG。浏览器不依赖官方资源直连。

## 当前动画主线事实

- 主线形态：构建期发布官方原始 `SkelAnim` `.bin` + 小 manifest（`public/data/v1/champion-animations.json`），运行时按需解码 + `canvas` 播放，失败回退静态 PNG。
- 静态图与动画共用同一 manifest 的默认 `sequence / frame`，不再为 skin 单独维护 pose 决策。
- 当前发布结果（`updatedAt: 2026-07-25`）：`champion-animations.json` 877 项（164 hero-base + 713 skin）；工作树中 `champion-animations/` 约 166 MB，`champion-illustrations/` 约 49 MB；合计远低于 GitHub Pages `1 GB` 站点上限。
- 完整构建 / 运行时合同与脚本职责见 `specs/modules/champions/illustration/data-and-build.md` 与 `specs/modules/champions/illustration/runtime.md`；风险证据见 `pipeline-validation.md`，复跑命令见 `docs/runbooks/public-data.md`。

## 主线边界

- 静态 PNG 继续保留，不能被动画链路替代。
- hero-base 或 skin 缺少动画包时，构建期报错，不静默混入其他资源合同。
- 不在列表页默认自动播放；不把完整逐帧 JSON 存站内。

## 相关决策

- 动画交付决策：`decisions/0004-animation-bin-canvas-playback.md`

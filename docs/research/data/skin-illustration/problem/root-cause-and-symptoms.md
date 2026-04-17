# 皮肤立绘问题：根因与现象

- 日期：2026-04-16
- 目标：回答“当前为什么会碎”“碎图不是页面偶发 bug”。

## 根因

- 当前详情页显示的本地 PNG 来自 `scripts/sync-idle-champions-illustrations.mjs`。
- 旧流程是：从 `public/data/v1/champion-visuals.json` 选 `large / base / xl` 候选 -> 下载 `mobile_assets` -> 用 `scripts/data/mobile-asset-codec.mjs` 解包 -> 直接写入 `public/data/v1/champion-illustrations/heroes|skins/*.png`。
- 很多 `Characters/...` 实际是 `graphic_defines.type = 3 (SkelAnim)` 分件动画资源；解包后拿到的往往只是 atlas，不是最终人物立绘。
- 所以页面出现“头、尾巴、武器、身体拆开散落”，本质是把 atlas 当成成图写盘，而不是页面层临时渲染异常。

## 当前可直接复核的碎图样例

- `public/data/v1/champion-illustrations/skins/332.png`
- `public/data/v1/champion-illustrations/skins/416.png`
- `public/data/v1/champion-illustrations/heroes/38.png`

这些样例足以说明：仅靠 `mobile_assets` 解包 PNG 还不够，后面还缺离线组装步骤。

# 皮肤立绘：根因与字段边界

- 目标：回答“当前立绘为什么会碎”“definitions 能稳定给什么、不能给什么”。

## 根因与现象

- 当前详情页显示的本地 PNG 来自 `scripts/sync-idle-champions-illustrations.ts`。
- 根因链路：从 `public/data/v1/champion-visuals.json` 选 `large / base / xl` 候选 -> 下载 `mobile_assets` -> 用 `scripts/data/mobile-asset-codec.ts` 解包 -> 直接写入 `public/data/v1/champion-illustrations/heroes|skins/*.png`（把 atlas 当成立绘写盘，缺少离线组装）。
- 很多 `Characters/...` 实际是 `graphic_defines.type = 3 (SkelAnim)` 分件动画资源；解包后拿到的往往只是 atlas，不是最终人物立绘。
- 所以页面出现“头、尾巴、武器、身体拆开散落”，本质是把 atlas 当成成图写盘，而不是页面层临时渲染异常。

### 当前可直接复核的碎图样例

- `public/data/v1/champion-illustrations/skins/332.png`
- `public/data/v1/champion-illustrations/skins/416.png`
- `public/data/v1/champion-illustrations/heroes/38.png`

这些样例足以说明：仅靠 `mobile_assets` 解包 PNG 还不够，后面还缺离线组装步骤。

## definitions 能给什么

- 英雄本体：`hero_defines[].graphic_id`、`hero_defines[].portrait_graphic_id`
- 皮肤：`hero_skin_defines[].details.base_graphic_id`、`large_graphic_id`、`xl_graphic_id`、`portrait_graphic_id`
- 类型区分：`Characters/... -> graphic_defines.type = 3`，`Portraits/... -> type = 1`
- 派生关系：`large / xl` 常带 `upscale`、`ref_graphic_id`、`sequence_override`，更像同一动画资源的派生版本

样例链路：

- `332 = Modron BBEG`：`base_graphic_id -> Characters/Event/Hero_BBEG_Modron`、`large_graphic_id -> Characters/Event/Hero_BBEG_Modron_2xup`、`xl_graphic_id -> Characters/Event/Hero_BBEG_Modron_4xup`、`portrait_graphic_id -> Portraits/Portrait_ModronBBEG`
- `416 = Plushie Evandra`：`base_graphic_id -> Characters/Hero_Evandra_Plushie`、`large_graphic_id -> Characters/Hero_Evandra_Plushie_2xup`、`xl_graphic_id -> Characters/Hero_Evandra_Plushie_4xup`、`portrait_graphic_id -> Portraits/Portrait_PlushieEvandra`

## definitions 不能给什么

- `public/data/v1/champion-details/*.json`、`public/data/v1/champion-visuals.json`、`public/data/v1/champion-illustrations.json` 都没有现成“完整立绘组装坐标表”。
- `hero_skin_defines.details` 只能给资源引用和少量变体槽位，例如 `noarm_graphic`、`nosword_graphic`、`companion_graphic_ids`、`additional_shop_graphics`；这些字段不能直接回答“怎么把角色拼出来”。
- 结论：definitions 解决“怎么定位资源”，不解决“怎么组装最终人物 pose”。

## 常见误解字段

- `preview_graphic_id`：当前快照只在 `adventure_defines[].rewards[].preview_graphic_id` 出现，对应 `graphic_defines.type = 1` 的 `Icons/...`，本质是奖励预览图标，不是英雄 / 皮肤主立绘。
- `additional_shop_graphics`：只出现在 `149 / 673` 个皮肤上，资源本身仍是 `graphic_defines.type = 3 (SkelAnim)`；内容多为变身形态、伙伴、魔宠或商店额外素材，不能直接替代主 pose 判断。

结论：`preview_graphic_id` 和 `additional_shop_graphics` 都不能绕过后续解码、选 frame、再合成这一步。

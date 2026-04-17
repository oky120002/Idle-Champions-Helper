# 皮肤立绘：根因与资源证据

- 日期：2026-04-16
- 目标：回答“当前为什么会碎”“definitions 能定位什么”“哪些字段不能直接替代主立绘 pose”。

## 根因

- 当前详情页渲染的本地 PNG 来自 `scripts/sync-idle-champions-illustrations.mjs`。
- 旧流程是：从 `champion-visuals.json` 选 `large / base / xl` 候选 -> 下载 `mobile_assets` -> 用 `scripts/data/mobile-asset-codec.mjs` 解包 -> 直接写入 `public/data/v1/champion-illustrations/heroes|skins/*.png`。
- 对很多 `Characters/...` 资源来说，解包结果只是 atlas，不是最终人物图；因此才会看到“头、尾巴、身体拆开散落”。
- 当前能直接看到碎片化产物的样例：`public/data/v1/champion-illustrations/skins/332.png`、`public/data/v1/champion-illustrations/skins/416.png`、`public/data/v1/champion-illustrations/heroes/38.png`。

## definitions 能给什么

| 类型 | 已核实字段 / 现象 | 结论 |
| --- | --- | --- |
| 英雄本体资源 | `hero_defines[].graphic_id`、`hero_defines[].portrait_graphic_id` | 能稳定定位英雄本体立绘与头像 |
| 皮肤资源 | `hero_skin_defines[].details.base_graphic_id / large_graphic_id / xl_graphic_id / portrait_graphic_id` | 能稳定定位皮肤本体与头像 |
| 类型区分 | `Characters/... -> graphic_defines.type = 3`；`Portraits/... -> type = 1` | 能判断哪些是 `SkelAnim`、哪些是普通头像 |
| 派生关系 | `large / xl` 常带 `upscale`、`ref_graphic_id`、`sequence_override` | 能看出这些槽位更像同一动画资源的派生版本 |

样例链路：

- `332 = Modron BBEG`：`base_graphic_id -> Characters/Event/Hero_BBEG_Modron`、`large_graphic_id -> Characters/Event/Hero_BBEG_Modron_2xup`、`xl_graphic_id -> Characters/Event/Hero_BBEG_Modron_4xup`、`portrait_graphic_id -> Portraits/Portrait_ModronBBEG`
- `416 = Plushie Evandra`：`base_graphic_id -> Characters/Hero_Evandra_Plushie`、`large_graphic_id -> Characters/Hero_Evandra_Plushie_2xup`、`xl_graphic_id -> Characters/Hero_Evandra_Plushie_4xup`、`portrait_graphic_id -> Portraits/Portrait_PlushieEvandra`

## definitions 不能给什么

- `public/data/v1/champion-details/*.json`、`public/data/v1/champion-visuals.json`、`public/data/v1/champion-illustrations.json` 都没有现成“完整立绘组装坐标表”。
- `hero_skin_defines.details` 只能给资源引用和少量变体槽位，例如 `noarm_graphic`、`nosword_graphic`、`companion_graphic_ids`、`additional_shop_graphics`；它们不能直接回答“怎么把人物拼出来”。
- 结论：definitions 解决“怎么定位资源”，不解决“怎么把角色拼出来”。

## `preview_graphic_id` 与 `additional_shop_graphics`

| 字段 | 复核结论 |
| --- | --- |
| `preview_graphic_id` | 当前快照全部出现在 `adventure_defines[].rewards[].preview_graphic_id`，对应 `graphic_defines.type = 1` 的 `Icons/...`，是奖励预览图标，不是英雄 / 皮肤主立绘 |
| `additional_shop_graphics` | 只出现在 `149 / 673` 个皮肤上，资源本身仍全部是 `graphic_defines.type = 3 (SkelAnim)`；内容多为变身形态、伙伴、宠物或商店额外素材，不能直接替代主 pose 判断 |

结论：`preview_graphic_id` 不能替代 pose 判断；`additional_shop_graphics` 也只是额外 SkelAnim 素材，仍要继续解码、选 frame、再合成。

# 皮肤立绘问题：definitions 字段边界

- 日期：2026-04-16
- 目标：回答“definitions 能稳定给什么”“哪些字段不能直接替代主立绘 pose 判断”。

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
- `additional_shop_graphics`：只出现在 `149 / 673` 个皮肤上，资源本身仍是 `graphic_defines.type = 3 (SkelAnim)`；内容多为变身形态、伙伴、宠物或商店额外素材，不能直接替代主 pose 判断。

结论：`preview_graphic_id` 和 `additional_shop_graphics` 都不能绕过后续解码、选 frame、再合成这一步。

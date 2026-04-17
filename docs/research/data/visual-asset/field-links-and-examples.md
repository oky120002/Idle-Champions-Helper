# 视觉资源：字段链路与样例

- 日期：2026-04-13
- 目标：回答 definitions 如何稳定定位英雄 / 皮肤视觉资源。

## 结论

- definitions 里不只有头像字段，也能稳定定位英雄本体立绘和皮肤立绘。
- 对可上阵的 `161` 名英雄：`161 / 161` 都有 `hero_defines[].graphic_id` 与 `hero_defines[].portrait_graphic_id`。
- 对关联到的 `672` 条皮肤：`672 / 672` 都带 `base_graphic_id / large_graphic_id / xl_graphic_id / portrait_graphic_id`。
- 这些资源可通过 `graphic_defines[].graphic` 拼出官方 `mobile_assets` 地址。

## 已核实的字段链路

- 英雄本体：`hero_defines[].graphic_id`、`hero_defines[].portrait_graphic_id`
- 皮肤：`hero_skin_defines[].details.base_graphic_id`、`large_graphic_id`、`xl_graphic_id`、`portrait_graphic_id`

样例：

- 布鲁诺：`graphic_id -> Characters/Hero_Bruenor`；`portrait_graphic_id -> Portraits/Portrait_Bruenor`
- 海盗布鲁诺：`base -> Characters/Hero_BruenorPirate`、`large -> Characters/Hero_BruenorPirate_Large`、`xl -> Characters/Hero_BruenorPirate_4xup`、`portrait -> Portraits/Portrait_BruenorPirate`

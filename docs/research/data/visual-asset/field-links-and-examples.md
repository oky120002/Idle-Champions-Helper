# 视觉资源：字段链路与样例

- 目标：回答 definitions 如何稳定定位英雄 / 皮肤视觉资源。

## 核实结论

- definitions 里不只有头像字段，也能稳定定位英雄本体立绘和皮肤立绘。
- 当前 `champion-illustrations.json`（`updatedAt: 2026-07-25`）由 definitions 字段链路生成 `164` 个英雄本体与 `713` 个皮肤展示单元。
- 英雄和皮肤资源均通过对应 graphic id 关联 `graphic_defines`，再定位官方 `mobile_assets` 资源。
- 这些资源可通过 `graphic_defines[].graphic` 拼出官方 `mobile_assets` 地址。

## 已核实的字段链路

- 英雄本体：`hero_defines[].graphic_id`、`hero_defines[].portrait_graphic_id`
- 皮肤：`hero_skin_defines[].details.base_graphic_id`、`large_graphic_id`、`xl_graphic_id`、`portrait_graphic_id`

样例：

- 布鲁诺：`graphic_id -> Characters/Hero_Bruenor`；`portrait_graphic_id -> Portraits/Portrait_Bruenor`
- 海盗布鲁诺：`base -> Characters/Hero_BruenorPirate`、`large -> Characters/Hero_BruenorPirate_Large`、`xl -> Characters/Hero_BruenorPirate_4xup`、`portrait -> Portraits/Portrait_BruenorPirate`

# 宠物目录：字段落点与图像资源

- 日期：2026-04-16
- 目标：确认宠物目录的主表、皮肤表、图像字段和资源类型边界。

## 官方字段落点

宠物相关字段集中在：`familiar_defines`、`familiar_skin_defines`、`premium_item_defines`、`patron_shop_item_defines`、`patron_defines`、`graphic_defines`。

其中：`familiar_defines` 当前共有 `323` 条；`familiar_skin_defines` 当前共有 `14` 条。

## 图像字段

`familiar_defines` 已确认可用字段：`graphic_id`（宠物图标 / 基础图）、`properties.xl_graphic_id`（4x 立绘槽位）。

2026-04-16 当天快照中：有效 `graphic_id` `319` 条；有效 `xl_graphic_id` `319` 条；缺图像槽位 `4` 条（当前 definitions 返回 `0`）。资源路径位于 `graphic_defines[*].graphic`，实际前缀主要是 `Familiars/...`，少量落在 `Escorts/...`。

样本抓取确认：`Familiars/*` / `Escorts/*` 资源都可从官方 `mobile_assets` 获取；这批有图宠物的 `graphic_id` 与 `xl_graphic_id` 在快照里全部都是 `graphic_defines.type = 3`；它们不是“直接可用的一张 PNG”，而是 zlib 容器里的 `SkelAnim` 分件动画数据。

结论：宠物图标与宠物立绘都不能只做 deflate 解包；构建期必须继续做 `SkelAnim` pose 合成，输出站内最终 PNG。

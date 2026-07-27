# 宠物目录：字段落点与图像资源

- 目标：确认宠物目录的主表、皮肤表、图像字段和资源类型边界。

## 官方字段落点

宠物相关字段集中在：`familiar_defines`、`familiar_skin_defines`、`premium_item_defines`、`patron_shop_item_defines`、`patron_defines`、`graphic_defines`。

当前 `pets.json`（`updatedAt: 2026-07-25`）包含 `341` 个宠物；2026-04-16 raw 快照另确认 `familiar_skin_defines` 有 `14` 条。

## 图像字段

`familiar_defines` 已确认可用字段：`graphic_id`（宠物图标 / 基础图）、`properties.xl_graphic_id`（4x 立绘槽位）。

当前 `pets.json` 有 `337` 个本地图标和立绘，另有 `4` 个宠物没有本地图像。资源路径位于 `graphic_defines[*].graphic`，实际前缀主要是 `Familiars/...`，少量落在 `Escorts/...`。

样本抓取确认：`Familiars/*` / `Escorts/*` 资源都可从官方 `mobile_assets` 获取；这批有图宠物的 `graphic_id` 与 `xl_graphic_id` 在快照里全部都是 `graphic_defines.type = 3`；它们不是“直接可用的一张 PNG”，而是 zlib 容器里的 `SkelAnim` 分件动画数据。

结论：宠物图标与宠物立绘都不能只做 deflate 解包；现有构建链路通过 `SkelAnim` pose 合成输出站内最终 PNG。页面数据与构建合同见 `specs/modules/pets/pets-page-design.md`。

# 官方布局：字段落点与归一化

- 日期：2026-04-13
- 目标：确认布局数据在 definitions 的哪里，以及归一化时应注意什么。

## 结论

- 官方 definitions 已包含阵型布局数据，不需要继续手工维护 MVP 示例布局作为主来源。
- 布局字段不在独立 `formation_defines` 集合里，而是挂在：`campaign_defines[].game_changes[].formation` 与 `adventure_defines[].game_changes[].formation`。
- 单个槽位对象当前可见：`x`、`y`、`col`、`row`（部分缺失）、`adj`。

## 本次原始来源

- 英文快照：`tmp/idle-champions-api/definitions-2026-04-13T11-51-00.099Z-inspect-en.json`
- 英文元信息：`tmp/idle-champions-api/definitions-2026-04-13T11-51-00.099Z-inspect-en.meta.json`
- 中文快照：`tmp/idle-champions-api/definitions-2026-04-13T11-56-42.025Z-inspect-zh.json`
- 中文元信息：`tmp/idle-champions-api/definitions-2026-04-13T11-56-42.025Z-inspect-zh.meta.json`

## 字段落点

- `campaign_defines[].game_changes[].formation`：campaign 默认布局
- `adventure_defines[].game_changes[].formation`：普通冒险与变体覆盖布局
- 当前仓库沿用 `variant_adventure_id / base_adventure_id / variant_id / adventure_variant_id` 判断普通冒险与变体

单个槽位样例：`x`、`y`、`col`、`row`、`adj`。

## 归一化注意点

- `col` 是 0 基列号，前端网格需转成 1 基
- `row` 缺失时可回退到 `y` 分层
- `adj` 基于官方原始数组下标，归一化后应改写成稳定 `slotId`

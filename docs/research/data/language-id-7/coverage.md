# `language_id=7`：覆盖情况与验证方法

- 日期：2026-04-13
- 目标：确认 `language_id=7` 是否为官方中文链路，并记录主要字段覆盖情况。

## 结论

- `getDefinitions` 确实接受 `language_id=7`，返回结构与默认英文 definitions 一致，但会把部分字符串字段替换为官方中文。
- 第一版中文映射层可以直接建立在“官方原文快照 + `language_id=7` 中文快照”上，不必先手搓全量名称表。
- 不能假设中文已经全量覆盖；当前仍有英雄名、战役描述和少量新变体字段缺口。

## 验证方法

1. 先通过 play server 发现接口找到当前 play server
2. 在同一台 play server 上分别抓默认英文与 `language_id=7` 的 definitions
3. 以 `id` 对齐，比较 `hero_defines`、`affiliation_defines`、`campaign_defines`、`adventure_defines` 中的字符串字段

## 覆盖情况摘要

### champions

当前前端实际消费的可上阵英雄为 161。`name` 的中文覆盖为 `160 / 161`，`english_name` 为 `0 / 161`，`character_sheet_details.class / race / alignment / backstory` 基本可直接用，`event_name` 只在事件英雄上有值且多数已翻译。当前已确认的可上阵英雄缺口：`id=125` `BBEG`。

### affiliations

`name` 的中文覆盖为 `19 / 19`，可直接作为联动队伍展示名。

### campaigns

`name` 与 `short_name` 的中文覆盖都是 `28 / 28`；`description` 为 `25 / 28`，说明新战役描述仍有缺口，不能只保留中文。当前未翻译描述的战役：`29`、`31`、`32`。

### variants / adventures

`adventure_defines` 总数 `1865`。`name` 覆盖 `1851 / 1865`，`description` 覆盖 `1852 / 1865`，`objectives_text` 覆盖 `1715 / 1865`，`requirements_text` 覆盖 `1655 / 1865`，`restrictions_text` 覆盖 `1859 / 1865`。结论是：可作为主来源，但必须允许英文回退。

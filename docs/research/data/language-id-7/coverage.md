# `language_id=7`：覆盖情况与验证方法

- 目标：确认 `language_id=7` 是否为官方中文链路，并记录主要字段覆盖情况。

## 核实结论

- `getDefinitions` 确实接受 `language_id=7`，返回结构与默认英文 definitions 一致，但会把部分字符串字段替换为官方中文。
- 第一版中文映射层可以直接建立在“官方原文快照 + `language_id=7` 中文快照”上，不必先手搓全量名称表。
- 不能假设中文已经全量覆盖；当前仍有英雄名、战役描述和少量新变体字段缺口。

## 验证方法

1. 先通过 play server 发现接口找到当前 play server
2. 在同一台 play server 上分别抓默认英文与 `language_id=7` 的 definitions
3. 以 `id` 对齐，比较 `hero_defines`、`affiliation_defines`、`campaign_defines`、`adventure_defines` 中的字符串字段

## 覆盖情况摘要

### champions

当前 `champions.json`（`updatedAt: 2026-07-25`）包含 `164` 名可上阵英雄，`name.display` 与英文原名不同的有 `161` 名；`K'thriss`、`BBEG`、`Lazaapz` 当前使用英文回退。2026-04-13 raw 快照还证明 `character_sheet_details.class / race / alignment / backstory` 基本可直接用，`event_name` 只在事件英雄上有值且多数已翻译。

### affiliations

`name` 的中文覆盖为 `19 / 19`，可直接作为联动队伍展示名。

### campaigns

2026-04-13 raw 快照中，`name` 与 `short_name` 的中文覆盖都是 `28 / 28`，`description` 为 `25 / 28`。当前发布产物没有独立 campaign 集合，因此不能从仓库产物重算完整 campaign 字段覆盖；消费层必须继续保留英文回退。

### variants / adventures

2026-04-13 raw 快照的 `adventure_defines` 总数为 `1865`：`name` 覆盖 `1851`，`description` 覆盖 `1852`，`objectives_text` 覆盖 `1715`，`requirements_text` 覆盖 `1655`，`restrictions_text` 覆盖 `1859`。当前 `adventures.json`（`updatedAt: 2026-07-25`）包含 `521` 个普通冒险，名称与描述均有不同于英文原文的 display 值；`variants.json` 包含 `1413` 个变体，其中 `1412` 个名称有不同于英文原文的 display 值。中文可作为主来源，但所有字段仍必须允许英文回退。

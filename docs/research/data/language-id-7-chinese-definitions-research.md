# `language_id=7` 官方中文 definitions 链路核实

- 日期：2026-04-13
- 目标：确认 `language_id=7` 是否为官方中文链路，并判断哪些字段可直接拿中文、哪些字段仍需英文回退
- 本地留档：`tmp/language-check/definitions-en.json`、`tmp/language-check/definitions-zh.json`

## 结论

- `getDefinitions` 确实接受 `language_id=7`，返回结构与默认英文 definitions 一致，但会把部分字符串字段替换为官方中文
- 第一版中文映射层可以直接建立在“官方原文快照 + `language_id=7` 中文快照”上，不必先手搓全量名称表
- 适合优先接入双字段结构的范围：`champions.name`、`affiliations.name`、`campaigns.name`、`variants.name`、当前页面已消费的变体 `restrictions` 文本
- 不能假设中文已经全量覆盖；当前仍有英雄名、战役描述和少量新变体字段缺口
- 因此归一化层必须保留：`original` 为官方原文，`display` 为中文展示名；若中文缺失则回退到 `original`

## 验证方法

1. 先通过 play server 发现接口找到当前 play server
2. 在同一台 play server 上分别抓默认英文与 `language_id=7` 的 definitions
3. 以 `id` 对齐，比较 `hero_defines`、`affiliation_defines`、`campaign_defines`、`adventure_defines` 中的字符串字段

## 覆盖情况摘要

### champions

> 官方 `hero_defines` 总数 173；当前前端实际消费的可上阵英雄为 161

| 字段 | 中文覆盖 | 结论 |
| --- | --- | --- |
| `name` | `160 / 161` | 可作为英雄中文展示名主来源 |
| `english_name` | `0 / 161` | 保持英文，适合作为原文备用 |
| `character_sheet_details.full_name` | `159 / 161` | 大多可用，但不替代 `name` 作为主展示 |
| `character_sheet_details.class` | `161 / 161` | 可直接用 |
| `character_sheet_details.race` | `161 / 161` | 可直接用 |
| `character_sheet_details.alignment` | `161 / 161` | 可直接用 |
| `character_sheet_details.backstory` | `161 / 161` | 可直接用 |
| `event_name` | `137 / 161` | 只在事件英雄上有值，且多数已翻译 |

当前已确认的可上阵英雄缺口：`id=125` `BBEG`

### affiliations

| 字段 | 中文覆盖 | 结论 |
| --- | --- | --- |
| `name` | `19 / 19` | 可直接作为联动队伍展示名 |

### campaigns

| 字段 | 中文覆盖 | 结论 |
| --- | --- | --- |
| `name` | `28 / 28` | 可直接用于中文战役名 |
| `short_name` | `28 / 28` | 可直接用于短标签 |
| `description` | `25 / 28` | 新战役描述仍有缺口，不能只保留中文 |

当前未翻译描述的战役：`29`、`31`、`32`

### variants / adventures

> `adventure_defines` 总数 1865；当前前端会挑出像变体的记录归一化为 `variants.json`

| 字段 | 中文覆盖 | 结论 |
| --- | --- | --- |
| `name` | `1851 / 1865` | 可作为变体中文展示名主来源，但必须允许英文回退 |
| `description` | `1852 / 1865` | 大多数可用 |
| `objectives_text` | `1715 / 1865` | 覆盖高，但不是全量 |
| `requirements_text` | `1655 / 1865` | 缺口明显，仍需原文回退 |
| `restrictions_text` | `1859 / 1865` | 当前最适合优先接入页面 |

## 对数据结构的直接影响

推荐统一输出：

```json
{
  "original": "Bruenor",
  "display": "布鲁诺"
}
```

原因：中文覆盖已足够支撑 MVP 的主要名称字段，但不是 100%；页面搜索、筛选和详情展示都需要同时支持中文展示、英文原文检索和中文缺失时的自动回退。

## 落地建议

1. 抓取流程默认同时保留两份快照：`language_id=1` 与 `language_id=7`
2. 归一化输出优先覆盖 `champions`、`affiliations`、`campaigns`、`variants`
3. 变体页已消费的限制文本也同步改成 `original + display`
4. 仍未翻译的项目先走英文回退，不在这一阶段手工强补

## 后续待办

- 继续核对 `event_name`、`game_changes`、escort 名称等次级字段的页面价值
- 评估 `BBEG`、`Vecna: Eve of Ruin`、`Tales of the Champions` 等缺口是否需要人工覆盖
- 若后续页面展示更多变体说明，再把 `description / objectives_text / requirements_text` 系统化成双字段结构

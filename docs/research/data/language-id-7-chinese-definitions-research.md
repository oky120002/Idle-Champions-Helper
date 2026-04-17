# `language_id=7` 官方中文 definitions 链路核实

- 调研日期：2026-04-13
- 调研目标：
  1. 实锤 `language_id=7` 是否为官方 definitions 中文链路
  2. 确认哪些字段能稳定拿到中文，哪些字段仍需英文回退或人工补充
- 调研对象：
  - `https://master.idlechampions.com/~idledragons/post.php?call=getPlayServerForDefinitions&mobile_client_version=999&network_id=11`
  - `https://ps28.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999`
  - `https://ps28.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=7`
- 本地留档：
  - `tmp/language-check/definitions-en.json`
  - `tmp/language-check/definitions-zh.json`

## 1. 结论先行

- `getDefinitions` 确实接受 `language_id=7`，返回结构与默认英文 definitions 一致，但会把一部分字符串字段替换为官方中文。
- 第一版中文映射层可以直接建立在“官方原文快照 + `language_id=7` 中文快照”之上，不必先手搓全量英雄 / 战役 / 变体名称表。
- 适合优先接入双字段结构的范围：
  - `champions.name`
  - `affiliations.name`
  - `campaigns.name`
  - `variants.name`
  - 以及变体现有页面已经消费的 `restrictions` 文本
- 不能假设 `language_id=7` 已经全量翻完。当前仍存在：
  - 1 名可上阵英雄名未翻译：`BBEG`
  - 3 个战役描述未翻译：`29 / 31 / 32`
  - 少量新变体名 / 描述 / 限制文本仍保留英文
- 因此数据结构必须保留：
  - `original`：官方原文
  - `display`：中文展示名；若官方中文缺失则回退到 `original`

## 2. 验证方法

### 先发现 play server

请求：

```text
https://master.idlechampions.com/~idledragons/post.php?call=getPlayServerForDefinitions&mobile_client_version=999&network_id=11
```

返回中拿到：

```text
play_server = https://ps28.idlechampions.com/~idledragons/
```

### 在同一台 play server 上抓两份 definitions

- 英文基线：

```text
https://ps28.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999
```

- 中文对照：

```text
https://ps28.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=7
```

### 比对方式

- 先确认两份 JSON 顶层 schema 一致
- 再按 `id` 比对以下集合中的字符串字段：
  - `hero_defines`
  - `affiliation_defines`
  - `campaign_defines`
  - `adventure_defines`
- 以“英文值与中文值是否不同”作为“该字段已拿到官方中文”的判定标准

## 3. 字段覆盖结论

### Champions

> 说明：官方原始 `hero_defines` 总数为 173；当前前端实际会消费的可上阵英雄为 161（`seat_id` 介于 1~12）。

| 字段 | 中文覆盖 | 结论 |
| --- | --- | --- |
| `name` | 160 / 161（可上阵英雄） | 可作为英雄中文展示名主来源 |
| `english_name` | 0 / 161 | 保持英文，可直接作为官方原文备用 |
| `character_sheet_details.full_name` | 159 / 161 | 大多可用，但不能替代 `name` 作为主展示 |
| `character_sheet_details.class` | 161 / 161 | 可拿到中文职业 |
| `character_sheet_details.race` | 161 / 161 | 可拿到中文种族 |
| `character_sheet_details.alignment` | 161 / 161 | 可拿到中文阵营 |
| `character_sheet_details.backstory` | 161 / 161 | 可拿到中文背景描述 |
| `event_name` | 137 / 161 | 只在事件英雄上有值，且多数已翻译 |

已确认的可上阵英雄缺口：

- `id=125`，`BBEG`

示例：

```json
{
  "name": "布鲁诺",
  "english_name": "Bruenor",
  "character_sheet_details": {
    "full_name": "布鲁诺·战锤",
    "class": "战士"
  }
}
```

### Affiliations

| 字段 | 中文覆盖 | 结论 |
| --- | --- | --- |
| `name` | 19 / 19 | 可以直接作为中文联动队伍展示名 |

示例：

```json
{
  "affiliation_tag": "companions_of_the_hall",
  "name": "秘银五侠"
}
```

### Campaigns

| 字段 | 中文覆盖 | 结论 |
| --- | --- | --- |
| `name` | 28 / 28 | 可直接用于中文战役名 |
| `short_name` | 28 / 28 | 可直接用于短标签 |
| `description` | 25 / 28 | 新战役描述仍有缺口，不能只保留中文 |

当前 `description` 未翻译的战役：

- `id=29` `Turn of Fortune's Wheel`
- `id=31` `Vecna: Eve of Ruin`
- `id=32` `Tales of the Champions`

### Variants / Adventures

> 说明：`adventure_defines` 总数 1865；当前前端会挑出“像变体”的记录并归一化为 `variants.json`。

| 字段 | 中文覆盖 | 结论 |
| --- | --- | --- |
| `name` | 1851 / 1865 | 可作为变体中文展示名主来源，但必须允许英文回退 |
| `description` | 1852 / 1865 | 大多数可用 |
| `objectives_text` | 1715 / 1865 | 覆盖高，但不是全量 |
| `requirements_text` | 1655 / 1865 | 缺口明显，仍需原文回退 |
| `restrictions_text` | 1859 / 1865 | 当前最适合先接到页面的中文限制文本 |

已观察到未翻译的 `name` 示例：

- `id=1144` `G. O. A. T.`
- `id=1963` `The Mechanical Menace (Laurana)`
- `id=1964` `Arrival of the Golden General`
- `id=1971` `If You Can't Beat Them, Join Them`

示例：

```json
{
  "name": "你是小鸡吗？",
  "requirements_text": "必须已完成“被诅咒的农夫”",
  "restrictions_text": "你的阵型中有四格会被小鸡占据"
}
```

## 4. 对数据结构的直接影响

推荐在归一化层统一输出：

```json
{
  "original": "Bruenor",
  "display": "布鲁诺"
}
```

原因：

- `language_id=7` 已足够覆盖 MVP 需要的主要名称字段
- 但覆盖率并不是 100%，不能把 `display` 当成总有中文的强保证
- 页面搜索、筛选、详情展示都需要同时支持：
  - 中文展示
  - 英文原文检索
  - 官方中文缺失时的自动回退

## 5. 本次落地建议

1. 抓取流程默认同时保留两份快照：
   - `language_id=1` / 官方原文
   - `language_id=7` / 中文展示
2. 归一化输出先覆盖四类核心名称：
   - `champions`
   - `affiliations`
   - `campaigns`
   - `variants`
3. 变体页已有消费的限制文本，也一并改成 `original + display`
4. 仍未翻译的项目继续走英文回退，不在这一阶段手工强补

## 6. 后续待办

- 继续核对 `language_id=7` 对 `event_name`、`game_changes`、escort 名称等次级字段的页面价值，决定是否要继续扩展到更细的规则说明层
- 针对 `BBEG`、`Vecna: Eve of Ruin`、`Tales of the Champions` 等缺口，评估是否需要单独人工覆盖
- 若后续页面要展示更多变体说明，应优先把 `description` / `objectives_text` / `requirements_text` 也系统化成双字段结构

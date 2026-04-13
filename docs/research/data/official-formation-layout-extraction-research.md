# 官方阵型布局提取调研

- 调研日期：2026-04-13
- 最后确认时间：2026-04-13 20:05 CST
- 调研目标：确认《Idle Champions》官方 definitions 是否已经包含阵型布局数据、字段落点在哪里，以及本仓库应如何把这些数据归一化到 `public/data/v1/formations.json`。

---

## 1. 结论先行

- 官方 definitions **已经包含阵型布局数据**，不需要继续手工维护 MVP 示例布局作为主来源。
- 阵型字段不在单独的 `formation_defines` 集合里，而是挂在：
  - `campaign_defines[].game_changes[].formation`
  - `adventure_defines[].game_changes[].formation`
- 单个 `formation` 槽位对象可见字段包括：
  - `x`
  - `y`
  - `col`
  - `row`（部分布局缺失）
  - `adj`
- 以 2026-04-13 抓到的最新快照计算：
  - 有阵型数据的 `campaign` 共 28 个
  - 有阵型数据的普通 `adventure` 共 283 个
  - 有阵型数据的 `variant` 共 554 个
  - 总上下文数共 865 个
  - 经过按布局签名去重后，得到 **157 个唯一阵型布局**
- 因此，本仓库应采用：
  1. 官方 definitions 自动提取阵型布局
  2. 归并重复布局
  3. 为每个唯一布局保留 `sourceContexts / applicableContexts`
  4. 仅把 `scripts/data/manual-overrides.json` 作为必要覆写层，而不是主数据源

---

## 2. 本次核实使用的原始来源

### 2.1 英文快照

- 快照文件：`tmp/idle-champions-api/definitions-2026-04-13T11-51-00.099Z-inspect-en.json`
- 元信息：`tmp/idle-champions-api/definitions-2026-04-13T11-51-00.099Z-inspect-en.meta.json`
- 发现接口：
  - `https://master.idlechampions.com/~idledragons/post.php?call=getPlayServerForDefinitions&mobile_client_version=999&network_id=11`
- definitions 接口：
  - `https://ps27.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=1`

### 2.2 中文快照

- 快照文件：`tmp/idle-champions-api/definitions-2026-04-13T11-56-42.025Z-inspect-zh.json`
- 元信息：`tmp/idle-champions-api/definitions-2026-04-13T11-56-42.025Z-inspect-zh.meta.json`
- definitions 接口：
  - `https://ps27.idlechampions.com/~idledragons/post.php?call=getDefinitions&new_achievements=1&mobile_client_version=99999&language_id=7`

---

## 3. 字段落点确认

### 3.1 campaign 默认布局

`campaign_defines` 中可以直接看到默认阵型：

```text
campaign_defines[].game_changes[].formation
```

示例：`campaign_defines[id=1]`（`A Grand Tour of the Sword Coast / 剑湾之旅`）包含 9 槽布局。

### 3.2 adventure / variant 覆盖布局

`adventure_defines` 中同样可以直接看到布局覆盖：

```text
adventure_defines[].game_changes[].formation
```

普通冒险与变体的区分，当前沿用仓库已有判断：

- `variant_adventure_id`
- `base_adventure_id`
- `variant_id`
- `adventure_variant_id`

只要其中任一字段存在，就按 `variant` 处理。

### 3.3 单个槽位字段

本次抓取中可见的槽位字段如下：

```json
{
  "x": 80,
  "y": 30,
  "col": 0,
  "row": 2,
  "adj": [1, 2]
}
```

补充说明：

- `col` 是 0 基列号，归一化到前端网格时需要转成 1 基。
- `row` 有些布局缺失，此时可以回退到 `y` 做行分层。
- `adj` 是基于官方原始数组下标的邻接关系；归一化后需要改写成稳定的 `slot id`。

---

## 4. 去重结果

### 4.1 去重前

- `campaign`：28
- `adventure`：283
- `variant`：554
- 总上下文：865

### 4.2 去重后

- 唯一布局：157
- 槽位数量分布：
  - 9 槽：1
  - 10 槽：152
  - 11 槽：3
  - 13 槽：1

### 4.3 去重签名建议

同一布局的判定不应依赖原始数组顺序，而应基于归一化后的槽位信息组合签名：

- `column`
- `row`
- `x`
- `y`
- `adjacentSlotIds`

仓库实现里使用了“归一化槽位串 + `sha1` 截断”的稳定布局 ID。

---

## 5. 对仓库实现的影响

### 5.1 `public/data/v1/formations.json`

应从“手工 4 个示例布局”改为：

- 官方自动提取的唯一布局集合
- 每个布局保留：
  - `slots`
  - `applicableContexts`
  - `sourceContexts`
  - `notes`

### 5.2 `scripts/data/manual-overrides.json`

阵型布局不再作为主来源维护；这里只保留：

- 必要的人工覆写
- 中文补充说明
- 未来发现官方缺口时的兜底补丁

### 5.3 阵型页文案

应从“手工 MVP 布局”改为“官方 definitions 自动提取的布局库”。

---

## 6. 当前已知边界

- `language_id=7` 不是所有新冒险或时空门条目都有稳定中文；部分上下文名称仍会回退到英文原文。
- 官方中文个别文本可能存在串位或翻译质量问题；当前仓库策略应是**优先保留官方返回，再为必要缺口补人工覆写**，不要静默改写所有字段。
- 这次接入的是“布局数据自动提取”，**还不是**“按战役 / 冒险 / 变体筛选布局”的完整交互方案；后续页面可以继续利用 `sourceContexts` 做筛选、搜索和定位。

---

## 7. 结论

1. 阵型布局数据已经在官方 definitions 中，可直接自动提取。
2. 当前仓库原先的 4 个手工示例布局应退出主链路。
3. `public/data/v1/formations.json` 现在应承载 157 个唯一官方布局，并保留上下文映射。
4. 人工补充层仍然需要保留，但定位从“主来源”改成“必要覆写层”。

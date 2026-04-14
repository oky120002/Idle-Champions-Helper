# 英雄详情页数据字段调研

- 调研日期：2026-04-13
- 调研目的：确认当前仓库是否已经具备“英雄详情页”所需数据，以及新增页面时应如何组织“所有信息”。
- 当前有效性：有效；基于 2026-04-13 当天抓取的官方 definitions 快照。

---

## 1. 结论

1. 当前 `public/data/v1/champions.json` 只覆盖英雄摘要字段，无法直接支撑“英雄详情页”。
2. 官方 definitions 已经提供英雄详情页所需的大部分信息，包含角色卡、攻击、升级、天赋、皮肤和原始属性字段，不需要额外引入第三方抓取作为长期依赖。
3. 为了兼顾“所有信息”和页面可用性，推荐新增按英雄拆分的静态详情文件：
   - 摘要仍保留在 `public/data/<version>/champions.json`
   - 详情新增到 `public/data/<version>/champion-details/<hero-id>.json`
4. 详情文件应同时提供：
   - 已结构化的重点信息区块，便于正常浏览
   - 原始 source / localized 快照片段，保证“所有信息”可达
5. 用户提供的两个参考页可作为“高信息密度详情页”的方向参考，但当前环境无法稳定以浏览器方式渲染这两个站点；本次结论主要基于官方 definitions 字段核对和用户任务要求形成。

---

## 2. 当前前端公共数据的缺口

当前 `public/data/v1/champions.json` 的单个英雄只有这些字段：

- `id`
- `name`
- `seat`
- `roles`
- `affiliations`
- `tags`
- `portrait`

这足够做列表页和基础筛选，但不够支撑详情页中的：

- 角色卡资料
- 普攻 / 大招描述
- 升级轨道
- 天赋
- 皮肤
- 默认天赋槽解锁
- availability / event / 时间门 / 商店状态
- 各类原始 properties 与曲线字段

---

## 3. 官方 definitions 已核到的可用字段

本次使用仓库脚本抓取了两份快照：

- 原文快照：`tmp/idle-champions-api/definitions-2026-04-13T11-26-56.162Z-detail-source.json`
- 中文快照：`tmp/idle-champions-api/definitions-2026-04-13T11-27-56.784Z-detail-zh.json`

### 3.1 `hero_defines`

可稳定拿到的核心字段包括：

- 基础身份：`id`、`name`、`english_name`、`seat_id`
- 基础数值：`base_cost`、`base_damage`、`base_health`
- 战斗引用：`base_attack_id`、`ultimate_attack_id`
- 角色卡：`character_sheet_details`
  - `full_name`
  - `class`
  - `race`
  - `age`
  - `alignment`
  - `ability_scores`
  - `backstory`
- availability：`available_in_next_event`、`available_in_shop`、`available_in_time_gate`、`is_available`
- 时间字段：`date_available`、`last_rework_date`、`next_event_timestamp`
- 分类与扩展：`tags`、`event_name`、`event_upgrades`、`default_feat_slot_unlocks`
- 系统字段：`adventure_ids`、`cost_curves`、`health_curves`、`properties`
- 资产字段：`graphic_id`、`portrait_graphic_id`

### 3.2 `attack_defines`

通过 `base_attack_id` 和 `ultimate_attack_id` 可以补出：

- `name`
- `description`
- `long_description`
- `cooldown`
- `num_targets`
- `aoe_radius`
- `damage_modifier`
- `damage_types`
- `tags`
- `target`
- `animations`
- `graphic_id`

### 3.3 `upgrade_defines`

按 `hero_id` 可拿到完整升级轨道，当前可见字段包括：

- `id`
- `required_level`
- `required_upgrade_id`
- `name`
- `upgrade_type`
- `effect`
- `static_dps_mult`
- `default_enabled`
- 可选字段：
  - `specialization_name`
  - `specialization_description`
  - `specialization_graphic_id`
  - `tip_text`

补充观察：

- 很多升级没有展示名，它们本质上是数值里程碑；详情页应保留，但不能和命名能力升级混成同一视觉层级。
- `effect` 常见形态是 `effect_def,<id>`，可以进一步关联 `effect_defines`，拿到描述模板与 requirements。

### 3.4 `hero_feat_defines`

按 `hero_id` 可拿到每个英雄的全部天赋：

- `id`
- `order`
- `name`
- `description`
- `rarity`
- `graphic_id`
- `effects`
- `sources`
- `properties`
- `collections_source`

### 3.5 `hero_skin_defines`

按 `hero_id` 可拿到皮肤数据：

- `id`
- `name`
- `cost`
- `details`
- `rarity`
- `properties`
- `collections_source`
- `availabilities`（部分皮肤存在）

---

## 4. 详情页推荐数据合同

推荐在 `public/data/<version>/champion-details/<hero-id>.json` 中输出以下两层内容：

### 4.1 结构化层

用于正常页面展示：

- 英雄摘要
- availability
- 角色卡资料
- 普攻 / 大招
- 事件升级
- 升级轨道
- 天赋
- 皮肤
- 关键系统字段

### 4.2 原始快照层

用于保证“所有信息”：

- `hero`：source / localized 双快照
- `attacks`
- `upgrades`
- `feats`
- `skins`
- 如升级可解析到 `effect_defines`，也建议补解析结果

这样可以避免两种坏结果：

1. 只做漂亮摘要，但细节缺失，达不到“所有信息”
2. 直接把大块 JSON 平铺到页面，严重破坏可读性

---

## 5. 页面信息架构建议

结合当前仓库定位，“英雄详情页”更适合做成“战术档案页”，而不是百科式长列表：

1. 顶部摘要
   - 头像、名字、seat、roles、affiliations、availability
2. 角色卡
   - class / race / alignment / age / ability scores / backstory
3. 战斗信息
   - base stats、普攻、大招
4. 进阶与成长
   - feat slots、event upgrades、upgrade timeline
5. 天赋与皮肤
6. 系统字段与原始快照

其中“原始快照”应放在页面后半段，并通过折叠区块降低默认噪音。

---

## 6. 外部参考页确认结果

用户提供的参考页：

- [Byteglow champion page](https://ic.byteglow.com/champion/7)
- [Kleho hero page](https://idle.kleho.ru/hero/nerds)

本次环境确认结果：

- `curl` 可以获取基础 HTML 响应
- 但使用本地 headless Chrome 截图时，两个站点都出现 `ERR_CONNECTION_CLOSED`
- 因此无法在当前环境里可靠复核其完整可视布局

这意味着本次实现不能声称“完全复刻”上述页面，只能吸收用户给出的方向：高密度、全量信息、按分区浏览。

---

## 7. 关键依据

- 仓库现状：`public/data/v1/champions.json`
- 抓取脚本：`scripts/fetch-idle-champions-definitions.mjs`
- 归一化脚本：`scripts/normalize-idle-champions-definitions.mjs`
- 本次抓取的 source / localized definitions 快照
- 用户提供的两个外部参考链接

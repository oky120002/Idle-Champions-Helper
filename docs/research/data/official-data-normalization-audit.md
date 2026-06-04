# 官方基座数据归一化审计

- 日期：2026-06-04
- 目标：回答当前 `data:official` 流水线是否已经把官方基座数据完整归一化保存，以及是否存在“未涉及就不归一化”的问题。

## 结论

1. 当前官方 definitions 接口返回格式仍与现有脚本匹配，没有出现“接口一变，流水线立刻吃不下”的问题。
2. 但官方基座数据并没有被“完整归一化保存”。
3. 现在实际存在 4 层状态：
   - 已提升为共享归一化集合；
   - 已提升为详情结构化字段；
   - 只作为 `properties` / `raw.*` 明细保存，尚未提升成共享契约；
   - 完全未进入当前产物。
4. 所以“`不涉及，就不归一化`”这个担心是成立的，但要分层说：
   - 对“官方原始明细是否完全丢了”这个问题，不成立。很多英雄相关原始数据已经保存在 `champion-details/<id>.json`。
   - 对“是否所有官方稳定事实都被提升成公共可复用契约”这个问题，成立。当前共享层明显偏薄。

## 本次核对方式

本次没有只看仓库静态代码，而是重新拉了实时官方数据并现场过了一次 normalize：

```bash
node scripts/fetch-idle-champions-definitions.mjs \
  --outDir tmp/idle-champions-audit-live \
  --languageId 1 \
  --fileLabel audit-source

node scripts/fetch-idle-champions-definitions.mjs \
  --outDir tmp/idle-champions-audit-live \
  --languageId 7 \
  --fileLabel audit-zh

node scripts/normalize-idle-champions-definitions.mjs \
  --input tmp/idle-champions-audit-live/definitions-...-audit-source.json \
  --localizedInput tmp/idle-champions-audit-live/definitions-...-audit-zh.json \
  --outputDir tmp/idle-champions-audit-normalized \
  --versionFile tmp/idle-champions-audit-normalized/version.json
```

实时拉取结果：

- source play server：`https://ps30.idlechampions.com/~idledragons/`
- zh play server：`https://ps29.idlechampions.com/~idledragons/`
- 顶层返回包含 `51` 组 `_defines` 表，以及 `current_time`、`checksum`、`apc_stats`、`db_stats` 等元信息。
- 现场 normalize 成功，生成：
  - `champions=163`
  - `championVisuals=163`
  - `championDetails=163`
  - `variants=1393`
  - `formations=159`
  - `enums=3`

这说明当前脚本与官方接口的顶层格式仍然匹配。

另一个独立事实是：仓库当前已提交的 `public/data/version.json` 还是 `2026-06-01`，当前产物计数为：

- `champions=162`
- `championVisuals=162`
- `variants=1389`
- `formations=158`

所以眼下更明显的问题是“仓库快照滞后”与“归一化覆盖面有限”，不是“实时官方接口已经换格式导致脚本失效”。

## 当前已经归一化保存到哪里

### 1. 共享集合层

`data:official` 当前会产出这些公共集合：

- `public/data/v1/champions.json`
- `public/data/v1/champion-details/<id>.json`
- `public/data/v1/champion-visuals.json`
- `public/data/v1/variants.json`
- `public/data/v1/formations.json`
- `public/data/v1/enums.json`
- `public/data/v1/pets.json`
- `public/data/v1/planner-heroes.json`
- `public/data/v1/planner-scenarios.json`
- `public/data/v1/planner-semantic-overrides.json`

### 2. 顶层共享英雄合同目前很薄

`champions.json` 的单个英雄目前只有：

- `id`
- `name`
- `seat`
- `roles`
- `affiliations`
- `tags`
- `portrait`

这足够做基础 roster / seat / role / tag 查询，但对更高阶筛选、规则复用和阵型模拟来说偏薄。

### 3. 英雄详情层保存得更厚

`champion-details/<id>.json` 目前已经结构化保存：

- `summary`
- `availability`
- `characterSheet`
- `attacks`
- `upgrades`
- `feats`
- `skins`
- `loot`
- `legendaryEffects`
- `properties`
- `adventureIds`
- `defaultFeatSlotUnlocks`
- `costCurves`
- `healthCurves`

同时还保留原始快照片段：

- `raw.hero`
- `raw.attacks`
- `raw.upgrades`
- `raw.feats`
- `raw.skins`
- `raw.loot`
- `raw.legendaryEffects`

这意味着很多当前页面或 planner 还没消费到的英雄事实，并没有丢，只是停留在 detail / raw 层，没有继续提升成更稳定、更薄的共享合同。

## 当前官方 definitions 的消费覆盖面

本次基于实时拉取的 definitions 顶层键做了脚本扫描。当前 `data:official` 整体链路里，真正直接引用到的官方表只有 `18` 项（含 `current_time`）：

- `adventure_defines`
- `affiliation_defines`
- `attack_defines`
- `campaign_defines`
- `current_time`
- `effect_defines`
- `familiar_defines`
- `graphic_defines`
- `hero_defines`
- `hero_feat_defines`
- `hero_skin_defines`
- `legendary_effect_defines`
- `loot_defines`
- `monster_defines`
- `patron_defines`
- `patron_shop_item_defines`
- `premium_item_defines`
- `upgrade_defines`

其中可以再分成两类：

- 进入核心归一化集合的主线表：
  `hero_defines`、`attack_defines`、`upgrade_defines`、`effect_defines`、`hero_feat_defines`、`hero_skin_defines`、`loot_defines`、`legendary_effect_defines`、`adventure_defines`、`campaign_defines`、`affiliation_defines`、`monster_defines`
- 主要给资源和宠物链路使用的表：
  `graphic_defines`、`familiar_defines`、`premium_item_defines`、`patron_defines`、`patron_shop_item_defines`

## 还没有被归一化保存的官方基座数据

实时 definitions 顶层共有 `51` 组 `_defines`。按当前脚本扫描，仍有 `34` 组完全没有进入现行 `data:official` 产物链路：

- `ability_defines`
- `achievement_defines`
- `buff_defines`
- `card_sleeve_defines`
- `changelog_defines`
- `chest_type_defines`
- `click_skin_defines`
- `collection_quest_defines`
- `collection_quest_set_defines`
- `corrupted_gem_shop_item_defines`
- `effect_key_defines`
- `external_achievement_defines`
- `familiar_skin_defines`
- `game_rule_defines`
- `language_defines`
- `mastery_shop_item_defines`
- `modron_core_defines`
- `modron_tile_defines`
- `music_album_defines`
- `music_track_defines`
- `news_defines`
- `patron_perk_defines`
- `patron_perk_tier_defines`
- `pigment_effect_defines`
- `shop_category_defines`
- `shop_display_defines`
- `social_link_defines`
- `sound_defines`
- `stat_defines`
- `text_defines`
- `trials_difficulty_defines`
- `trials_role_defines`
- `tutorial_state_defines`
- `twitch_benefit_defines`

这里面有一部分现在确实不该优先做，比如 `music_*`、`sound_defines`、`social_link_defines`。但也有一部分明显属于后续阵型计算、规则建模或高级筛选可能会用到的稳定事实源，例如：

- `game_rule_defines`
- `stat_defines`
- `buff_defines`
- `effect_key_defines`
- `patron_perk_defines`
- `patron_perk_tier_defines`
- `trials_role_defines`
- `trials_difficulty_defines`

所以现在不能说“官方基座数据已经完整收敛到统一归一化层”。

## “未涉及就不归一化”具体体现在哪里

### 1. 共享英雄合同没有提升稳定限制事实

当前文档和代码里已经明确暴露出几类缺口：

- `patronEligibility`
- `modeEligibilityTags`
- `patrons`
- `modes`
- 稳定 `ruleContextId`
- 结构化规则集合

这些不是“完全拿不到”，而是还没有被提升成公共事实层。

### 2. 详情层存在“保存了，但没抽象成共享事实”的情况

例如英雄本体的很多系统字段今天仍停留在：

- `properties`
- `raw.hero`
- `raw.upgrades`

它们能给详情页或后续研究提供依据，但不能直接作为轻量稳定合同复用。

### 3. 动态语义不能硬塞成静态归一化事实

不是所有缺口都该补成静态字段。

例如 `EligibleForPatron(aeon_current_patron_id)` 这种表达式，依赖当前 Patron 上下文；它不只是“官方漏归一化”，而是本身就需要运行时场景输入。这个应该留在 planner 场景模型或规则上下文层，不应该硬编码成英雄静态事实。

## 对自动化阵型模拟的实际影响

如果继续只在“某个表达式缺了就临时补一点”的模式下推进，会有两个问题：

1. 解析器会越来越懂局部表达式，但共享事实层仍然稀薄，导致每次扩展都要回到明细 JSON 或原始语义。
2. 稳态模拟、候选筛选、Patron / 模式限制、场景规则判断，会长期缺少一个统一、薄、稳定的事实输入层。

所以对自动化阵型模拟更有价值的下一步，不是继续盲目扩表达式，而是先把“稳定、可复用、非运行时”的规则事实提升出来。

## 建议的下一步

优先级建议如下：

1. 先定义一层共享规则事实合同，覆盖英雄可参与限制与场景限制，不直接绑定某个页面。
2. 第一批优先提升：
   - `patronEligibility`
   - `modeEligibilityTags`
   - 场景 `ruleContextId`
   - adventure / variant 的结构化限制来源
3. 明确区分两类信息：
   - 静态稳定事实：归一化进共享数据
   - 运行时上下文事实：放进 planner scenario / evaluation context
4. 在这层事实合同补起来前，新的 planner 表达式支持要谨慎评估收益，避免继续把复杂度堆到解析器里。
